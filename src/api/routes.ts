import { z } from "zod";
import { listingBody } from "@/src/domain/listing-submission";
import {
  ownerListings,
  submittedListing,
  uploadedListingPhotos,
} from "./owner-contracts";
import * as contract from "./contracts";
import { objectId, params, searchFilters } from "@/src/domain/search";

const text = (max: number) => z.string().trim().min(1).max(max);
const note = z.string().trim().max(500).optional();
const page = z.coerce.number().int().min(1).optional().catch(undefined);
const limit = z.coerce
  .number()
  .int()
  .min(1)
  .max(50)
  .optional()
  .catch(undefined);
const cityQuery = z.object({ q: text(100).optional(), page, limit });
const areaQuery = z.object({
  city: text(100).optional(),
  cityId: objectId.optional(),
  q: text(150).optional(),
  limit,
});
const suggestionQuery = z.object({
  q: text(150),
  city: text(100).optional(),
  cityId: objectId.optional(),
  category: z.enum(["pg", "residential_rental", "commercial"]).optional(),
});
const listMeetups = z.object({
  page,
  limit,
  dateFrom: z.iso.datetime().optional(),
});
const cursorQuery = z
  .object({ before: z.iso.datetime().optional(), id: objectId.optional() })
  .refine(({ before, id }) => Boolean(before) === Boolean(id));
const indianPhone = z.string().regex(/^[6-9]\d{9}$/);
const contact = z.union([indianPhone, z.email().max(254)]);
const sendOtp = z
  .object({
    contact,
    type: z.enum(["email", "phone"]),
    sendWhatsApp: z.boolean().optional(),
  })
  .refine((value) =>
    value.type === "phone"
      ? indianPhone.safeParse(value.contact).success
      : z.email().safeParse(value.contact).success,
  );
const verifyOtp = z.object({ contact, otp: z.string().regex(/^\d{4}$/) });
const complete = z.object({ name: text(100).min(2) });
const booking = z.object({
  propertyId: objectId,
  moveInDate: z.iso.date(),
  message: note,
});
const visit = z.object({
  propertyId: objectId,
  scheduledDate: z.iso.date(),
  scheduledTime: z.string().regex(/^(1[0-2]|[1-9]):[0-5]\d (AM|PM)$/),
  message: note,
});
const save = z.object({
  label: text(120),
  filters: z
    .unknown()
    .transform(searchFilters)
    .refine(
      (filter) =>
        Boolean(filter.city || filter.cityId) && filter.lat === undefined,
    ),
});

export type ApiRoute = {
  schema: z.ZodType;
  upstream?: string;
  auth?: "required" | "optional";
  query?: (input: Record<string, string>) => URLSearchParams;
  body?: z.ZodType;
  bodyLimit?: number;
  uploadPhoto?: boolean;
  session?: "verify" | "complete" | "logout" | "refresh";
};

const query =
  <T extends Record<string, string | number | undefined>>(
    schema: z.ZodType<T>,
  ) =>
  (input: Record<string, string>) =>
    params(schema.parse(input));

