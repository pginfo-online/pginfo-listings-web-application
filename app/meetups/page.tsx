import type { Metadata } from "next";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { siteURL } from "@/src/api/config";
import { meetups } from "@/src/api/contracts";
import { upstream } from "@/src/api/server";
import { Copy } from "@/src/components/preferences";
import { Empty } from "@/src/components/ui";
import { todayIST } from "@/src/domain/display";
import { params, searchFilters } from "@/src/domain/search";
import { MeetupCards } from "@/src/features/meetups/cards";

export const metadata: Metadata = {
  title: "Meetups",
  description: "Browse PGinfo community meetups and find events to join.",
  alternates: siteURL() ? { canonical: "/meetups" } : undefined,
};

function eventPage(page: number, all: boolean) {
  const query = params({
    page: page === 1 ? undefined : page,
    view: all ? "all" : undefined,
  });
  return query.size ? `/meetups?${query}` : "/meetups";
}

export default async function MeetupsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; view?: string | string[] }>;
}) {
  const input = await searchParams;
  const page = searchFilters(input).page ?? 1;
  const all = input.view === "all";
  let response;
  try {
    const dateFrom = all
      ? undefined
      : new Date(`${todayIST()}T00:00:00+05:30`).toISOString();
    response = await upstream("meetups", meetups, {
      query: params({ page, limit: 12, dateFrom }),
      revalidate: 120,
    });
  } catch {}
  return (
    <>
      <section className="subhero">
        <div className="shell">
          <p className="eyebrow">
            <UsersRound size={17} />
            <Copy hi="समुदाय">Community</Copy>
          </p>
          <h1>
            <Copy hi="मिलन">Meetups</Copy>
          </h1>
          <p>
            <Copy hi="अपने आसपास की मुलाकातें और सामुदायिक कार्यक्रम देखें।">
              Discover local gatherings and community events.
            </Copy>
          </p>
        </div>
      </section>
      <div className="shell page-section">
        <nav className="module-controls" aria-label="Meetup schedule">
          <Link
            className="button button-outline"
            aria-current={!all ? "page" : undefined}
            href="/meetups"
          >
            <Copy hi="आगामी">Upcoming</Copy>
          </Link>
          <Link
            className="button button-outline"
            aria-current={all ? "page" : undefined}
            href="/meetups?view=all"
          >
            <Copy hi="सभी कार्यक्रम">All events</Copy>
          </Link>
        </nav>
        {response ? (
          response.data.length ? (
            <MeetupCards items={response.data} />
          ) : (
            <Empty
              title={all ? "No meetups listed" : "No upcoming meetups"}
              action={
                !all ? (
                  <Link
                    href="/meetups?view=all"
                    className="button button-outline"
                  >
                    <Copy hi="सभी कार्यक्रम देखें">View all events</Copy>
                  </Link>
                ) : undefined
              }
            >
              <Copy hi="नए कार्यक्रमों के लिए फिर देखें।">
                Check back for new events.
              </Copy>
            </Empty>
          )
        ) : (
          <Empty
            title="Meetups are temporarily unavailable"
            action={
              <a href={eventPage(page, all)} className="button button-outline">
                Try again
              </a>
            }
          />
        )}
        {response && (page > 1 || response.pagination.totalPages > page) && (
          <nav className="pagination" aria-label="Meetup pages">
            {page > 1 && (
              <Link
                className="button button-outline"
                href={eventPage(page - 1, all)}
              >
                <Copy hi="पिछला">Previous</Copy>
              </Link>
            )}
            <span>
              {page} / {Math.max(1, response.pagination.totalPages)}
            </span>
            {response.pagination.totalPages > page && (
              <Link
                className="button button-outline"
                href={eventPage(page + 1, all)}
              >
                <Copy hi="अगला">Next</Copy>
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
