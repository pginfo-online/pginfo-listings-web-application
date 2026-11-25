import { z } from "zod";

export const errorPayload = z.object({
  message: z.string().optional(),
  errors: z
    .array(
      z.object({ field: z.string().max(100), message: z.string().max(200) }),
    )
    .optional(),
  retryAfter: z.coerce.number().int().positive().optional(),
});

const messages: Record<number, string> = {
  400: "Check the information you entered and try again.",
  401: "Sign in to continue.",
  403: "You don’t have permission to do this.",
  404: "This item is no longer available.",
  409: "This item has changed. Refresh its status before trying again.",
  413: "The file or request is too large.",
  415: "Choose a valid JPEG, PNG or WebP image.",
  422: "Some information needs to be corrected.",
  429: "Too many requests. Wait a moment before trying again.",
  502: "PGinfo received an unexpected response. Please try again.",
  503: "The PGinfo service is temporarily unavailable.",
  504: "The service took too long to respond.",
};

export const originMismatchMessage =
  "Open the app from its site address and try again.";
export const suspendedAccountMessage =
  "Your account has been suspended. Please contact support.";

const safeBusinessMessages = new Set([
  originMismatchMessage,
  suspendedAccountMessage,
  "You cannot request your own listing.",
  "You cannot request a visit to your own listing",
  "A previous request for this date is closed. Choose another date.",
  "That visit was cancelled. Choose another time.",
  "This visit can no longer be cancelled.",
  "This request can no longer change status.",
  "This request has no payable checkout available.",
  "This listing is no longer available for checkout.",
  "This payment link is no longer open.",
  "Remove an existing saved search before adding another.",
  "Invalid or expired session. Please start again.",
  "OTP not found. Please request a new OTP.",
  "OTP has expired. Please request a new OTP.",
  "Too many incorrect attempts. Please request a new OTP.",
  "Choose a valid move-in date today or later in IST.",
]);

const knownFields: Record<string, string> = {
  contact: "Enter a valid mobile number or email address.",
  otp: "Check the four-digit verification code.",
  name: "Enter a name between 2 and 100 characters.",
  scheduledDate: "Choose a future visit date and time in IST.",
  scheduledTime: "Choose a valid time in IST.",
  moveInDate: "Choose today or a later date in IST.",
  message: "Use no more than 500 characters.",
  label: "Enter a label between 1 and 120 characters.",
  filters: "Choose a city before saving this search.",
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message = messages[status] ?? "Something went wrong. Please try again.",
    public readonly requestId?: string,
    public readonly fields: { field: string; message: string }[] = [],
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
  get uncertain() {
    return this.status === 0 || this.status >= 500;
  }
}

export function responseError(status: number, body: unknown, headers: Headers) {
  const parsed = errorPayload.safeParse(body);
  const data = parsed.success ? parsed.data : undefined;
  const requestId =
    headers.get("x-request-id") ?? headers.get("x-correlation-id") ?? undefined;
  const retry = headers.get("retry-after");
  const seconds =
    retry && /^\d+$/.test(retry)
      ? Number(retry)
      : retry
        ? Math.ceil((Date.parse(retry) - Date.now()) / 1000)
        : data?.retryAfter;
  const knownMessage =
    data?.message &&
    (safeBusinessMessages.has(data.message) ||
      /^Invalid OTP\. [0-5] attempts? remaining\.$/.test(data.message));
  const detail = knownMessage ? data?.message : undefined;
  return new ApiError(
    status,
    detail,
    requestId && /^[a-z0-9_.:-]{1,100}$/i.test(requestId)
      ? requestId
      : undefined,
    data?.errors?.flatMap(({ field }) =>
      Object.hasOwn(knownFields, field)
        ? [{ field, message: knownFields[field] }]
        : [],
    ) ?? [],
    seconds && Number.isFinite(seconds) && seconds > 0 ? seconds : undefined,
  );
}

export function describe(error: unknown) {
  if (!(error instanceof ApiError))
    return "Something went wrong. Please try again.";
  return error.retryAfter
    ? `${error.message} Try again in ${error.retryAfter} seconds.`
    : error.message;
}

export function isAccessError(error: unknown) {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}
