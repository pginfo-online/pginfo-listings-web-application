import { z } from "zod";
import { category, objectId, searchFields } from "@/src/domain/search";

export const envelope = <T extends z.ZodType>(data: T) =>
  z.object({ success: z.literal(true), data });
export const ok = z.object({ success: z.literal(true) });
const text = z.string().nullish().catch(undefined);
const flag = z.boolean().nullish().catch(undefined);
const money = z
  .union([
    z.number(),
    z
      .string()
      .regex(/^\d+(?:\.\d+)?$/)
      .transform(Number),
  ])
  .nullish()
  .catch(undefined);
const strings = z.array(z.string()).nullish().catch(undefined);
export const pagination = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean().optional(),
  hasPrev: z.boolean().optional(),
});
export const paginated = <T extends z.ZodType>(item: T) =>
  envelope(z.array(item)).extend({ pagination });

export const photo = z.union([
  z.string().transform((url) => ({
    url,
    thumbnailUrl: undefined,
    isMain: false,
    caption: undefined,
  })),
  z.object({
    url: z.string(),
    thumbnailUrl: text,
    isMain: flag,
    caption: text,
  }),
]);
const photos = z
  .array(
    photo.catch({
      url: "",
      thumbnailUrl: undefined,
      isMain: false,
      caption: undefined,
    }),
  )
  .nullish()
  .catch(undefined);
const room = z.object({
  shareType: text,
  rent: money,
  monthlyRent: money,
  depositAmount: money,
  availableBeds: money,
  bathroomType: text,
  acIncluded: flag,
  amenities: strings,
});
const owner = z
  .object({ _id: objectId.optional(), name: text })
  .nullish()
  .catch(undefined);
export const property = z.object({
  _id: objectId,
  title: text,
  name: text,
  city: text,
  area: text,
  landmark: text,
  description: text,
  category: category.exclude(["all"]).nullish().catch(undefined),
  purpose: z.enum(["rent", "sale"]).nullish().catch(undefined),
  slug: text,
  propertyType: text,
  isVerified: flag,
  isFeatured: flag,
  minRent: money,
  monthlyPricing: money,
  securityDeposit: money,
  distanceKm: money,
  pricing: z
    .object({
      expectedPrice: money,
      securityDeposit: money,
      maintenanceCharges: money,
      bookingAmount: money,
      pricePerSqFt: money,
    })
    .nullish()
    .catch(undefined),
  amenities: strings,
  facilities: strings,
  photos,
  owner,
  pgDetails: z
    .object({
      propertySubtype: text,
      roomConfigs: z.array(room).optional(),
      gender: text,
      foodIncluded: flag,
      ac: flag,
      noticePeriod: money,
      minStay: money,
      isAvailable: flag,
    })
    .nullish()
    .catch(undefined),
  roomConfigs: z.array(room).nullish().catch(undefined),
  gender: text,
  foodIncluded: flag,
  furnishingStatus: text,
  bhk: text,
  commercialSubtype: text,
  carpetAreaSqFt: money,
  residentialDetails: z
    .object({
      bhk: text,
      propertySubtype: text,
      furnishingStatus: text,
      carpetAreaSqFt: money,
    })
    .nullish()
    .catch(undefined),
  commercialDetails: z
    .object({ commercialSubtype: text, carpetAreaSqFt: money })
    .nullish()
    .catch(undefined),
});
export const listings = paginated(property);
export const details = envelope(z.object({ property }));
export const contacts = envelope(
  z.object({
    property: z.object({
      isPublicPreview: z.boolean(),
      address: text,
      contactPhone: text,
      contactWhatsapp: text,
      mapsLink: text,
    }),
  }),
);
export type Property = z.infer<typeof property>;
export type Photo = z.infer<typeof photo>;

