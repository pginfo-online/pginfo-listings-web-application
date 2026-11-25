"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api/client";
import { areas } from "@/src/api/contracts";
import { categoryOptions, Failure } from "@/src/components/ui";
import { useCopy } from "@/src/components/preferences";
import {
  bhk,
  category,
  commercialSubtype,
  furnishing,
  gender,
  params,
  pgSubtype,
  searchFilters,
  searchHref,
  sharing,
  type Filters,
} from "@/src/domain/search";
import { label } from "@/src/domain/display";
import { useDebounced } from "./use-debounced";

const optionalNumber = z
  .string()
  .refine(
    (s) => !s || (/^\d+(\.\d{1,2})?$/.test(s) && Number.isFinite(Number(s))),
    "Enter a valid amount.",
  );
const schema = z
  .object({
    category,
    purpose: z.enum(["all", "rent", "sale"]),
    minPrice: optionalNumber,
    maxPrice: optionalNumber,
    area: z.string().max(150),
    pgSubtype: z.string(),
    sharingType: z.string(),
    gender: z.string(),
    furnishingStatus: z.string(),
    bhk: z.string(),
    commercialSubtype: z.string(),
    foodIncluded: z.boolean(),
    isVerified: z.boolean(),
  })
  .refine(
    ({ minPrice, maxPrice }) =>
      !minPrice || !maxPrice || Number(minPrice) <= Number(maxPrice),
    { path: ["maxPrice"], message: "Maximum cannot be below minimum." },
  );
type Values = z.infer<typeof schema>;

