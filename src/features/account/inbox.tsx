"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/src/api/client";
import { notifications, ok } from "@/src/api/contracts";
import { isAccessError } from "@/src/api/errors";
import { useCopy } from "@/src/components/preferences";
import { Empty, Failure } from "@/src/components/ui";
import { instant } from "@/src/domain/display";
import { params } from "@/src/domain/search";

export function Inbox({ userId }: { userId: string }) {
  const t = useCopy();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["private", "inbox", userId, page],
    queryFn: ({ signal }) =>
      api("notifications", notifications, {
        signal,
        query: params({ page, limit: 20 }),
      }),
  });
  const mark = useMutation({
    mutationFn: (id?: string) =>
      api(id ? `notifications/${id}/read` : "notifications/read-all", ok, {
        method: "PUT",
      }),
    onSuccess: async () =>
      client.invalidateQueries({ queryKey: ["private", "inbox", userId] }),
  });
  const data = isAccessError(query.error) ? undefined : query.data;
  return (
    <section className="module-section activity-section">
      <div className="module-heading">
        <h2>
          <Bell size={21} />
          {t("Notifications", "सूचनाएँ")}
        </h2>
        {Boolean(data?.pagination.unreadCount) && (
          <button
            type="button"
            className="button button-outline"
            disabled={mark.isPending}
            onClick={() => mark.mutate(undefined)}
          >
            <CheckCheck size={17} />
            {t("Mark all read", "सभी पढ़े गए चिह्नित करें")}
          </button>
        )}
      </div>
      {query.isPending && (
        <div
          className="skeleton skeleton-heading"
          role="status"
          aria-label={t("Loading notifications", "सूचनाएँ लोड हो रही हैं")}
        />
      )}
      {query.error && (
        <Failure error={query.error} retry={() => void query.refetch()} />
      )}
      {mark.error && <Failure error={mark.error} />}
      {data?.data.length === 0 && (
        <Empty title={t("You’re all caught up", "कोई नई सूचना नहीं है")}>
          {t(
            "Updates, including saved search matches when enabled, will appear here.",
            "सहेजी गई खोजों से मिले परिणाम समेत अपडेट यहाँ दिखेंगे।",
          )}
        </Empty>
      )}
      {data && data.data.length > 0 && (
        <ul className="record-list">
          {data.data.map((item) => (
            <li key={item._id} className="record">
              <div>
                {item.title && <strong>{item.title}</strong>}
                {item.body && <p className="muted">{item.body}</p>}
                {item.createdAt && (
                  <small className="muted">{instant(item.createdAt)} IST</small>
                )}
                {item.data?.entityType === "property" && item.data.entityId && (
                  <p>
                    <Link
                      href={`/property/${item.data.entityId}`}
                      className="text-button"
                    >
                      {t("View property", "संपत्ति देखें")}
                    </Link>
                  </p>
                )}
              </div>
              {!item.isRead && (
                <button
                  type="button"
                  className="button button-outline"
                  disabled={mark.isPending}
                  onClick={() => mark.mutate(item._id)}
                >
                  {t("Mark read", "पढ़ा गया चिह्नित करें")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {data && data.pagination.pages > 1 && (
        <nav
          className="pagination"
          aria-label={t("Notification pages", "सूचना पृष्ठ")}
        >
          <button
            type="button"
            className="button button-outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            {t("Previous", "पिछला")}
          </button>
          <span>
            {page} / {data.pagination.pages}
          </span>
          <button
            type="button"
            className="button button-outline"
            disabled={page >= data.pagination.pages}
            onClick={() => setPage(page + 1)}
          >
            {t("Next", "अगला")}
          </button>
        </nav>
      )}
    </section>
  );
}
