"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api/client";
import { ownerListings } from "@/src/api/owner-contracts";
import { isAccessError } from "@/src/api/errors";
import { useCopy } from "@/src/components/preferences";
import { Empty, Failure } from "@/src/components/ui";
import { label } from "@/src/domain/display";
import { params } from "@/src/domain/search";
import { SignInDrawer } from "../account/sign-in-drawer";
import { useSession } from "../account/session";
import { ListingForm } from "./listing-form";

export function OwnerListing() {
  const t = useCopy();
  const session = useSession();
  const [submitted, setSubmitted] = useState("");
  if (session.isPending)
    return (
      <div
        className="skeleton skeleton-card"
        role="status"
        aria-label={t("Checking session", "सत्र की जाँच")}
      />
    );
  if (session.error)
    return (
      <Failure error={session.error} retry={() => void session.refetch()} />
    );
  if (!session.data)
    return (
      <Empty
        title={t("Sign in to add a listing", "लिस्टिंग जोड़ने के लिए साइन इन करें")}
        action={
          <SignInDrawer
            trigger={
              <button type="button" className="button button-primary">
                {t("Sign in", "साइन इन")}
              </button>
            }
          />
        }
      >
        {t(
          "Create or open a PGinfo account to submit your listing and track its review.",
          "लिस्टिंग भेजने और समीक्षा देखने के लिए PGinfo खाते में साइन इन करें।",
        )}
      </Empty>
    );

  const mayList =
    session.data.roles?.some((role) =>
      ["owner", "pg_owner", "admin"].includes(role),
    ) || ["owner", "pg_owner", "admin"].includes(session.data.role ?? "");
  return (
    <div className="owner-layout">
      <div>
        {submitted ? (
          <div className="inline-status success-panel" role="status">
            <CheckCircle2 size={22} />
            <div>
              <strong>
                {t(
                  "Listing submitted for review",
                  "लिस्टिंग समीक्षा के लिए भेज दी गई",
                )}
              </strong>
              <p>{submitted}</p>
            </div>
            <button
              type="button"
              className="button button-outline"
              onClick={() => setSubmitted("")}
            >
              {t("Add another property", "एक और संपत्ति जोड़ें")}
            </button>
          </div>
        ) : (
          <ListingForm
            key={session.data._id}
            phone={session.data.phone ?? ""}
            onSubmitted={setSubmitted}
          />
        )}
      </div>
      <MyListings id={session.data._id} enabled={mayList} />
    </div>
  );
}

function MyListings({ id, enabled }: { id: string; enabled: boolean }) {
  const t = useCopy();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["private", "owner-listings", id, page],
    enabled,
    queryFn: ({ signal }) =>
      api("properties/my", ownerListings, {
        signal,
        query: params({ page, limit: 8 }),
      }),
  });
  const data = isAccessError(query.error) ? undefined : query.data;
  return (
    <section
      id="my-listings"
      className="owner-history"
      aria-labelledby="my-listings-title"
    >
      <div className="owner-history-head">
        <h2 id="my-listings-title">
          <Building2 size={19} />
          {t("My listings", "मेरी लिस्टिंग")}
        </h2>
        <button
          className="text-button"
          type="button"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {t("Refresh", "अपडेट करें")}
        </button>
      </div>
      {((!enabled && !query.isFetched) || (data && !data.data.length)) && (
        <p className="muted">
          {t(
            "Submitted properties and their review status will appear here.",
            "भेजी गई संपत्तियाँ और उनकी समीक्षा स्थिति यहाँ दिखेंगी।",
          )}
        </p>
      )}
      {query.isFetching && !data && (
        <p role="status" className="muted">
          {t("Loading listings…", "लिस्टिंग लोड हो रही हैं…")}
        </p>
      )}
      {query.error && <Failure error={query.error} />}
      {Boolean(data?.data.length) && (
        <ul className="owner-list-items">
          {data?.data.map((item) => (
            <li key={item._id}>
              <strong>
                {item.status === "approved" ? (
                  <Link href={`/property/${item._id}`}>
                    {item.title || item.name}
                  </Link>
                ) : (
                  item.title || item.name
                )}
              </strong>
              <span>{[item.area, item.city].filter(Boolean).join(", ")}</span>
              {item.status && (
                <span className="status-pill">{label(item.status)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {data && (page > 1 || data.pagination.hasNext) && (
        <div className="pagination">
          <button
            type="button"
            className="button button-outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            {t("Previous", "पिछला")}
          </button>
          <button
            type="button"
            className="button button-outline"
            disabled={!data.pagination.hasNext}
            onClick={() => setPage(page + 1)}
          >
            {t("Next", "अगला")}
          </button>
        </div>
      )}
    </section>
  );
}