const routes: Record<string, ApiRoute> = {
  "GET cities": { schema: contract.cities, query: query(cityQuery) },
  "GET areas": { schema: contract.areas, query: query(areaQuery) },
  "GET properties": {
    schema: contract.listings,
    query: (input) => {
      const filters = searchFilters(input);
      return params({ ...filters, limit: filters.limit ?? 12 });
    },
  },
  "POST properties": {
    schema: submittedListing,
    auth: "required",
    body: listingBody,
    bodyLimit: 32_768,
  },
  "GET properties/my": {
    schema: ownerListings,
    auth: "required",
    query: query(z.object({ page, limit })),
  },
  "POST upload/images": {
    schema: uploadedListingPhotos,
    auth: "required",
    uploadPhoto: true,
  },
  "GET properties/suggestions": {
    schema: contract.suggestions,
    query: query(suggestionQuery),
  },
  "GET meetups": { schema: contract.meetups, query: query(listMeetups) },
  "GET auth/me": { schema: contract.session, auth: "required" },
  "POST auth/otp/send-unified": { schema: contract.otpSent, body: sendOtp },
  "POST auth/otp/verify-unified": {
    schema: contract.issuedAuth,
    body: verifyOtp,
    session: "verify",
  },
  "POST auth/register-complete": {
    schema: contract.issuedAuth,
    body: complete,
    session: "complete",
  },
  "POST auth/logout": { schema: contract.ok, session: "logout" },
  "POST auth/refresh-token": {
    schema: contract.issuedAuth,
    session: "refresh",
  },
  "GET notifications": {
    schema: contract.notifications,
    query: query(z.object({ page, limit })),
    auth: "required",
  },
  "PUT notifications/read-all": { schema: contract.ok, auth: "required" },
  "GET saved-searches": { schema: contract.savedSearches, auth: "required" },
  "POST saved-searches": {
    schema: contract.savedSearchResult,
    auth: "required",
    body: save,
  },
  "POST rental-bookings": {
    schema: contract.bookingResult,
    auth: "required",
    body: booking,
  },
  "GET rental-bookings/mine": {
    schema: contract.bookings,
    query: query(cursorQuery),
    auth: "required",
  },
  "GET rental-bookings/incoming": {
    schema: contract.bookings,
    query: query(cursorQuery),
    auth: "required",
  },
  "POST visit": { schema: contract.visitResult, auth: "required", body: visit },
  "GET visit/my": { schema: contract.visits, auth: "required" },
};

export function resolveRoute(
  method: string,
  path: string[],
): ApiRoute | undefined {
  const key = `${method} ${path.join("/")}`;
  if (Object.hasOwn(routes, key)) return routes[key];
  const [resource, scope, id, action] = path;
  if (path.length === 2 && objectId.safeParse(scope).success) {
    if (method === "GET" && resource === "properties")
      return { schema: contract.details };
    if (method === "GET" && resource === "contact")
      return {
        schema: contract.contacts,
        upstream: `properties/${scope}`,
        auth: "required",
      };
    if (method === "GET" && resource === "meetups")
      return { schema: contract.meetupDetails, auth: "optional" };
    if (method === "DELETE" && resource === "saved-searches")
      return { schema: contract.ok, auth: "required" };
  }
  if (
    method === "PUT" &&
    path.length === 3 &&
    resource === "notifications" &&
    id === "read" &&
    objectId.safeParse(scope).success
  ) {
    return { schema: contract.ok, auth: "required" };
  }
  if (
    path.length === 3 &&
    resource === "meetups" &&
    objectId.safeParse(scope).success
  ) {
    if (
      (method === "POST" && id === "join") ||
      (method === "DELETE" && id === "join")
    ) {
      return { schema: contract.meetupAction, auth: "required" };
    }
  }
  if (!objectId.safeParse(id).success) return undefined;
  if (resource === "rental-bookings" && scope === "mine") {
    if (path.length === 3 && method === "PATCH")
      return {
        schema: contract.bookingResult,
        auth: "required",
        body: z.object({ status: z.literal("withdrawn") }),
      };
    if (path.length === 4 && action === "checkout" && method === "POST")
      return { schema: contract.checkout, auth: "required" };
  }
  if (
    resource === "rental-bookings" &&
    scope === "incoming" &&
    path.length === 3 &&
    method === "PATCH"
  ) {
    return {
      schema: contract.bookingResult,
      auth: "required",
      body: z.object({ status: z.enum(["accepted", "declined"]) }),
    };
  }
  if (
    resource === "visit" &&
    scope === "my" &&
    path.length === 4 &&
    action === "cancel" &&
    method === "PUT"
  ) {
    return { schema: contract.visitResult, auth: "required" };
  }
}
