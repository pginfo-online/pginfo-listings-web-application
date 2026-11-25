"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { useFeatures } from "@/src/api/features";
import { api } from "@/src/api/client";
import { listings, savedSearchResult } from "@/src/api/contracts";
import { useCopy } from "@/src/components/preferences";
import { Empty, Failure, Skeletons } from "@/src/components/ui";
import {
  discover,
  params,
  searchHref,
  searchFilters,
  type Filters,
} from "@/src/domain/search";
import { PropertyGrid } from "../property/property-card";

export function Results({
  filters,
  initial,
}: {
  filters: Filters;
  initial?: z.infer<typeof listings>;
}) {
  const t = useCopy();
  const router = useRouter();
  const eligibleForSave = Boolean(
    (filters.city || filters.cityId) && filters.lat === undefined,
  );
  const features = useFeatures(eligibleForSave);
  const input = discover(filters);
  const queryString = params(input).toString();
  const query = useQuery({
    queryKey: ["properties", queryString],
    queryFn: ({ signal }) =>
      api("properties", listings, {
        signal,
        query: new URLSearchParams(queryString),
      }),
    initialData: initial,
  });
  const data = query.data;
  const reset = searchHref({ city: filters.city, cityId: filters.cityId });
  const page = data?.pagination.page ?? filters.page ?? 1;
  const sort = input.sort ?? "";
  return (
    <section aria-labelledby="results-title" className="results">
      <div className="results-heading">
        <div>
          <h2 id="results-title">
            {filters.lat !== undefined
              ? t("Rentals near you", "आपके पास के किराये")
              : filters.area ||
                filters.city ||
                t("All properties", "सभी संपत्तियाँ")}
          </h2>
          {data && (
            <p role="status">
              {new Intl.NumberFormat("en-IN").format(data.pagination.total)}{" "}
              {t("properties found", "संपत्तियाँ मिलीं")}
              {query.isFetching && t(" · Updating…", " · अपडेट हो रहा है…")}
            </p>
          )}
        </div>
        <div className="results-actions">
          {eligibleForSave && features.data?.savedSearches === "available" && (
            <SaveSearch filters={filters} />
          )}
          <label className="sort-label">
            <span className="sr-only">{t("Sort listings", "लिस्टिंग क्रम")}</span>
            <select
              value={sort}
              onChange={(event) =>
                router.push(
                  searchHref({
                    ...filters,
                    sort: searchFilters({
                      sort: event.currentTarget.value,
                      lat: filters.lat,
                      lng: filters.lng,
                    }).sort,
                    page: undefined,
                  }),
                )
              }
            >
              <option value="">{t("Recommended", "अनुशंसित")}</option>
              <option value="newest">{t("Newest", "नवीनतम")}</option>
              <option value="popular">{t("Most popular", "लोकप्रिय")}</option>
              <option value="price_asc">
                {t("Price: low to high", "मूल्य कम से अधिक")}
              </option>
              <option value="price_desc">
                {t("Price: high to low", "मूल्य अधिक से कम")}
              </option>
              {filters.lat !== undefined && (
                <option value="distance">{t("Nearest", "सबसे नज़दीक")}</option>
              )}
              {sort === "rent_asc" && (
                <option value="rent_asc">
                  {t("Price: low to high", "मूल्य कम से अधिक")}
                </option>
              )}
              {sort === "rent_desc" && (
                <option value="rent_desc">
                  {t("Price: high to low", "मूल्य अधिक से कम")}
                </option>
              )}
            </select>
          </label>
        </div>
      </div>
      {query.isPending && <Skeletons count={6} />}
      {query.error && (
        <>
          <Failure error={query.error} retry={() => void query.refetch()} />
          {data && (
            <p className="muted">
              {t(
                "Showing previously loaded results.",
                "पहले लोड किए गए परिणाम।",
              )}
            </p>
          )}
        </>
      )}
      {data &&
        (data.data.length > 0 ? (
          <PropertyGrid properties={data.data} />
        ) : (
          <Empty
            title={t("No matching properties", "कोई संपत्ति नहीं मिली")}
            action={
              <Link href={reset} className="button button-outline">
                {t("Clear filters", "फ़िल्टर हटाएँ")}
              </Link>
            }
          >
            {t(
              "Try a different locality, search term or price range.",
              "कोई दूसरा इलाका, खोज शब्द या मूल्य सीमा आज़माएँ।",
            )}
          </Empty>
        ))}
      {data && (page > 1 || data.pagination.hasNext) && (
        <nav
          className="pagination"
          aria-label={t("Results pages", "परिणामों के पृष्ठ")}
        >
          {page > 1 && (
            <Link
              href={searchHref({ ...filters, page: page - 1 })}
              className="button button-outline"
              prefetch={false}
            >
              <ChevronLeft size={17} />
              {t("Previous", "पिछला")}
            </Link>
          )}
          <span>
            {t("Page", "पृष्ठ")} {page} {t("of", "/")}{" "}
            {Math.max(1, data.pagination.totalPages)}
          </span>
          {data.pagination.hasNext && (
            <Link
              href={searchHref({ ...filters, page: page + 1 })}
              className="button button-outline"
              prefetch={false}
            >
              {t("Next", "अगला")}
              <ChevronRight size={17} />
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}

function SaveSearch({ filters }: { filters: Filters }) {
  const t = useCopy();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      api("saved-searches", savedSearchResult, {
        method: "POST",
        body: {
          label:
            [filters.city, filters.area, filters.q]
              .filter(Boolean)
              .join(" · ")
              .slice(0, 120) || "My property search",
          filters: discover({ ...filters, page: undefined }),
        },
      }),
    onSuccess: async () =>
      client.invalidateQueries({ queryKey: ["private", "saved-searches"] }),
  });
  return (
    <div className="search-alert-action">
      <button
        className="button button-outline"
        type="button"
        disabled={mutation.isPending || mutation.isSuccess}
        onClick={() => mutation.mutate()}
      >
        <BookmarkPlus size={16} />
        {mutation.isSuccess
          ? t("Search saved", "खोज सहेजी गई")
          : t("Save search", "खोज सहेजें")}
      </button>
      {mutation.error && <Failure error={mutation.error} />}
    </div>
  );
}
