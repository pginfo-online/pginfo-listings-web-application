"use client";

import Link from "next/link";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Bookmark, ChevronRight, Trash2 } from "lucide-react";
import { api } from "@/src/api/client";
import { details, ok, savedSearches } from "@/src/api/contracts";
import { useFeatures } from "@/src/api/features";
import { ApiError, isAccessError } from "@/src/api/errors";
import { useCopy } from "@/src/components/preferences";
import { Empty, Failure } from "@/src/components/ui";
import { signInHref } from "@/src/domain/navigation";
import { searchHref } from "@/src/domain/search";
import { PropertyCard } from "../property/property-card";
import { useSaved } from "../property/saved-store";
import { ConfirmedAction } from "./confirmed-action";
import { useSession } from "./session";

const pageSize = 12;

export function SavedProperties({ page }: { page: number }) {
  const t = useCopy();
  const ids = useSaved((state) => state.ids);
  const remove = useSaved((state) => state.toggle);
  const totalPages = Math.max(1, Math.ceil(ids.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const displayed = ids.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const queries = useQueries({
    queries: displayed.map((id) => ({
      queryKey: ["property", id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        api(`properties/${id}`, details, { signal }),
      staleTime: 2 * 60_000,
    })),
  });
  if (!ids.length)
    return (
      <Empty
        title={t("Your shortlist is empty", "आपकी सूची खाली है")}
        action={
          <Link className="button button-primary" href="/explore">
            {t("Explore rentals", "किराये खोजें")}
          </Link>
        }
      >
        {t(
          "Tap the heart on any listing to save it on this device.",
          "किसी भी लिस्टिंग को इस डिवाइस पर सहेजने के लिए दिल पर टैप करें।",
        )}
      </Empty>
    );
  return (
    <>
      <p className="muted section-note">
        {t(
          "Your saved properties are stored on this device.",
          "सहेजी गई संपत्तियाँ इस डिवाइस पर रखी जाती हैं।",
        )}
      </p>
      <div className="card-grid">
        {queries.map((result, i) => {
          const id = displayed[i];
          if (result.data)
            return (
              <PropertyCard key={id} property={result.data.data.property} />
            );
          if (result.isPending)
            return (
              <div
                key={id}
                className="skeleton skeleton-card"
                role="status"
                aria-label={t(
                  "Loading saved property",
                  "सहेजी गई संपत्ति लोड हो रही है",
                )}
              />
            );
          return (
            <div key={id} className="saved-unavailable">
              <Failure
                error={result.error}
                retry={
                  result.error instanceof ApiError &&
                  result.error.status === 404
                    ? undefined
                    : () => void result.refetch()
                }
              />
              <button
                className="button button-outline"
                type="button"
                onClick={() => remove(id)}
              >
                {t("Remove from saved", "सूची से हटाएँ")}
              </button>
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <nav className="pagination" aria-label={t("Saved pages", "सहेजे गए पृष्ठ")}>
          {currentPage > 1 && (
            <Link
              className="button button-outline"
              href={`/saved?page=${currentPage - 1}`}
            >
              {t("Previous", "पिछला")}
            </Link>
          )}
          <span>
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              className="button button-outline"
              href={`/saved?page=${currentPage + 1}`}
            >
              {t("Next", "अगला")}
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

export function SavedSearches() {
  const t = useCopy();
  const client = useQueryClient();
  const user = useSession();
  const features = useFeatures();
  const searches = useQuery({
    queryKey: ["private", "saved-searches", user.data?._id],
    enabled: Boolean(user.data) && features.data?.savedSearches === "available",
    queryFn: ({ signal }) => api("saved-searches", savedSearches, { signal }),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      api(`saved-searches/${id}`, ok, { method: "DELETE" }),
    onSuccess: async () =>
      client.invalidateQueries({ queryKey: ["private", "saved-searches"] }),
  });
  const searchesData = isAccessError(searches.error)
    ? undefined
    : searches.data;
  if (features.data?.savedSearches !== "available") return null;
  return (
    <section className="module-section" aria-labelledby="saved-search-title">
      <h2 id="saved-search-title">
        <Bookmark size={22} />
        {t("Saved searches", "सहेजी गई खोजें")}
      </h2>
      {user.isPending && (
        <p role="status" className="muted">
          {t("Checking session…", "सत्र की जाँच हो रही है…")}
        </p>
      )}
      {user.error && (
        <Failure error={user.error} retry={() => void user.refetch()} />
      )}
      {user.data === null && (
        <div className="inline-status">
          <p>
            {t(
              "Sign in to reopen searches across devices.",
              "दूसरे डिवाइस पर अपनी खोजें खोलने के लिए साइन इन करें।",
            )}
          </p>
          <Link href={signInHref("/saved")} className="button button-outline">
            {t("Sign in", "साइन इन")}
          </Link>
        </div>
      )}
      {user.data && searches.isPending && (
        <p role="status" className="muted">
          {t("Loading searches…", "खोजें लोड हो रही हैं…")}
        </p>
      )}
      {searches.error && (
        <Failure error={searches.error} retry={() => void searches.refetch()} />
      )}
      {searchesData?.data.searches.length === 0 && (
        <Empty title={t("No saved searches yet", "अभी कोई खोज सहेजी नहीं गई")}>
          {t(
            "Choose a city, apply your filters, then select Save search.",
            "शहर चुनें, फ़िल्टर लगाएँ और खोज सहेजें।",
          )}
        </Empty>
      )}
      {searchesData && searchesData.data.searches.length > 0 && (
        <ul className="record-list">
          {searchesData.data.searches.map((search) => (
            <li key={search._id} className="record">
              <Link className="record-link" href={searchHref(search.filters)}>
                <span>{search.label}</span>
                <ChevronRight size={16} />
              </Link>
              <ConfirmedAction
                title={t("Remove saved search", "सहेजी गई खोज हटाएँ")}
                description={search.label}
                trigger={
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t("Remove", "हटाएँ") + ` ${search.label}`}
                  >
                    <Trash2 size={17} />
                  </button>
                }
                action={() => remove.mutateAsync(search._id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
