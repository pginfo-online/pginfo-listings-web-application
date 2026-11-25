import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  BadgeCheck,
  BedDouble,
  ChevronRight,
  CircleCheck,
  House,
  KeyRound,
} from "lucide-react";
import { siteURL } from "@/src/api/config";
import { details } from "@/src/api/contracts";
import { ApiError } from "@/src/api/errors";
import { upstream } from "@/src/api/server";
import { Copy } from "@/src/components/preferences";
import { categoryName, Location } from "@/src/components/ui";
import {
  amenitiesOf,
  label,
  photosOf,
  priceOf,
  rupees,
  titleOf,
} from "@/src/domain/display";
import { objectId, searchHref } from "@/src/domain/search";
import { Gallery } from "@/src/features/property/gallery";
import { PropertyActions } from "@/src/features/property/requests";
import { SaveButton } from "@/src/features/property/save-button";

const loadProperty = cache(async (id: string) => {
  if (!objectId.safeParse(id).success) notFound();
  try {
    return (await upstream(`properties/${id}`, details, { revalidate: 120 }))
      .data.property;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});

export async function generateMetadata({
  params,
}: PageProps<"/property/[id]">): Promise<Metadata> {
  const { id } = await params;
  const property = await loadProperty(id);
  const title = titleOf(property);
  const location = [property.area, property.city].filter(Boolean).join(", ");
  const description =
    property.description?.trim().slice(0, 160) ||
    `See photos, rent and available amenities for ${title}${location ? ` in ${location}` : ""}.`;
  return {
    title,
    description,
    alternates: siteURL() ? { canonical: `/property/${id}` } : undefined,
    openGraph: {
      title,
      description,
      images: photosOf(property)
        .slice(0, 1)
        .map(({ url }) => url),
    },
  };
}

export default async function PropertyPage({
  params,
}: PageProps<"/property/[id]">) {
  const { id } = await params;
  const p = await loadProperty(id);
  const title = titleOf(p);
  const type = categoryName(p.category);
  const rooms = p.roomConfigs?.length
    ? p.roomConfigs
    : (p.pgDetails?.roomConfigs ?? []);
  const amenities = amenitiesOf(p);
  const sqft =
    p.residentialDetails?.carpetAreaSqFt ??
    p.commercialDetails?.carpetAreaSqFt ??
    p.carpetAreaSqFt;
  const furnishing =
    p.residentialDetails?.furnishingStatus ?? p.furnishingStatus;
  const bhk = p.residentialDetails?.bhk ?? p.bhk;
  const photos = photosOf(p).map((photo) => ({
    src: photo.url,
    caption: photo.caption ?? "",
  }));
  return (
    <div className="shell page-section property-detail">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">
          <Copy hi="होम">Home</Copy>
        </Link>
        <ChevronRight size={15} />
        <Link
          href={searchHref({
            city: p.city ?? undefined,
            category: p.category ?? undefined,
          })}
        >
          <Copy hi="खोजें">Explore</Copy>
          {p.city && ` ${p.city}`}
        </Link>
        <ChevronRight size={15} />
        <span aria-current="page">
          <Copy hi="संपत्ति">Property</Copy>
        </span>
      </nav>
      <header className="detail-heading">
        <div>
          <p className="eyebrow">
            <type.icon size={16} />
            <Copy hi={type.hi}>{type.name}</Copy>
          </p>
          <h1>{title}</h1>
          <div className="detail-subheading">
            <Location area={p.area} city={p.city} />
            {p.isVerified && (
              <span className="verified-text">
                <BadgeCheck size={18} />
                <Copy hi="सत्यापित लिस्टिंग">Verified listing</Copy>
              </span>
            )}
          </div>
        </div>
        <SaveButton id={p._id} title={title} showLabel />
      </header>
      <Gallery photos={photos} title={title} />
      <div className="detail-layout">
        <div className="detail-content">
          <section aria-labelledby="about-property">
            <h2 id="about-property">
              <Copy hi="संपत्ति के बारे में">About the property</Copy>
            </h2>
            {p.description?.trim() && (
              <p className="description">{p.description}</p>
            )}
            <div className="detail-facts">
              {bhk && (
                <span>
                  <House size={19} />
                  {bhk}
                </span>
              )}
              {furnishing && (
                <span>
                  <KeyRound size={19} />
                  {label(furnishing)}
                </span>
              )}
              {sqft != null && (
                <span>{new Intl.NumberFormat("en-IN").format(sqft)} sq ft</span>
              )}
              {p.landmark && (
                <span>
                  <Copy hi="पास में">Near</Copy> {p.landmark}
                </span>
              )}
              {p.owner?.name && (
                <span>
                  <Copy hi="लिस्टिंग करने वाले">Listed by</Copy> {p.owner.name}
                </span>
              )}
            </div>
          </section>
          {rooms.length > 0 && (
            <section aria-labelledby="room-options">
              <h2 id="room-options">
                <Copy hi="कमरे के विकल्प">Room options</Copy>
              </h2>
              <div className="room-grid">
                {rooms.map((room, index) => (
                  <div className="room-card" key={index}>
                    <BedDouble size={22} />
                    <h3>{room.shareType ? label(room.shareType) : "Room"}</h3>
                    {(room.rent ?? room.monthlyRent) != null && (
                      <p>
                        <strong>
                          {rupees(room.rent ?? room.monthlyRent ?? 0)}
                        </strong>{" "}
                        / <Copy hi="माह">month</Copy>
                      </p>
                    )}
                    {room.depositAmount != null && (
                      <p className="muted">
                        <Copy hi="जमा">Deposit</Copy>{" "}
                        {rupees(room.depositAmount)}
                      </p>
                    )}
                    {room.availableBeds != null && (
                      <p className="muted">
                        {room.availableBeds}{" "}
                        <Copy hi="बिस्तर उपलब्ध">beds available</Copy>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
          {amenities.length > 0 && (
            <section aria-labelledby="amenities">
              <h2 id="amenities">
                <Copy hi="सुविधाएँ">Amenities</Copy>
              </h2>
              <ul className="amenities-grid">
                {amenities.map((amenity) => (
                  <li key={amenity}>
                    <CircleCheck size={18} />
                    {label(amenity)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <PropertyActions
          id={p._id}
          purpose={p.purpose}
          ownerId={p.owner?._id}
          price={priceOf(p)}
          isPg={p.category === "pg"}
          deposit={p.pricing?.securityDeposit ?? p.securityDeposit}
        />
      </div>
    </div>
  );
}
