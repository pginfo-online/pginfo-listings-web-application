import { z } from "zod";

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
export const category = z.enum([
  "all",
  "pg",
  "residential_rental",
  "commercial",
]);
export const pgSubtype = z.enum([
  "PG",
  "Hostel",
  "Co-living",
  "Student Accommodation",
  "Working Men PG",
  "Working Women PG",
]);
export const sharing = z.enum([
  "single",
  "double",
  "triple",
  "four",
  "dormitory",
  "studio",
  "other",
]);
export const gender = z.enum(["male", "female", "any"]);
export const furnishing = z.enum([
  "unfurnished",
  "semi_furnished",
  "fully_furnished",
]);
export const bhk = z.enum([
  "1RK",
  "1BHK",
  "2BHK",
  "2.5BHK",
  "3BHK",
  "3.5BHK",
  "4BHK",
  "5BHK+",
]);
export const commercialSubtype = z.enum([
  "office_space",
  "retail_shop",
  "showroom",
  "warehouse_godown",
  "co_working",
  "industrial_shed_factory",
  "commercial_plot_land",
  "commercial_building_floor",
]);
const nonempty = z.string().trim().min(1);
const amount = z
  .union([z.number(), z.string().trim().min(1).pipe(z.coerce.number())])
  .pipe(z.number().nonnegative());
const posInt = z
  .union([z.number(), z.string().regex(/^\d+$/).pipe(z.coerce.number())])
  .pipe(z.number().int().min(1));
const flag = z.enum(["true", "false"]);
const coordinate = (min: number, max: number) =>
  z
    .union([z.number(), z.string().trim().min(1).pipe(z.coerce.number())])
    .pipe(z.number().min(min).max(max));
export const searchFields = z.object({
  category: category.optional().catch(undefined),
  purpose: z.enum(["rent", "sale", "all"]).optional().catch(undefined),
  city: nonempty.max(100).optional().catch(undefined),
  cityId: objectId.optional().catch(undefined),
  area: nonempty.max(150).optional().catch(undefined),
  areaId: objectId.optional().catch(undefined),
  areas: nonempty.max(1000).optional().catch(undefined),
  areaIds: z
    .string()
    .regex(/^[a-f0-9]{24}(?:,[a-f0-9]{24}){0,9}$/i)
    .optional()
    .catch(undefined),
  q: nonempty.max(150).optional().catch(undefined),
  sort: z
    .enum([
      "newest",
      "popular",
      "price_asc",
      "price_desc",
      "rent_asc",
      "rent_desc",
      "distance",
    ])
    .optional()
    .catch(undefined),
  minPrice: amount.optional().catch(undefined),
  maxPrice: amount.optional().catch(undefined),
  minRent: amount.optional().catch(undefined),
  maxRent: amount.optional().catch(undefined),
  pgSubtype: pgSubtype.optional().catch(undefined),
  sharingType: sharing.optional().catch(undefined),
  gender: gender.optional().catch(undefined),
  food: z
    .enum(["veg", "nonveg", "both", "none", "any"])
    .optional()
    .catch(undefined),
  foodIncluded: flag.optional().catch(undefined),
  ac: flag.optional().catch(undefined),
  bhk: z
    .string()
    .refine((value) =>
      value.split(",").every((item) => bhk.safeParse(item).success),
    )
    .optional()
    .catch(undefined),
  furnishingStatus: furnishing.optional().catch(undefined),
  commercialSubtype: z
    .string()
    .refine((value) =>
      value
        .split(",")
        .every((item) => commercialSubtype.safeParse(item).success),
    )
    .optional()
    .catch(undefined),
  isVerified: flag.optional().catch(undefined),
  isFeatured: flag.optional().catch(undefined),
  lat: coordinate(-90, 90).optional().catch(undefined),
  lng: coordinate(-180, 180).optional().catch(undefined),
  radius: z.coerce.number().min(1).max(50).optional().catch(undefined),
  page: posInt.optional().catch(undefined),
  limit: posInt
    .refine((value) => value <= 50)
    .optional()
    .catch(undefined),
});

export type Filters = z.output<typeof searchFields>;
export type Category = z.infer<typeof category>;
export type SearchInput = Record<string, string | string[] | undefined>;

export function searchFilters(input: unknown): Filters {
  const filters = searchFields.parse(input);
  if (filters.lat === undefined || filters.lng === undefined) {
    delete filters.lat;
    delete filters.lng;
    delete filters.radius;
    if (filters.sort === "distance") delete filters.sort;
  }
  if (
    filters.minPrice !== undefined &&
    filters.maxPrice !== undefined &&
    filters.minPrice > filters.maxPrice
  ) {
    delete filters.minPrice;
    delete filters.maxPrice;
  }
  return filters;
}

export function params(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return query;
}

export function searchHref(filters: Filters = {}) {
  const query = params(filters).toString();
  return query ? `/explore?${query}` : "/explore";
}

export function discover(filters: Filters = {}) {
  return {
    ...filters,
    purpose: filters.purpose ?? "rent",
    limit: 12,
    page: filters.page ?? 1,
  };
}
