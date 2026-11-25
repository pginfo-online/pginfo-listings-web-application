import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { contacts } from "@/src/api/contracts";
import { readListingPhoto } from "@/src/api/upload";
import { siteURL } from "@/src/api/config";
import { requestSiteOrigin } from "@/src/api/request-origin";
import {
  ApiError,
  originMismatchMessage,
  responseError,
} from "@/src/api/errors";
import { resolveRoute } from "@/src/api/routes";
import { upstream } from "@/src/api/server";
import {
  clearSession,
  sessionNames,
  sessionResponse,
} from "@/src/api/session-cookies";
import { objectId } from "@/src/domain/search";

const privateHeaders = { "Cache-Control": "private, no-store" };
async function readJSON(request: Request, bodyLimit = 4096): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json") ||
    !request.body
  )
    throw new ApiError(400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let raw = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > bodyLimit) {
        await reader.cancel();
        throw new ApiError(413, "The request is too large.");
      }
      raw += decoder.decode(value, { stream: true });
    }
    return JSON.parse(raw + decoder.decode());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400);
  } finally {
    reader.releaseLock();
  }
}

async function handle(
  request: NextRequest,
  context: RouteContext<"/api/data/[...path]">,
) {
  const { path } = await context.params;
  const method = request.method;
  const route = resolveRoute(method, path);
  try {
    if (!route) throw new ApiError(404);
    const origin = requestSiteOrigin(
      siteURL(),
      request.headers.get("host"),
      process.env.NODE_ENV === "development",
    );
    const secure = origin?.protocol === "https:";
    if (method !== "GET") {
      if (!origin) {
        console.error(
          JSON.stringify({
            event: "server_configuration_error",
            setting: "SITE_URL",
            reason: "missing_on_non_loopback_host",
          }),
        );
        throw new ApiError(503);
      }
      if (request.headers.get("origin") !== origin.origin)
        throw new ApiError(403, originMismatchMessage);
    }
    const token = route.auth
      ? request.cookies.get(sessionNames.access)?.value
      : undefined;
    if (route.auth === "required" && !token) throw new ApiError(401);
    let body: unknown = route.body
      ? route.body.parse(await readJSON(request, route.bodyLimit))
      : route.uploadPhoto
        ? await readListingPhoto(request)
        : undefined;
    const userId = request.cookies.get(sessionNames.user)?.value;
    const refreshToken = request.cookies.get(sessionNames.refresh)?.value;
    const haveRefresh =
      objectId.safeParse(userId).success && Boolean(refreshToken);
    if (route.session === "complete") {
      const tempToken = request.cookies.get(sessionNames.registration)?.value;
      if (!tempToken)
        throw new ApiError(
          400,
          "Invalid or expired session. Please start again.",
        );
      body = { ...(typeof body === "object" && body), tempToken };
    }
    if (route.session === "verify")
      body = { ...(typeof body === "object" && body), isMobile: false };
    const target = route.upstream ?? path.join("/");
    if (route.session === "logout") {
      const response = NextResponse.json(
        { success: true },
        { headers: privateHeaders },
      );
      clearSession(response, secure);
      if (haveRefresh) {
        try {
          await upstream(target, route.schema, {
            method,
            body: { userId, refreshToken },
          });
        } catch {
          console.warn(
            JSON.stringify({
              event: "refresh_revocation_unconfirmed",
              module: "auth",
            }),
          );
        }
      }
      return response;
    }
    if (route.session === "refresh") {
      if (!haveRefresh) throw new ApiError(401);
      body = { userId, refreshToken };
    }
    const query = route.query?.(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const payload = await upstream(target, route.schema, {
      query,
      method,
      token,
      body,
      signal: request.signal,
    });
    if (route.session) return sessionResponse(payload, secure, userId);
    if (
      path[0] === "contact" &&
      contacts.parse(payload).data.property.isPublicPreview
    )
      throw new ApiError(401);
    return NextResponse.json(payload, { headers: privateHeaders });
  } catch (caught) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const error =
      caught instanceof ApiError
        ? caught
        : caught instanceof ZodError
          ? responseError(
              400,
              {
                errors: caught.issues.map((issue) => ({
                  field: issue.path.join("."),
                  message: "Invalid value",
                })),
              },
              new Headers(),
            )
          : new ApiError(503);
    if (error.status >= 500)
      console.error(
        JSON.stringify({
          event: "bff_upstream_failed",
          module: route ? path[0] : undefined,
          status: error.status,
          requestId: error.requestId,
        }),
      );
    const headers = new Headers(privateHeaders);
    if (error.requestId) headers.set("X-Request-Id", error.requestId);
    if (error.retryAfter) headers.set("Retry-After", String(error.retryAfter));
    return NextResponse.json(
      { success: false, message: error.message, errors: error.fields },
      { status: error.status, headers },
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
