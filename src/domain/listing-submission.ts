import { z } from "zod";
import {
  bhk,
  commercialSubtype,
  furnishing,
  gender,
  pgSubtype,
  sharing,
} from "./search";

export const imageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;
export const uploadMaxBytes = 8 * 1024 * 1024;
export const listingPhotoLimit = 6;

export const uploadedPhoto = z.object({
  url: z
    .url({ protocol: /^https$/, hostname: /^res\.cloudinary\.com$/ })
    .refine((value) => {
      const url = new URL(value);
      return (
        !url.username &&
        !url.password &&
        !url.port &&
        /\/image\/upload\//.test(url.pathname)
      );
    }),
  publicId: z.string().min(1).max(400),
});

const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const indianPhone = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number.");
const common = z.object({
  title: text(3, 200),
  description: z.string().trim().max(5000).optional(),
  city: text(2, 100),
  area: text(2, 100),
  address: text(5, 500),
  contactPhone: indianPhone,
  purpose: z.enum(["rent", "sale"]),
  pricing: z.object({
    expectedPrice: z.number().positive(),
    securityDeposit: z.number().nonnegative().optional(),
  }),
  amenities: z.array(text(1, 60)).max(20).optional(),
  photos: z
    .array(
      uploadedPhoto.extend({
        isMain: z.boolean(),
        order: z.number().int().min(0).max(20),
      }),
    )
    .max(listingPhotoLimit)
    .optional(),
});
const squareFeet = z.number().min(10);
const roomCount = z.number().int().min(1);

export const listingBody = common.and(
  z.discriminatedUnion("category", [
    z.object({
      category: z.literal("pg"),
      purpose: z.literal("rent"),
      pgDetails: z.object({
        propertySubtype: pgSubtype,
        gender,
        foodIncluded: z.boolean(),
        roomConfigs: z
          .array(
            z.object({
              shareType: sharing,
              monthlyRent: z.number().positive(),
            }),
          )
          .min(1)
          .max(8),
      }),
    }),
    z.object({
      category: z.literal("residential_rental"),
      residentialDetails: z.object({
        bhk,
        furnishingStatus: furnishing,
        bedrooms: roomCount,
        bathrooms: roomCount,
        carpetAreaSqFt: squareFeet,
      }),
    }),
    z.object({
      category: z.literal("commercial"),
      commercialDetails: z.object({
        commercialSubtype,
        carpetAreaSqFt: squareFeet,
        fitoutStatus: z.enum([
          "bare_shell",
          "warm_shell",
          "fully_furnished_plug_and_play",
        ]),
      }),
    }),
  ]),
);

export const formSchema = z
  .object({
    title: text(3, 200),
    category: z.enum(["pg", "residential_rental", "commercial"]),
    purpose: common.shape.purpose,
    description: z.string().trim().max(5000),
    city: text(2, 100),
    area: text(2, 100),
    address: text(5, 500),
    contactPhone: indianPhone,
    price: z.number({ error: "Enter a valid price." }).positive(),
    deposit: z
      .string()
      .trim()
      .regex(/^\d*(?:\.\d{1,2})?$/, "Enter a valid deposit."),
    amenities: z.string().trim().max(500),
    propertySubtype: pgSubtype,
    gender,
    foodIncluded: z.boolean(),
    shareType: sharing,
    bhk,
    furnishingStatus: furnishing,
    bedrooms: z.string(),
    bathrooms: z.string(),
    carpetAreaSqFt: z.string(),
    commercialSubtype,
    fitoutStatus: z.enum([
      "bare_shell",
      "warm_shell",
      "fully_furnished_plug_and_play",
    ]),
  })
  .superRefine((values, ctx) => {
    if (values.category === "residential_rental") {
      for (const field of ["bedrooms", "bathrooms"] as const) {
        if (!roomCount.safeParse(Number(values[field])).success)
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: "Enter a count of at least 1.",
          });
      }
    }
    if (
      values.category !== "pg" &&
      (!values.carpetAreaSqFt ||
        !Number.isFinite(Number(values.carpetAreaSqFt)) ||
        Number(values.carpetAreaSqFt) < 10)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["carpetAreaSqFt"],
        message: "Enter a carpet area of at least 10 sq ft.",
      });
    }
  });
export type ListingValues = z.infer<typeof formSchema>;

export function listingInput(
  values: ListingValues,
  photos: z.infer<typeof uploadedPhoto>[],
) {
  const {
    title,
    description,
    city,
    area,
    address,
    contactPhone,
    category,
    purpose,
    price,
    deposit,
    amenities,
  } = values;
  const shared = {
    title,
    description: description || undefined,
    city,
    area,
    address,
    contactPhone,
    pricing: {
      expectedPrice: price,
      securityDeposit:
        deposit && (category === "pg" || purpose === "rent")
          ? Number(deposit)
          : undefined,
    },
    amenities: amenities
      .split(",")
      .map((item) => item.trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 20),
    photos: photos.map((photo, order) => ({
      ...photo,
      isMain: order === 0,
      order,
    })),
  };
  if (category === "pg")
    return {
      ...shared,
      category,
      purpose: "rent",
      pgDetails: {
        propertySubtype: values.propertySubtype,
        gender: values.gender,
        foodIncluded: values.foodIncluded,
        roomConfigs: [{ shareType: values.shareType, monthlyRent: price }],
      },
    };
  const carpetAreaSqFt = Number(values.carpetAreaSqFt);
  if (category === "commercial")
    return {
      ...shared,
      category,
      purpose,
      commercialDetails: {
        commercialSubtype: values.commercialSubtype,
        carpetAreaSqFt,
        fitoutStatus: values.fitoutStatus,
      },
    };
  return {
    ...shared,
    category,
    purpose,
    residentialDetails: {
      bhk: values.bhk,
      furnishingStatus: values.furnishingStatus,
      bedrooms: Number(values.bedrooms),
      bathrooms: Number(values.bathrooms),
      carpetAreaSqFt,
    },
  };
}
