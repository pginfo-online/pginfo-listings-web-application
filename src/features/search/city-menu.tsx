"use client";

import * as Popover from "@radix-ui/react-popover";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/src/api/client";
import { cities } from "@/src/api/contracts";
import { useCopy } from "@/src/components/preferences";
import { Failure } from "@/src/components/ui";
import { params } from "@/src/domain/search";
import { useDebounced } from "./use-debounced";

export function CityMenu({
  city,
  onCity,
  withinDialog = false,
}: {
  city: string;
  onCity: (name: string) => void;
  withinDialog?: boolean;
}) {
  const t = useCopy();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [page, setPage] = useState(1);
  const term = useDebounced(input.trim());
  const query = useQuery({
    queryKey: ["city-menu", term, page],
    queryFn: ({ signal }) =>
      api("cities", cities, {
        signal,
        query: params({ q: term, limit: 10, page }),
      }),
    enabled: open && input.trim() === term,
    staleTime: 5 * 60_000,
  });
  const name = city || t("Choose a city", "शहर चुनें");
  const pageCount = query.data?.data.pagination.totalPages ?? 1;

  const content = (
    <Popover.Content
      aria-label={t("City selection", "शहर का चयन")}
      side="bottom"
      sideOffset={9}
      align="start"
      collisionPadding={12}
      className="city-popover"
    >
      <label className="city-search">
        <Search size={17} />
        <span className="sr-only">{t("Search cities", "शहर खोजें")}</span>
        <input
          type="search"
          value={input}
          maxLength={100}
          onChange={(event) => {
            setInput(event.currentTarget.value);
            setPage(1);
          }}
          placeholder={t("Search cities", "शहर खोजें")}
        />
      </label>
      <div className="city-menu-items">
        <button
          type="button"
          aria-pressed={!city}
          onClick={() => {
            onCity("");
            setOpen(false);
          }}
        >
          {t("All cities", "सभी शहर")}
        </button>
        {query.isPending && (
          <p role="status">{t("Loading cities…", "शहर लोड हो रहे हैं…")}</p>
        )}
        {query.error && (
          <Failure error={query.error} retry={() => void query.refetch()} />
        )}
        {query.data && query.data.data.cities.length === 0 && (
          <p role="status">{t("No cities found", "कोई शहर नहीं मिला")}</p>
        )}
        {query.data?.data.cities.map((item) => (
          <button
            key={item._id}
            type="button"
            aria-pressed={city === item.name}
            onClick={() => {
              onCity(item.name);
              setOpen(false);
            }}
          >
            {item.name}
            {item.state && <small>{item.state}</small>}
          </button>
        ))}
      </div>
      {pageCount > 1 && (
        <div className="city-menu-pages">
          <button
            type="button"
            className="icon-btn"
            aria-label={t("Previous cities", "पिछले शहर")}
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            {page} / {pageCount}
          </span>
          <button
            type="button"
            className="icon-btn"
            aria-label={t("Next cities", "अगले शहर")}
            disabled={page >= pageCount}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </Popover.Content>
  );
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="nav-city"
        aria-label={city ? `${t("Choose a city", "शहर चुनें")} · ${city}` : name}
      >
        <MapPin size={17} />
        <span>{name}</span>
        <ChevronDown size={14} />
      </Popover.Trigger>
      {withinDialog ? content : <Popover.Portal>{content}</Popover.Portal>}
    </Popover.Root>
  );
}
