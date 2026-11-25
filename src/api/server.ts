import "server-only";
import type { z } from "zod";
import { unstable_cache } from "next/cache";
import { ApiError, responseError } from "./errors";
import { backendURL } from "./config";

type Options = {
  query?: URLSearchParams;
  signal?: AbortSignal;
  token?: string;
  method?: string;
  body?: unknown;
  revalidate?: number;
};

export async function upstream<T extends z.ZodType>(
  path: string,
  schema: T,
  options: Options = {},
): Promise<z.output<T>> {
  const base = backendURL();
  const { revalidate, ...request } = options;
  if (
    revalidate &&
    !request.token &&
    !request.signal &&
    !request.body &&
    (!request.method || request.method === "GET")
  ) {
    // Cache only the validated public projection, never the incoming upstream payload.
    const read = unstable_cache(
      async (configuredBase: string) =>
        fetchValidated(configuredBase, path, schema, request),
      [
        "pginfo-public-projection",
        path,
        request.query?.toString() ?? "",
        String(revalidate),
      ],
      { revalidate },
    );
    return read(base);
  }
  return fetchValidated(base, path, schema, request);
}

async function fetchValidated<T extends z.ZodType>(
  base: string,
  path: string,
  schema: T,
  options: Omit<Options, "revalidate">,
): Promise<z.output<T>> {
  const { query, signal, token, method = "GET", body } = options;
  const upload = body instanceof FormData;
  const timeout = AbortSignal.timeout(
    upload || (method === "POST" && path === "properties") ? 35_000 : 8_000,
  );
  const url = `${base}/${path}${query?.size ? `?${query}` : ""}`;
  let response: Response;
  let payload: unknown;
  try {
    response = await fetch(url, {
      method,
      redirect: "error",
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...(!upload && body !== undefined
          ? { "content-type": "application/json" }
          : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: upload
        ? body
        : body === undefined
          ? undefined
          : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    try {
      payload = await response.json();
    } catch {
      if (timeout.aborted || signal?.aborted)
        throw new Error("Request aborted");
    }
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new ApiError(timeout.aborted ? 504 : 503);
  }
  if (!response.ok)
    throw responseError(response.status, payload, response.headers);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const reference = responseError(502, null, response.headers).requestId;
    // Route labels may contain resource identifiers. Only log the module name.
    console.error(
      JSON.stringify({
        event: "upstream_contract_mismatch",
        module: path.split("/")[0],
        requestId: reference,
      }),
    );
    throw new ApiError(502, undefined, reference);
  }
  return parsed.data;
}
