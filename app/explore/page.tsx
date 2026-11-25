import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { Suspense } from "react";
import { listings } from "@/src/api/contracts";
import { upstream } from "@/src/api/server";
import { siteURL } from "@/src/api/config";
import { Copy } from "@/src/components/preferences";
import { Skeletons } from "@/src/components/ui";
import { CitySync } from "@/src/features/search/city-sync";
import { FiltersForm } from "@/src/features/search/filters";
import { LocationSearch } from "@/src/features/search/location-search";
import { Results } from "@/src/features/search/results";
import {
  discover,
  params,
  searchFilters,
  type Filters,
  type SearchInput,
} from "@/src/domain/search";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchInput>;
}): Promise<Metadata> {
  const filters = searchFilters(await searchParams);
  return {
    title: filters.city
      ? `Explore rentals in ${filters.city}`
      : "Explore rentals",
    description:
      "Search PGs, co-living spaces, flats and commercial rentals by neighbourhood, price and property type.",
    alternates: siteURL() ? { canonical: "/explore" } : undefined,
    robots: params(filters).size ? { index: false, follow: true } : undefined,
  };
}

async function SearchResults({ filters }: { filters: Filters }) {
  const canonical = params(discover(filters));
  let initial;
  // Location and free-text lookups are kept out of the shared Next.js cache.
  try {
    initial = await upstream("properties", listings, {
      query: canonical,
      revalidate:
        !filters.q &&
        !filters.lat &&
        !filters.area &&
        !filters.cityId &&
        !filters.city &&
        !filters.areaId &&
        !filters.areas &&
        !filters.areaIds &&
        !filters.minPrice &&
        !filters.maxPrice &&
        !filters.category &&
        !filters.sort &&
        !filters.page
          ? 90
          : undefined,
    });
  } catch {
    // The client query retains the typed retry and error path.
  }
  return (
    <Results key={canonical.toString()} filters={filters} initial={initial} />
  );
}

export default async function Explore({
  searchParams,
}: {
  searchParams: Promise<SearchInput>;
}) {
  const filters = searchFilters(await searchParams);
  const key = params(filters).toString();
  return (
    <>
      <CitySync city={filters.city} />
      <section className="subhero">
        <div className="shell">
          <p className="eyebrow">
            <Compass size={16} />
            <Copy hi="संपत्ति की खोज">Property discovery</Copy>
          </p>
          <h1>
            <Copy hi="अपनी अगली जगह खोजें">Explore rentals</Copy>
          </h1>
          <LocationSearch
            initial={filters}
            compact
            key={JSON.stringify([
              filters.city,
              filters.cityId,
              filters.q,
              filters.area,
              filters.category,
            ])}
          />
        </div>
      </section>
      <div className="shell explore-layout">
        <FiltersForm filters={filters} key={key} />
        <Suspense
          key={key}
          fallback={
            <div className="results">
              <div className="skeleton skeleton-heading" />
              <Skeletons count={6} />
            </div>
          }
        >
          <SearchResults filters={filters} />
        </Suspense>
      </div>
    </>
  );
}
