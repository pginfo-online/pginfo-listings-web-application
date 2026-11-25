import Link from "next/link";
import { CalendarDays, UsersRound } from "lucide-react";
import type { Meetup } from "@/src/api/contracts";
import { Copy } from "@/src/components/preferences";
import { SmartImage } from "@/src/components/smart-image";
import { Location } from "@/src/components/ui";
import { dateOnly, photoSrc } from "@/src/domain/display";

export function MeetupCards({ items }: { items: Meetup[] }) {
  return (
    <div className="card-grid meetup-grid">
      {items.map((item) => {
        const category =
          typeof item.category === "string"
            ? item.category
            : (item.category?.displayName ?? item.category?.name);
        const source =
          photoSrc(item.bannerImage) ?? photoSrc(item.images?.[0], true);
        return (
          <article key={item._id} className="meetup-card">
            <Link
              href={`/meetups/${item._id}`}
              className="meetup-picture"
              aria-label={item.title}
              prefetch={false}
            >
              <SmartImage
                src={source}
                alt=""
                sizes="(max-width: 490px) 92vw, (max-width: 900px) 44vw, 390px"
                fallback={<UsersRound size={40} />}
              />
            </Link>
            <div className="meetup-card-body">
              {category && <p className="eyebrow">{category}</p>}
              <h3>
                <Link href={`/meetups/${item._id}`} prefetch={false}>
                  {item.title}
                </Link>
              </h3>
              <div className="detail-subheading">
                {item.startDate && (
                  <span className="location">
                    <CalendarDays size={15} />
                    {dateOnly(item.startDate)}
                  </span>
                )}
                <Location
                  area={item.location?.area}
                  city={item.location?.city}
                />
              </div>
              {item.shortDescription && (
                <p className="muted meetup-summary">{item.shortDescription}</p>
              )}
              <Link
                href={`/meetups/${item._id}`}
                className="text-button"
                prefetch={false}
              >
                <Copy hi="कार्यक्रम देखें">View meetup</Copy>
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
