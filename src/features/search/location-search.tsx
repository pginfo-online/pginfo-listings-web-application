"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronDown,
  LocateFixed,
  MapPin,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/src/api/client";
import { cities, suggestions, type City } from "@/src/api/contracts";
import { Modal, ModalClose } from "@/src/components/dialog";
import { useCopy } from "@/src/components/preferences";
import { categoryOptions, Failure } from "@/src/components/ui";
import {
  params,
  searchHref,
  type Category,
  type Filters,
} from "@/src/domain/search";

import { useDebounced } from "./use-debounced";

function CityPicker({
  city,
  onChange,
  onSelectFocus,
}: {
  city: string;
  onChange: (city: City | null) => void;
  onSelectFocus: () => void;
}) {
  const t = useCopy();
  const [open, setOpen] = useState(false);
  const selected = useRef(false);
  const [input, setInput] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(input.trim());
  const query = useQuery({
    queryKey: ["cities", q, page],
    enabled: open && q === input.trim(),
    queryFn: ({ signal }) =>
      api("cities", cities, { signal, query: params({ q, limit: 12, page }) }),
  });
  const location = city || t("Any city", "कोई भी शहर");
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      onCloseAutoFocus={(event) => {
        if (!selected.current) return;
        selected.current = false;
        event.preventDefault();
        onSelectFocus();
      }}
      title={t("Choose a city", "शहर चुनें")}
      description={t(
        "Search the PGinfo city directory.",
        "PGinfo की शहर सूची में खोजें।",
      )}
      trigger={
        <button
          type="button"
          className="location-picker"
          aria-label={`${t("Choose a city", "शहर चुनें")} · ${location}`}
        >
          <MapPin size={19} />
          <span>{location}</span>
          <ChevronDown size={14} />
        </button>
      }
    >
      <label className="field">
        {t("Search cities", "शहर खोजें")}
        <input
          value={input}
          maxLength={100}
          onChange={(event) => {
            setInput(event.target.value);
            setPage(1);
          }}
          type="search"
          placeholder={t("Enter a city name", "शहर का नाम लिखें")}
        />
      </label>
      <CityOptions
        query={query}
        city={city}
        onChange={(item) => {
          selected.current = true;
          onChange(item);
        }}
      />
      {query.data && query.data.data.pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="button button-outline"
            type="button"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            {t("Previous", "पिछला")}
          </button>
          <button
            className="button button-outline"
            type="button"
            disabled={page >= query.data.data.pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t("Next", "अगला")}
          </button>
        </div>
      )}
    </Modal>
  );
}

