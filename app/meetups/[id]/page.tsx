import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CalendarDays, ChevronRight, UsersRound } from "lucide-react";
import { siteURL } from "@/src/api/config";
import { meetupDetails } from "@/src/api/contracts";
import { ApiError } from "@/src/api/errors";
import { upstream } from "@/src/api/server";
import { Copy } from "@/src/components/preferences";
import { Location } from "@/src/components/ui";
import { SmartImage } from "@/src/components/smart-image";
import { dateOnly, photoSrc } from "@/src/domain/display";
import { objectId } from "@/src/domain/search";
import { Participation } from "@/src/features/meetups/participation";

const loadMeetup = cache(async (id: string) => {
  if (!objectId.safeParse(id).success) notFound();
  try {
    return (await upstream(`meetups/${id}`, meetupDetails, { revalidate: 120 }))
      .data.meetup;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});

export async function generateMetadata({
  params,
}: PageProps<"/meetups/[id]">): Promise<Metadata> {
  const { id } = await params;
  const meetup = await loadMeetup(id);
  return {
    title: meetup.title,
    description: meetup.shortDescription?.slice(0, 160),
    alternates: siteURL() ? { canonical: `/meetups/${id}` } : undefined,
  };
}

export default async function MeetupPage({
  params,
}: PageProps<"/meetups/[id]">) {
  const { id } = await params;
  const meetup = await loadMeetup(id);
  const source = photoSrc(meetup.bannerImage) ?? photoSrc(meetup.images?.[0]);
  return (
    <div className="shell page-section property-detail">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">
          <Copy hi="होम">Home</Copy>
        </Link>
        <ChevronRight size={15} />
        <Link href="/meetups">
          <Copy hi="मिलन">Meetups</Copy>
        </Link>
        <ChevronRight size={15} />
        <span aria-current="page">
          <Copy hi="कार्यक्रम">Event</Copy>
        </span>
      </nav>
      <header className="detail-heading">
        <div>
          <p className="eyebrow">
            <UsersRound size={16} />
            <Copy hi="सामुदायिक मिलन">Community meetup</Copy>
          </p>
          <h1>{meetup.title}</h1>
          <div className="detail-subheading">
            {meetup.startDate && (
              <span className="location">
                <CalendarDays size={15} />
                {dateOnly(meetup.startDate)}
                {meetup.startTime && ` · ${meetup.startTime} IST`}
              </span>
            )}
            <Location
              area={meetup.location?.area}
              city={meetup.location?.city}
            />
          </div>
        </div>
      </header>
      <div className="detail-layout">
        <div className="detail-content">
          <div className="gallery-image meetup-hero-image">
            <SmartImage
              src={source}
              alt=""
              sizes="(max-width: 760px) 92vw, 65vw"
              priority
              fallback={<UsersRound size={40} />}
            />
          </div>
          <section>
            <h2>
              <Copy hi="मिलन के बारे में">About the meetup</Copy>
            </h2>
            <p className="description">
              {meetup.description || meetup.shortDescription}
            </p>
            {meetup.location?.name && (
              <p>
                <strong>{meetup.location.name}</strong>
              </p>
            )}
            {meetup.location?.address && (
              <p className="muted">{meetup.location.address}</p>
            )}
          </section>
        </div>
        <Participation meetup={meetup} />
      </div>
    </div>
  );
}
