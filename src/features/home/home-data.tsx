import Link from "next/link";
import { connection } from "next/server";
import { City, cities, listings } from "@/src/api/contracts";
import { upstream } from "@/src/api/server";
import { Copy } from "@/src/components/preferences";
import { SmartImage } from "@/src/components/smart-image";
import { Empty } from "@/src/components/ui";
import { photoSrc } from "@/src/domain/display";
import { params, searchHref } from "@/src/domain/search";
import { Building2, ChevronRight } from "lucide-react";
import { PropertyGrid } from "../property/property-card";

const priority = [
  "Bengaluru",
  "Pune",
  "Mumbai",
  "Hyderabad",
  "Chennai",
  "Delhi",
];
function cityOrder(a: City, b: City) {
  const index = (city: City) => {
    const value = priority.indexOf(city.name);
    return value < 0 ? priority.length : value;
  };
  return index(a) - index(b);
}

export async function CityGrid() {
  await connection();
  const response = await upstream("cities", cities, {
    query: params({ limit: 16 }),
    revalidate: 600,
  }).catch(() => undefined);
  if (!response)
    return (
      <Empty
        title="City directory is temporarily unavailable"
        action={
          <Link href="/explore" className="button button-outline">
            Explore all cities
          </Link>
        }
      />
    );
  const values = response.data.cities.sort(cityOrder).slice(0, 6);
  if (!values.length)
    return (
      <Empty title="No cities available">
        Check back as more cities are added.
      </Empty>
    );
  return (
    <div className="city-grid">
      {values.map((city) => (
        <Link
          className="city-card"
          href={searchHref({ city: city.name })}
          key={city._id}
          prefetch={false}
        >
          <span className="city-picture">
            <SmartImage
              src={
                photoSrc(city.image) ??
                (city.name === "Bengaluru"
                  ? "/media/bengaluru.webp"
                  : undefined)
              }
              alt=""
              sizes="(max-width: 650px) 44vw, 200px"
              fallback={<Building2 size={32} />}
            />
          </span>
          <span className="city-copy">
            <span>
              <strong>{city.name}</strong>
              {city.state && <small>{city.state}</small>}
            </span>
            <ChevronRight size={17} />
          </span>
        </Link>
      ))}
    </div>
  );
}

export async function Featured() {
  await connection();
  const response = await upstream("properties", listings, {
    query: params({
      category: "pg",
      purpose: "rent",
      isFeatured: "true",
      limit: 4,
    }),
    revalidate: 180,
  }).catch(() => undefined);
  if (!response)
    return (
      <Empty
        title="Featured listings are temporarily unavailable"
        action={
          <Link href="/explore" className="button button-outline">
            Explore listings
          </Link>
        }
      />
    );
  if (response.data.length) return <PropertyGrid properties={response.data} />;
  return (
    <Empty title="No featured stays right now">
      <Copy hi="उपलब्ध आवासों की पूरी सूची खोजें।">
        Explore the full directory to see available rentals.
      </Copy>
    </Empty>
  );
}

export function CityLoading() {
  return (
    <div className="city-grid" role="status" aria-label="Loading cities">
      {Array.from({ length: 6 }, (_, i) => (
        <div className="skeleton skeleton-city" key={i} />
      ))}
    </div>
  );
}
