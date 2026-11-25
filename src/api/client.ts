import type { z } from "zod";
import { ApiError, responseError } from "./errors";

export async function api<T extends z.ZodType>(
  path: string,
  schema: T,
  options: {
    query?: URLSearchParams;
    signal?: AbortSignal;
    method?: string;
    body?: unknown;
  } = {},
): Promise<z.output<T>> {
  const { query, signal, method = "GET", body } = options;
  const upload = body instanceof FormData;
  let response: Response;
  let json: unknown;
  try {
    response = await fetch(
      `/api/data/${path}${query?.size ? `?${query}` : ""}`,
      {
        method,
        signal,
        headers:
          body === undefined || upload
            ? undefined
            : { "Content-Type": "application/json" },
        body: upload
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
      },
    );
    json = await response.json().catch(() => null);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, "Connection lost. Check your internet connection.");
  }
  if (!response.ok)
    throw responseError(response.status, json, response.headers);
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiError(502);
  return parsed.data;
}
