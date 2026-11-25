"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  MapPin,
  Search,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { api } from "@/src/api/client";
import { areas, suggestions } from "@/src/api/contracts";
import { useCopy, usePreferences } from "@/src/components/preferences";
import { categoryOptions, Failure } from "@/src/components/ui";
import { label } from "@/src/domain/display";
import {
  objectId,
  params,
  searchFilters,
  searchHref,
  sharing,
  type Category,
  type Filters,
} from "@/src/domain/search";
import { CityMenu } from "./city-menu";
import { useDebounced } from "./use-debounced";

type Values = {
  category: Category;
  area: string;
  q: string;
  maxPrice: string;
  sharingType: string;
  purpose: "rent" | "sale";
};
export function SearchPanel({
  initialCategory,
  onNavigate,
}: {
  initialCategory?: Category;
  onNavigate: () => void;
}) {
  const t = useCopy();
  const router = useRouter();
  const city = usePreferences((state) => state.city);
  const setCity = usePreferences((state) => state.setCity);
  const { register, control, setValue, handleSubmit } = useForm<Values>({
    defaultValues: {
      category: initialCategory ?? "all",
      area: "",
      q: "",
      maxPrice: "",
      sharingType: "",
      purpose: "rent",
    },
  });
  const [kind, area, value, purpose] = useWatch({
    control,
    name: ["category", "area", "q", "purpose"],
  });
  const areaTerm = useDebounced(area.trim());
  const q = useDebounced(value.trim());
  const localities = useQuery({
    queryKey: ["areas", city, areaTerm],
    queryFn: ({ signal }) =>
      api("areas", areas, {
        signal,
        query: params({ city, q: areaTerm, limit: 8 }),
      }),
    enabled: Boolean(city) && areaTerm === area.trim(),
  });
  const matches = useQuery({
    queryKey: ["suggestions", city, q, kind],
    queryFn: ({ signal }) =>
      api("properties/suggestions", suggestions, {
        signal,
        query: params({ city, q, category: kind === "all" ? undefined : kind }),
      }),
    enabled: q.length >= 2 && q === value.trim(),
  });

  function search(filter: Filters) {
    onNavigate();
    router.push(searchHref(filter));
  }
  return (
    <form
      className="search-panel-form"
      onSubmit={handleSubmit((fields) =>
        search(
          searchFilters({
            ...fields,
            city,
            category: fields.category === "all" ? undefined : fields.category,
            purpose: fields.category === "pg" ? "rent" : fields.purpose,
            sharingType:
              fields.category === "pg" ? fields.sharingType : undefined,
          }),
        ),
      )}
    >
      <div className="search-panel-controls">
        <CityMenu
          withinDialog
          city={city}
          onCity={(value) => {
            setCity(value);
            setValue("area", "");
          }}
        />
        <label className="field search-panel-purpose">
          <span className="sr-only">
            {t("Listing purpose", "लिस्टिंग प्रकार")}
          </span>
          <select
            {...register("purpose")}
            disabled={kind === "pg"}
            value={kind === "pg" ? "rent" : purpose}
          >
            <option value="rent">{t("For rent", "किराए पर")}</option>
            <option value="sale">{t("For sale", "बिक्री के लिए")}</option>
          </select>
        </label>
      </div>
      <fieldset className="drawer-categories">
        <legend>{t("Property type", "संपत्ति का प्रकार")}</legend>
        {categoryOptions.map(({ value, name, hi, icon: Icon }) => (
          <label
            key={value}
            className={
              kind === value ? "category-option selected" : "category-option"
            }
          >
            <input
              {...register("category")}
              className="sr-only"
              type="radio"
              value={value}
            />
            <Icon size={17} />
            {t(name, hi)}
          </label>
        ))}
      </fieldset>
      {city && (
        <div className="drawer-search-section">
          <label className="field">
            {t("Where would you like to stay?", "आप कहाँ रहना चाहते हैं?")}
            <input
              {...register("area")}
              placeholder={t(
                "Search neighbourhoods and localities",
                "इलाके और स्थानीय क्षेत्र खोजें",
              )}
              maxLength={150}
            />
          </label>
          {localities.isFetching && !localities.data && (
            <p className="muted" role="status">
              {t("Finding localities…", "इलाके खोजे जा रहे हैं…")}
            </p>
          )}
          {localities.error && (
            <Failure
              error={localities.error}
              retry={() => void localities.refetch()}
            />
          )}
          {localities.data && (
            <div className="locality-chips">
              {localities.data.data.areas.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  aria-pressed={area === item.name}
                  onClick={() =>
                    setValue("area", area === item.name ? "" : item.name)
                  }
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="drawer-search-section">
        <label className="field">
          {t("Look up a property or landmark", "संपत्ति या प्रमुख स्थान खोजें")}
          <input
            {...register("q")}
            type="search"
            maxLength={150}
            placeholder={t(
              "Enter a name, locality or landmark",
              "नाम, इलाका या प्रमुख स्थान लिखें",
            )}
          />
        </label>
        {matches.error && (
          <p className="muted" role="status">
            {t(
              "Suggestions unavailable. You can still search.",
              "सुझाव उपलब्ध नहीं हैं। आप फिर भी खोज सकते हैं।",
            )}
          </p>
        )}
        {q === value.trim() &&
          q.length > 1 &&
          Boolean(matches.data?.data.suggestions.length) && (
            <ul className="drawer-matches">
              {matches.data?.data.suggestions.map((item) => (
                <li key={item.type + item.id}>
                  {item.type === "property" &&
                  objectId.safeParse(item.id).success ? (
                    <Link
                      onClick={onNavigate}
                      href={`/property/${item.id}`}
                      prefetch={false}
                    >
                      <Building2 size={17} />
                      <span>
                        {item.title}
                        {item.subtitle && <small>{item.subtitle}</small>}
                      </span>
                    </Link>
                  ) : item.type === "locality" ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (item.city) setCity(item.city);
                        setValue("area", item.area || item.title);
                        setValue("q", "");
                      }}
                    >
                      <MapPin size={17} />
                      <span>
                        {item.title}
                        {item.subtitle && <small>{item.subtitle}</small>}
                      </span>
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
      </div>
      <div className="search-panel-filters">
        <label className="field">
          {purpose === "sale" && kind !== "pg"
            ? t("Maximum price (₹)", "अधिकतम कीमत (₹)")
            : t("Maximum monthly rent (₹)", "अधिकतम मासिक किराया (₹)")}
          <input
            type="number"
            min="0"
            step="any"
            {...register("maxPrice")}
            placeholder={t("Any budget", "कोई भी बजट")}
          />
        </label>
        {kind === "pg" && (
          <label className="field">
            {t("Room sharing", "कमरे में साझेदारी")}
            <select {...register("sharingType")}>
              <option value="">
                {t("Any room type", "किसी भी तरह का कमरा")}
              </option>
              {sharing.options.map((item) => (
                <option key={item} value={item}>
                  {label(item)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="search-panel-submit">
        <button type="submit" className="button button-primary">
          <Search size={18} />
          {t("Show properties", "संपत्तियाँ दिखाएँ")}
        </button>
        <Link
          href={searchHref({ city: city || undefined })}
          onClick={onNavigate}
          className="text-button"
        >
          <SlidersHorizontal size={17} />
          {t("Browse all rental filters", "सभी किराये फ़िल्टर देखें")}
        </Link>
      </div>
      <Link
        href="/meetups"
        onClick={onNavigate}
        className="search-panel-meetups"
      >
        <UsersRound size={20} />
        <span>{t("Explore local meetups", "स्थानीय मिलन खोजें")}</span>
      </Link>
    </form>
  );
}
