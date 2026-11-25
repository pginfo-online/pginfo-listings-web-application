import Link from "next/link";
import { BadgeCheck, BedDouble, Building2, House } from "lucide-react";
import type { Property } from "@/src/api/contracts";
import {
  amenitiesOf,
  label,
  photoSrc,
  photosOf,
  priceOf,
  rupees,
  titleOf,
} from "@/src/domain/display";
import { Copy } from "@/src/components/preferences";
import { categoryName, Location } from "@/src/components/ui";
import { SmartImage } from "@/src/components/smart-image";
import { SaveButton } from "./save-button";

export function PropertyCard({
  property: p,
  priority = false,
}: {
  property: Property;
  priority?: boolean;
}) {
  const title = titleOf(p);
  const kind = categoryName(p.category);
  const price = priceOf(p);
  const headline =
    p.bhk ||
    p.residentialDetails?.bhk ||
    p.pgDetails?.propertySubtype ||
    p.propertyType;
  const secondary =
    p.furnishingStatus ||
    p.residentialDetails?.furnishingStatus ||
    amenitiesOf(p)[0];
  const image = photoSrc(photosOf(p)[0], true);
  return (
    <article className="property-card">
      <div className="listing-picture">
        <Link
          href={`/property/${p._id}`}
          className="picture-link"
          aria-label={title}
          prefetch={false}
        >
          <SmartImage
            src={image}
            alt=""
            sizes="(max-width: 600px) 92vw, (max-width: 950px) 44vw, 310px"
            priority={priority}
            fallback={<House size={34} />}
          />
        </Link>
        <span className="image-badge">
          <kind.icon size={13} />
          <Copy hi={kind.hi}>{kind.name}</Copy>
        </span>
        <SaveButton id={p._id} title={title} />
      </div>
      <div className="property-body">
        <h3>
          <Link href={`/property/${p._id}`} prefetch={false}>
            {title}
          </Link>
          {p.isVerified && (
            <BadgeCheck
              className="verified"
              size={18}
              aria-label="Verified listing"
            />
          )}
        </h3>
        <Location area={p.area} city={p.city} />
        {(headline || secondary) && (
          <div className="property-facts">
            {headline && (
              <span>
                {p.category === "pg" ? (
                  <BedDouble size={14} />
                ) : (
                  <Building2 size={14} />
                )}{" "}
                {label(headline)}
              </span>
            )}
            {secondary && <span>{label(secondary)}</span>}
          </div>
        )}
        <div className="property-price">
          {price === undefined ? (
            <span className="muted">
              <Copy hi="किराया उपलब्ध नहीं है">Price on request</Copy>
            </span>
          ) : (
            <>
              <strong>{rupees(price)}</strong>
              {p.purpose !== "sale" && (
                <span>
                  <Copy hi="/ माह">/ month</Copy>
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function PropertyGrid({ properties }: { properties: Property[] }) {
  return (
    <div className="card-grid">
      {properties.map((property) => (
        <PropertyCard key={property._id} property={property} />
      ))}
    </div>
  );
}
