import "server-only";
import { ApiError } from "./errors";
import { imageTypes, uploadMaxBytes } from "@/src/domain/listing-submission";

export async function readListingPhoto(request: Request) {
  const max = uploadMaxBytes + 16 * 1024;
  const contentType = request.headers.get("content-type");
  if (
    !request.body ||
    !contentType?.toLowerCase().startsWith("multipart/form-data;")
  )
    throw new ApiError(400);
  if (Number(request.headers.get("content-length")) > max)
    throw new ApiError(413);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel();
        throw new ApiError(413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks, total), {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    throw new ApiError(400);
  }
  const entries = Array.from(form.entries());
  const file = form.get("images");
  if (entries.length !== 1 || !(file instanceof File) || file.size === 0)
    throw new ApiError(400);
  if (file.size > uploadMaxBytes) throw new ApiError(413);
  if (!imageTypes.some((mime) => mime === file.type)) throw new ApiError(415);
  const head = Buffer.from(await file.slice(0, 12).arrayBuffer());
  const valid =
    file.type === "image/png"
      ? head
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : file.type === "image/webp"
        ? head.toString("ascii", 0, 4) === "RIFF" &&
          head.toString("ascii", 8, 12) === "WEBP"
        : head[0] === 255 && head[1] === 216 && head[2] === 255;
  if (!valid) throw new ApiError(415);
  const payload = new FormData();
  payload.append("images", file);
  return payload;
}
