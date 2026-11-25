"use client";

import Link from "next/link";
import { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CalendarDays, CreditCard, KeyRound } from "lucide-react";
import { api } from "@/src/api/client";
import {
  bookingResult,
  bookings,
  checkout,
  visits,
  visitResult,
} from "@/src/api/contracts";
import { isAccessError } from "@/src/api/errors";
import { useCopy } from "@/src/components/preferences";
import { Empty, Failure } from "@/src/components/ui";
import { dateOnly, label, paiseAsRupees } from "@/src/domain/display";
import { params } from "@/src/domain/search";
import { ConfirmedAction } from "./confirmed-action";

export function RentalActivity({
  userId,
  incoming = false,
}: {
  userId: string;
  incoming?: boolean;
}) {
  const t = useCopy();
  const client = useQueryClient();
  const scope = incoming ? "incoming" : "mine";
  const key = ["private", "bookings", userId, scope] as const;
  const query = useInfiniteQuery({
    queryKey: key,
    initialPageParam: {},
    queryFn: ({ signal, pageParam }) =>
      api(`rental-bookings/${scope}`, bookings, {
        signal,
        query: params(pageParam),
      }),
    getNextPageParam: (last) => last.data.next ?? undefined,
  });
  const status = useMutation({
    mutationFn: ({
      id,
      next,
    }: {
      id: string;
      next: "accepted" | "declined" | "withdrawn";
    }) =>
      api(`rental-bookings/${scope}/${id}`, bookingResult, {
        method: "PATCH",
        body: { status: next },
      }),
    onSettled: async () => client.invalidateQueries({ queryKey: key }),
  });
  const [mountedAt] = useState(() => Date.now());
  const now = Math.max(mountedAt, query.dataUpdatedAt);
  const openCheckout = useMutation({
    mutationFn: (id: string) =>
      api(`rental-bookings/mine/${id}/checkout`, checkout, { method: "POST" }),
    onSuccess: (response) => window.location.assign(response.data.url),
    onSettled: async () => client.invalidateQueries({ queryKey: key }),
  });
  const visibleData = isAccessError(query.error) ? undefined : query.data;
  const rows = visibleData?.pages.flatMap(({ data }) => data.bookings) ?? [];
  const payments = visibleData?.pages[0]?.data.paymentsEnabled;
  return (
    <section
      aria-labelledby="rentals-heading"
      className="module-section activity-section"
    >
      <div className="module-heading">
        <h2 id="rentals-heading">
          <KeyRound size={21} />
          {incoming
            ? t("Incoming rental requests", "प्राप्त किराया अनुरोध")
            : t("Rental requests", "किराये के अनुरोध")}
        </h2>
        {query.data && (
          <button
            className="text-button"
            type="button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching
              ? t("Refreshing…", "अपडेट हो रहा है…")
              : t("Refresh", "अपडेट करें")}
          </button>
        )}
      </div>
      {query.isPending && (
        <div
          className="skeleton skeleton-heading"
          role="status"
          aria-label={t("Loading rental requests", "किराया अनुरोध लोड हो रहे हैं")}
        />
      )}
      {query.error && (
        <Failure error={query.error} retry={() => void query.refetch()} />
      )}
      {query.isSuccess && rows.length === 0 && (
        <Empty
          title={t("No rental requests yet", "अभी कोई किराया अनुरोध नहीं है")}
        >
          {incoming
            ? t(
                "New requests for your listings will appear here.",
                "आपकी लिस्टिंग के नए अनुरोध यहाँ दिखेंगे।",
              )
            : t(
                "Your rental requests will appear here after you send them.",
                "आपके किराये के अनुरोध भेजने के बाद यहाँ दिखेंगे।",
              )}
        </Empty>
      )}
      {rows.length > 0 && (
        <ul className="record-list">
          {rows.map((booking) => {
            const pending = booking.payment?.state === "pending";
            const paid = booking.payment?.state === "paid";
            const expired = Boolean(
              booking.payment?.expiresAt &&
              Date.parse(booking.payment.expiresAt) <= now,
            );
            const withdraw =
              !incoming &&
              !pending &&
              !paid &&
              (booking.status === "requested" || booking.status === "accepted");
            const canPay =
              !incoming &&
              payments &&
              booking.status === "accepted" &&
              booking.bookingAmountPaise >= 100 &&
              !expired &&
              (!booking.payment?.state || pending);
            const propertyName =
              booking.listingTitle || t("Rental property", "किराये की संपत्ति");
            const amount = paiseAsRupees(booking.bookingAmountPaise);
            return (
              <li className="record" key={booking._id}>
                <div>
                  <Link
                    href={`/property/${booking.property}`}
                    className="record-link"
                  >
                    {propertyName}
                  </Link>
                  <p className="muted">
                    {t("Move-in", "शिफ़्ट होने की तारीख")}{" "}
                    {dateOnly(booking.moveInDate)}
                  </p>
                  {booking.bookingAmountPaise > 0 && (
                    <p className="muted">
                      {t("Booking amount", "बुकिंग राशि")} {amount}
                      {booking.payment?.state &&
                        ` · ${label(booking.payment.state)}`}
                    </p>
                  )}
                  {incoming && booking.message && (
                    <p className="muted">{booking.message}</p>
                  )}
                </div>
                <div className="record-actions">
                  <span className="status-pill">{label(booking.status)}</span>
                  {canPay && (
                    <ConfirmedAction
                      title={
                        pending
                          ? t("Continue to checkout", "चेकआउट पर जाएँ")
                          : t("Pay booking amount", "बुकिंग राशि का भुगतान करें")
                      }
                      description={`${propertyName} · ${amount} · Razorpay`}
                      trigger={
                        <button type="button" className="button button-primary">
                          <CreditCard size={16} />
                          {pending
                            ? t("Continue checkout", "चेकआउट जारी रखें")
                            : t("Pay", "भुगतान करें")}
                        </button>
                      }
                      action={() => openCheckout.mutateAsync(booking._id)}
                    />
                  )}
                  {withdraw && (
                    <ConfirmedAction
                      title={t("Withdraw request", "अनुरोध वापस लें")}
                      description={t(
                        "This will close your rental request for the selected date.",
                        "इससे चुनी गई तारीख का किराया अनुरोध बंद होगा।",
                      )}
                      trigger={
                        <button type="button" className="button button-outline">
                          {t("Withdraw", "वापस लें")}
                        </button>
                      }
                      action={() =>
                        status.mutateAsync({
                          id: booking._id,
                          next: "withdrawn",
                        })
                      }
                    />
                  )}
                  {incoming && booking.status === "requested" && (
                    <>
                      {(["accepted", "declined"] as const).map((next) => {
                        const title =
                          next === "accepted"
                            ? t("Accept request", "अनुरोध स्वीकार करें")
                            : t("Decline request", "अनुरोध अस्वीकार करें");
                        return (
                          <ConfirmedAction
                            key={next}
                            title={title}
                            description={`${propertyName} · ${dateOnly(booking.moveInDate)}`}
                            trigger={
                              <button
                                type="button"
                                className={
                                  next === "accepted"
                                    ? "button button-primary"
                                    : "button button-outline"
                                }
                              >
                                {title}
                              </button>
                            }
                            action={() =>
                              status.mutateAsync({ id: booking._id, next })
                            }
                          />
                        );
                      })}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {visibleData && query.hasNextPage && (
        <button
          type="button"
          className="button button-outline load-more"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage
            ? t("Loading…", "लोड हो रहा है…")
            : t("Load more requests", "और अनुरोध देखें")}
        </button>
      )}
    </section>
  );
}

export function VisitActivity({ userId }: { userId: string }) {
  const t = useCopy();
  const client = useQueryClient();
  const key = ["private", "visits", userId] as const;
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api("visit/my", visits, { signal }),
  });
  const cancel = useMutation({
    mutationFn: (id: string) =>
      api(`visit/my/${id}/cancel`, visitResult, { method: "PUT" }),
    onSettled: async () => client.invalidateQueries({ queryKey: key }),
  });
  const visibleData = isAccessError(query.error) ? undefined : query.data;
  return (
    <section
      className="module-section activity-section"
      aria-labelledby="visits-heading"
    >
      <div className="module-heading">
        <h2 id="visits-heading">
          <CalendarDays size={21} />
          {t("Property visits", "संपत्ति विज़िट")}
        </h2>
        {query.data && (
          <button
            className="text-button"
            type="button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching
              ? t("Refreshing…", "अपडेट हो रहा है…")
              : t("Refresh", "अपडेट करें")}
          </button>
        )}
      </div>
      {query.isPending && (
        <div
          className="skeleton skeleton-heading"
          role="status"
          aria-label={t("Loading visits", "विज़िट लोड हो रही हैं")}
        />
      )}
      {query.error && (
        <Failure error={query.error} retry={() => void query.refetch()} />
      )}
      {visibleData?.data.visits.length === 0 && (
        <Empty title={t("No visits requested", "अभी कोई विज़िट नहीं है")}>
          {t(
            "Request a visit from a property page.",
            "संपत्ति पेज से विज़िट का अनुरोध करें।",
          )}
        </Empty>
      )}
      {visibleData && visibleData.data.visits.length > 0 && (
        <ul className="record-list">
          {visibleData.data.visits.map((visit) => {
            const item =
              visit.property && typeof visit.property === "object"
                ? visit.property
                : undefined;
            return (
              <li className="record" key={visit._id}>
                <div>
                  {item ? (
                    <Link
                      href={`/property/${item._id}`}
                      className="record-link"
                    >
                      {item.title ||
                        item.name ||
                        t("Rental property", "किराये की संपत्ति")}
                    </Link>
                  ) : (
                    <strong>{t("Property visit", "संपत्ति विज़िट")}</strong>
                  )}
                  <p className="muted">
                    {dateOnly(visit.scheduledDate)} · {visit.scheduledTime} IST
                  </p>
                  {visit.ownerNote && (
                    <p className="muted">{visit.ownerNote}</p>
                  )}
                </div>
                <div className="record-actions">
                  <span className="status-pill">{label(visit.status)}</span>
                  {(visit.status === "pending" ||
                    visit.status === "confirmed") && (
                    <ConfirmedAction
                      title={t("Cancel visit", "विज़िट रद्द करें")}
                      description={t(
                        "This will cancel your visit request for the selected date and time.",
                        "चुनी गई तारीख और समय की विज़िट रद्द होगी।",
                      )}
                      trigger={
                        <button type="button" className="button button-outline">
                          {t("Cancel visit", "विज़िट रद्द करें")}
                        </button>
                      }
                      action={() => cancel.mutateAsync(visit._id)}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