function CityOptions({
  query,
  city,
  onChange,
}: {
  query: {
    data?: z.infer<typeof cities>;
    isPending: boolean;
    error: Error | null;
    refetch: () => unknown;
  };
  city: string;
  onChange: (city: City | null) => void;
}) {
  const t = useCopy();
  return (
    <>
      {city && (
        <ModalClose
          className="button button-outline"
          onClick={() => onChange(null)}
        >
          {t("Search all cities", "सभी शहर खोजें")}
        </ModalClose>
      )}
      {query.isPending && (
        <p role="status">{t("Loading cities…", "शहर खोजे जा रहे हैं…")}</p>
      )}
      {query.error && (
        <Failure error={query.error} retry={() => void query.refetch()} />
      )}
      {query.data?.data.cities.length === 0 && (
        <p>{t("No matching cities.", "कोई शहर नहीं मिला।")}</p>
      )}
      {query.data && (
        <ul className="city-picker-list">
          {query.data.data.cities.map((item) => (
            <li key={item._id}>
              <ModalClose className="choice" onClick={() => onChange(item)}>
                <MapPin size={17} />
                <span>
                  {item.name}
                  {item.state && <small>{item.state}</small>}
                </span>
              </ModalClose>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const formSchema = z.object({ q: z.string().trim().max(150) });
type Values = z.infer<typeof formSchema>;

export function LocationSearch({
  initial = {},
  compact = false,
}: {
  initial?: Filters;
  compact?: boolean;
}) {
  const t = useCopy();
  const router = useRouter();
  const [city, setCity] = useState(initial.city ?? "");
  const [cityId, setCityId] = useState(initial.cityId);
  const [type, setType] = useState<Category>(initial.category ?? "all");
  const [focused, setFocused] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [geoError, setGeoError] = useState("");
  const { register, handleSubmit, control, setFocus } = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: { q: initial.q ?? "" },
  });
  const value = useWatch({ control, name: "q" }).trim();
  const debounced = useDebounced(value);
  const suggestionQuery = useQuery({
    queryKey: ["suggestions", debounced, city, cityId, type],
    enabled: focused && debounced.length >= 2 && debounced === value,
    queryFn: ({ signal }) =>
      api("properties/suggestions", suggestions, {
        signal,
        query: params({
          q: debounced,
          city,
          cityId,
          category: type === "all" ? undefined : type,
        }),
      }),
  });
  function currentSearch() {
    const base =
      type === (initial.category ?? "all")
        ? initial
        : {
            purpose: initial.purpose,
            sort: initial.sort,
            minPrice: initial.minPrice,
            maxPrice: initial.maxPrice,
            isVerified: initial.isVerified,
          };
    return {
      ...base,
      city: city || undefined,
      cityId,
      category: type === "all" ? undefined : type,
      page: undefined,
      limit: undefined,
      area: city === (initial.city ?? "") ? initial.area : undefined,
      areaId: city === (initial.city ?? "") ? initial.areaId : undefined,
      areas: city === (initial.city ?? "") ? initial.areas : undefined,
      areaIds: city === (initial.city ?? "") ? initial.areaIds : undefined,
    };
  }
  const onSubmit = handleSubmit(({ q }) => {
    setFocused(false);
    router.push(searchHref({ ...currentSearch(), q: q || undefined }));
  });
  function findNearby() {
    if (!navigator.geolocation) {
      setGeoError(
        t(
          "Location is unavailable on this device.",
          "इस डिवाइस पर लोकेशन उपलब्ध नहीं है।",
        ),
      );
      return;
    }
    setNearby(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setNearby(false);
        router.push(
          searchHref({
            category: type === "all" ? undefined : type,
            lat: Number(coords.latitude.toFixed(3)),
            lng: Number(coords.longitude.toFixed(3)),
            radius: 10,
            sort: "distance",
          }),
        );
      },
      () => {
        setNearby(false);
        setGeoError(
          t(
            "We couldn’t get your location. Choose a city to search.",
            "आपकी लोकेशन नहीं मिली। खोजने के लिए शहर चुनें।",
          ),
        );
      },
      { timeout: 7000, maximumAge: 60_000 },
    );
  }
  return (
    <form
      className={compact ? "location-form compact-search" : "location-form"}
      role="search"
      onSubmit={onSubmit}
    >
      {!compact && (
        <fieldset className="category-picker">
          <legend className="sr-only">
            {t("Property type", "संपत्ति का प्रकार")}
          </legend>
          {categoryOptions.map(({ value, name, hi, icon: Icon }) => (
            <label
              key={value}
              className={
                type === value ? "category-option selected" : "category-option"
              }
            >
              <input
                className="sr-only"
                type="radio"
                name="property-type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
              />
              <Icon size={16} />
              {t(name, hi)}
            </label>
          ))}
        </fieldset>
      )}
      <div className="search-bar">
        <CityPicker
          city={city}
          onSelectFocus={() => setFocus("q")}
          onChange={(selected) => {
            setCity(selected?.name ?? "");
            setCityId(undefined);
          }}
        />
        <div
          className="keyword-wrap"
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setFocused(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setFocused(false);
          }}
        >
          <Search size={19} />
          <input
            {...register("q")}
            type="search"
            maxLength={150}
            autoComplete="off"
            aria-label={t("Locality or property name", "इलाका या संपत्ति का नाम")}
            placeholder={t("Locality or property", "इलाका या संपत्ति")}
          />
          {focused &&
            value.length >= 2 &&
            debounced === value &&
            (suggestionQuery.isFetching ||
              suggestionQuery.error ||
              Boolean(suggestionQuery.data?.data.suggestions.length)) && (
              <div className="suggestions">
                {suggestionQuery.isFetching && !suggestionQuery.data && (
                  <p role="status">
                    {t("Finding matches…", "मिलान खोजे जा रहे हैं…")}
                  </p>
                )}
                {suggestionQuery.error && (
                  <p role="status">
                    {t(
                      "Suggestions unavailable. You can still search.",
                      "सुझाव उपलब्ध नहीं हैं। आप फिर भी खोज सकते हैं।",
                    )}
                  </p>
                )}
                {suggestionQuery.data?.data.suggestions.map((item) => (
                  <Link
                    key={item.type + item.id}
                    href={
                      item.type === "property"
                        ? `/property/${encodeURIComponent(item.id)}`
                        : searchHref({
                            ...currentSearch(),
                            city: item.city || city,
                            cityId:
                              item.city && item.city !== city
                                ? undefined
                                : cityId,
                            area: item.area ?? item.title,
                            areaId: undefined,
                            areas: undefined,
                            areaIds: undefined,
                            q: undefined,
                          })
                    }
                    onClick={() => setFocused(false)}
                  >
                    {item.type === "property" ? (
                      <Building2 size={17} />
                    ) : (
                      <MapPin size={17} />
                    )}
                    <span>
                      {item.title}
                      <small>{item.subtitle}</small>
                    </span>
                  </Link>
                ))}
              </div>
            )}
        </div>
        <button
          type="submit"
          className="button button-primary search-submit"
          aria-label={t("Search", "खोजें")}
        >
          <Search size={19} />
          <span>{t("Search", "खोजें")}</span>
        </button>
      </div>
      {!compact && (
        <div className="hero-tools">
          <button
            className="text-button"
            type="button"
            disabled={nearby}
            onClick={findNearby}
          >
            <LocateFixed size={16} />
            {nearby
              ? t("Getting your location…", "लोकेशन मिल रही है…")
              : t("Search near me", "मेरे आस-पास खोजें")}
          </button>
          {geoError && <span role="status">{geoError}</span>}
        </div>
      )}
    </form>
  );
}
