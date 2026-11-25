import "server-only";
import { NextResponse } from "next/server";
import { issuedAuth } from "./contracts";
import { ApiError } from "./errors";

export const sessionNames = {
  access: "pginfo_access",
  refresh: "pginfo_refresh",
  user: "pginfo_user",
  registration: "pginfo_registration",
};
const oneDay = 86400;
const props = (secure: boolean) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure,
  path: "/api/data",
});

export function clearSession(response: NextResponse, secure: boolean) {
  for (const name of Object.values(sessionNames))
    response.cookies.set(name, "", { ...props(secure), maxAge: 0 });
}

export function sessionResponse(
  payload: unknown,
  secure: boolean,
  existingUser?: string,
) {
  const { data } = issuedAuth.parse(payload);
  const response = NextResponse.json(
    { success: true, data: { needsName: Boolean(data.tempToken) } },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  if (data.tempToken) {
    clearSession(response, secure);
    response.cookies.set(sessionNames.registration, data.tempToken, {
      ...props(secure),
      maxAge: 600,
    });
    return response;
  }
  const token = data.accessToken ?? data.token;
  const userId = data.user?._id ?? existingUser;
  if (!token || !userId) throw new ApiError(502);
  clearSession(response, secure);
  // Expiration and authorization are enforced by the backend JWT middleware.
  response.cookies.set(sessionNames.access, token, {
    ...props(secure),
    maxAge: 7 * oneDay,
  });
  if (data.refreshToken) {
    response.cookies.set(sessionNames.refresh, data.refreshToken, {
      ...props(secure),
      maxAge: 30 * oneDay,
    });
    response.cookies.set(sessionNames.user, userId, {
      ...props(secure),
      maxAge: 30 * oneDay,
    });
  }
  return response;
}