export function FiltersForm({ filters }: { filters: Filters }) {
  const t = useCopy();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: filters.category ?? "all",
      purpose: filters.purpose ?? "rent",
      minPrice: String(filters.minPrice ?? filters.minRent ?? ""),
      maxPrice: String(filters.maxPrice ?? filters.maxRent ?? ""),
      area: filters.area ?? "",
      pgSubtype: filters.pgSubtype ?? "",
      sharingType: filters.sharingType ?? "",
      gender: filters.gender ?? "",
      furnishingStatus: filters.furnishingStatus ?? "",
      bhk: filters.bhk ?? "",
      commercialSubtype: filters.commercialSubtype ?? "",
      foodIncluded: filters.foodIncluded === "true",
      isVerified: filters.isVerified === "true",
    },
  });
  const chosen = useWatch({ control, name: "category" });
  const areaTerm = useDebounced(useWatch({ control, name: "area" }).trim());
  const areasQuery = useQuery({
    queryKey: ["areas", filters.city, filters.cityId, areaTerm],
    enabled:
      Boolean(filters.city || filters.cityId) &&
      (areaTerm.length === 0 || areaTerm.length >= 2),
    queryFn: ({ signal }) =>
      api("areas", areas, {
        signal,
        query: params({
          city: filters.city,
          cityId: filters.cityId,
          q: areaTerm,
          limit: 12,
        }),
      }),
  });
  function apply(values: Values) {
    const {
      pgSubtype,
      sharingType,
      gender,
      foodIncluded,
      furnishingStatus,
      bhk,
      commercialSubtype,
      ...shared
    } = values;
    const scoped = {
      ...(chosen === "pg"
        ? {
            pgSubtype,
            sharingType,
            gender,
            foodIncluded: foodIncluded ? "true" : undefined,
          }
        : {}),
      ...(chosen === "residential_rental" ? { bhk, furnishingStatus } : {}),
      ...(chosen === "commercial" ? { commercialSubtype } : {}),
    };
    router.push(
      searchHref(
        searchFilters({
          city: filters.city,
          cityId: filters.cityId,
          q: filters.q,
          sort: filters.sort,
          lat: filters.lat,
          lng: filters.lng,
          radius: filters.radius,
          ...shared,
          ...scoped,
          category: chosen === "all" ? undefined : chosen,
          purpose: shared.purpose === "rent" ? undefined : shared.purpose,
          isVerified: shared.isVerified ? "true" : undefined,
        }),
      ),
    );
    setOpen(false);
  }
  return (
    <aside
      className={open ? "filter-panel filter-open" : "filter-panel"}
      aria-label={t("Filters", "फ़िल्टर")}
    >
      <button
        type="button"
        className="filter-mobile button button-outline"
        aria-expanded={open}
        aria-controls="property-filters"
        onClick={() => setOpen(!open)}
      >
        {open
          ? t("Hide filters", "फ़िल्टर छिपाएँ")
          : t("Show filters", "फ़िल्टर देखें")}
      </button>
      <form
        id="property-filters"
        className="filter-form"
        onSubmit={handleSubmit(apply)}
      >
        <div className="filter-heading">
          <h2>{t("Filters", "फ़िल्टर")}</h2>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setOpen(false);
              router.push(
                searchHref({
                  city: filters.city,
                  cityId: filters.cityId,
                  q: filters.q,
                }),
              );
            }}
          >
            {t("Reset", "रीसेट")}
          </button>
        </div>
        <label className="field">
          {t("Property type", "संपत्ति का प्रकार")}
          <select {...register("category")}>
            {categoryOptions.map(({ value, name, hi }) => (
              <option value={value} key={value}>
                {t(name, hi)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t("Purpose", "उद्देश्य")}
          <select {...register("purpose")}>
            <option value="rent">{t("Rent", "किराये पर")}</option>
            <option value="sale">{t("Sale", "बिक्री")}</option>
            <option value="all">{t("Any", "कोई भी")}</option>
          </select>
        </label>
        {(filters.city || filters.cityId) && (
          <label className="field">
            {t("Locality", "इलाका")}
            <input
              {...register("area")}
              list="locality-options"
              placeholder={t("Any locality", "कोई भी इलाका")}
            />
            <datalist id="locality-options">
              {areasQuery.data?.data.areas.map((area) => (
                <option key={area._id} value={area.name} />
              ))}
            </datalist>
          </label>
        )}
        {areasQuery.error && (
          <Failure
            error={areasQuery.error}
            retry={() => void areasQuery.refetch()}
          />
        )}
        <fieldset className="budget">
          <legend>{t("Price range (₹)", "मूल्य सीमा (₹)")}</legend>
          <div>
            <label className="field">
              <span className="sr-only">{t("Minimum price", "न्यूनतम मूल्य")}</span>
              <input
                {...register("minPrice")}
                inputMode="decimal"
                placeholder={t("Min", "न्यूनतम")}
                aria-invalid={Boolean(errors.minPrice)}
                aria-describedby={errors.minPrice ? "min-error" : undefined}
              />
            </label>
            <label className="field">
              <span className="sr-only">
                {t("Maximum price", "अधिकतम मूल्य")}
              </span>
              <input
                {...register("maxPrice")}
                inputMode="decimal"
                placeholder={t("Max", "अधिकतम")}
                aria-invalid={Boolean(errors.maxPrice)}
                aria-describedby={errors.maxPrice ? "max-error" : undefined}
              />
            </label>
          </div>
          {errors.minPrice && (
            <p className="field-error" id="min-error">
              {errors.minPrice.message}
            </p>
          )}
          {errors.maxPrice && (
            <p className="field-error" id="max-error">
              {errors.maxPrice.message}
            </p>
          )}
        </fieldset>
        {chosen === "pg" && (
          <>
            <label className="field">
              {t("Stay type", "आवास का प्रकार")}
              <select {...register("pgSubtype")}>
                <option value="">{t("Any", "कोई भी")}</option>
                {pgSubtype.options.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="field">
              {t("Sharing type", "साझा आवास का प्रकार")}
              <select {...register("sharingType")}>
                <option value="">{t("Any", "कोई भी")}</option>
                {sharing.options.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              {t("Occupancy", "आवास पात्रता")}
              <select {...register("gender")}>
                <option value="">{t("Any", "कोई भी")}</option>
                {gender.options
                  .filter((value) => value !== "any")
                  .map((value) => (
                    <option key={value} value={value}>
                      {label(value)}
                    </option>
                  ))}
              </select>
            </label>
            <label className="checkbox">
              <input type="checkbox" {...register("foodIncluded")} />
              {t("Meals included", "खाना शामिल है")}
            </label>
          </>
        )}
        {chosen === "residential_rental" && (
          <>
            <label className="field">
              {t("Floor plan", "फ़्लोर प्लान")}
              <select {...register("bhk")}>
                <option value="">{t("Any", "कोई भी")}</option>
                {bhk.options.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="field">
              {t("Furnishing", "साज-सज्जा")}
              <select {...register("furnishingStatus")}>
                <option value="">{t("Any", "कोई भी")}</option>
                {furnishing.options.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {chosen === "commercial" && (
          <label className="field">
            {t("Space type", "जगह का प्रकार")}
            <select {...register("commercialSubtype")}>
              <option value="">{t("Any", "कोई भी")}</option>
              {commercialSubtype.options.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="checkbox">
          <input type="checkbox" {...register("isVerified")} />
          {t("Verified listings only", "सिर्फ़ सत्यापित लिस्टिंग")}
        </label>
        <button type="submit" className="button button-primary">
          {t("Apply filters", "फ़िल्टर लगाएँ")}
        </button>
      </form>
    </aside>
  );
}