const city = z.object({
  _id: objectId,
  name: z.string(),
  slug: text,
  state: text,
  image: photo.nullish().catch(undefined),
});
export const cities = envelope(z.object({ cities: z.array(city), pagination }));
export type City = z.infer<typeof city>;
export const areas = envelope(
  z.object({ areas: z.array(city.extend({ propertyCount: money })) }),
);
export const suggestions = envelope(
  z.object({
    suggestions: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        type: z.enum(["locality", "property"]),
        city: text,
        area: text,
        subtitle: text,
      }),
    ),
  }),
);

export const user = z.object({
  _id: objectId,
  name: text,
  email: text,
  phone: text,
  role: text,
  roles: strings,
});
export const session = envelope(z.object({ user }));
export const otpSent = envelope(z.object({ channels: z.array(z.string()) }));
export const issuedAuth = envelope(
  z.object({
    user: user.optional(),
    token: z.string().min(1).optional(),
    accessToken: z.string().min(1).optional(),
    refreshToken: z.string().min(1).optional(),
    tempToken: z.string().min(1).optional(),
  }),
);
export const authStep = envelope(z.object({ needsName: z.boolean() }));

const cursor = z.object({ before: z.iso.datetime(), id: objectId });
const booking = z.object({
  _id: objectId,
  property: objectId,
  listingTitle: text,
  moveInDate: z.string(),
  status: z.enum(["requested", "accepted", "declined", "withdrawn"]),
  bookingAmountPaise: z.number().int().nonnegative(),
  payment: z.object({ state: text, expiresAt: text, paidAt: text }).nullish(),
  message: text,
});
export const bookingResult = envelope(z.object({ booking }));
export const bookings = envelope(
  z.object({
    bookings: z.array(booking),
    next: cursor.nullable(),
    paymentsEnabled: z.boolean(),
  }),
);
export const checkout = envelope(
  z.object({
    url: z
      .url({ protocol: /^https$/, hostname: /^rzp\.io$/ })
      .refine((value) => {
        const url = new URL(value);
        return !url.username && !url.password && !url.port;
      }),
  }),
);
export const visit = z.object({
  _id: objectId,
  property: z
    .union([objectId, z.object({ _id: objectId, title: text, name: text })])
    .nullish()
    .catch(undefined),
  scheduledDate: z.string(),
  scheduledTime: z.string(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
  ownerNote: text,
});
export const visits = envelope(z.object({ visits: z.array(visit) }));
export const visitResult = envelope(z.object({ visit }));

const savedSearch = z.object({
  _id: objectId,
  label: z.string(),
  filters: searchFields,
});
export const savedSearches = envelope(
  z.object({ searches: z.array(savedSearch) }),
);
export const savedSearchResult = envelope(z.object({ search: savedSearch }));

const meetup = z.object({
  _id: objectId,
  title: z.string(),
  description: text,
  shortDescription: text,
  category: z
    .union([z.string(), z.object({ name: text, displayName: text })])
    .nullish()
    .catch(undefined),
  bannerImage: photo.nullish().catch(undefined),
  images: photos,
  location: z
    .object({ city: text, area: text, name: text, address: text })
    .nullish()
    .catch(undefined),
  locationType: text,
  startDate: text,
  startTime: text,
  endDate: text,
  status: text,
  participation: z
    .object({
      registrationType: text,
      isFree: flag,
      registrationDeadline: text,
    })
    .nullish()
    .catch(undefined),
  registrationDeadline: text,
  externalRegistrationLink: text,
});
export type Meetup = z.infer<typeof meetup>;
export const meetups = paginated(meetup);
export const meetupDetails = envelope(
  z.object({ meetup, myParticipation: z.object({ status: text }).nullish() }),
);
export const meetupAction = ok;

const notification = z.object({
  _id: objectId,
  title: text,
  body: text,
  createdAt: text,
  isRead: flag,
  data: z
    .object({ entityType: text, entityId: objectId.nullish().catch(undefined) })
    .nullish()
    .catch(undefined),
});
export const notifications = envelope(z.array(notification)).extend({
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    pages: z.number().int(),
    unreadCount: z.number().int(),
  }),
});
