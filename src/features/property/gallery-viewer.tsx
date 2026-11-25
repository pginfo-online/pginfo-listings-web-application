"use client";

import { animate } from "motion/mini";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { SmartImage } from "@/src/components/smart-image";
import { useCopy } from "@/src/components/preferences";
import type { GalleryPhoto } from "./gallery";

const groups = [
  { key: "all", name: "All photos", hi: "सभी फ़ोटो" },
  { key: "cover", name: "Cover", hi: "कवर" },
  {
    key: "rooms",
    name: "Rooms",
    hi: "कमरे",
    matches: /\b(bedroom|room|bed|suite)\b/i,
  },
  {
    key: "amenities",
    name: "Amenities",
    hi: "सुविधाएँ",
    matches: /\b(gym|kitchen|laundry|parking|pool|bathroom|amenities)\b/i,
  },
  {
    key: "shared",
    name: "Shared spaces",
    hi: "साझा जगहें",
    matches: /\b(lounge|terrace|community|common|lobby|courtyard)\b/i,
  },
] as const;
type Group = (typeof groups)[number]["key"];

export function GalleryViewer({
  photos,
  title,
}: {
  photos: GalleryPhoto[];
  title: string;
}) {
  const t = useCopy();
  const [active, setActive] = useState<Group>("all");
  const [selected, setSelected] = useState(0);
  const slide = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const entries = photos.map((photo, index) => ({ ...photo, index }));
  const tabs = groups
    .map((group) => ({
      ...group,
      photos:
        group.key === "all"
          ? entries
          : group.key === "cover"
            ? entries.slice(0, 1)
            : entries.filter(({ caption }) => group.matches.test(caption)),
    }))
    .filter((group) => group.photos.length);
  const photosInGroup =
    tabs.find(({ key }) => key === active)?.photos ?? entries;
  const position = Math.max(
    0,
    photosInGroup.findIndex(({ index }) => index === selected),
  );
  const current = photosInGroup[position];
  const count = photosInGroup.length;
  const at = (shift: number) =>
    photosInGroup[(position + shift + count) % count];

  function step(offset: number) {
    if (count > 1) setSelected(at(offset).index);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        (event.key !== "ArrowRight" && event.key !== "ArrowLeft")
      )
        return;
      if (count < 2) return;
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      setSelected(photosInGroup[(position + step + count) % count].index);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [photosInGroup, position, count]);

  useEffect(() => {
    strip.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (
      !slide.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !Element.prototype.animate
    )
      return;
    const controls = animate(
      slide.current,
      { opacity: [0.72, 1], transform: ["scale(0.988)", "scale(1)"] },
      { duration: 0.24, ease: "easeOut" },
    );
    return () => controls.stop();
  }, [selected, active]);

  const placeholder = <ImageOff size={34} />;
  const photoLabel = (index: number) =>
    t(`Photo ${index + 1}`, `फ़ोटो ${index + 1}`);
  return (
    <div className="viewer-body">
      {tabs.length > 1 && (
        <div
          className="viewer-tabs"
          role="group"
          aria-label={t("Photo groups", "फ़ोटो समूह")}
        >
          {tabs.map((group) => (
            <button
              key={group.key}
              type="button"
              aria-pressed={active === group.key}
              onClick={() => {
                setActive(group.key);
                if (!group.photos.some(({ index }) => index === selected))
                  setSelected(group.photos[0].index);
              }}
            >
              {t(group.name, group.hi)}
            </button>
          ))}
        </div>
      )}
      <div
        className="viewer-stage"
        onTouchStart={(event) => {
          const point = event.touches[0];
          if (point) touch.current = { x: point.clientX, y: point.clientY };
        }}
        onTouchCancel={() => {
          touch.current = null;
        }}
        onTouchEnd={(event) => {
          const start = touch.current;
          const point = event.changedTouches[0];
          touch.current = null;
          if (!start || !point) return;
          const dx = point.clientX - start.x;
          const dy = point.clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy))
            step(dx < 0 ? 1 : -1);
        }}
      >
        {count > 2 && (
          <div
            className="viewer-preview viewer-preview-left"
            aria-hidden="true"
          >
            <SmartImage
              src={at(-1).src}
              alt=""
              sizes="18vw"
              fallback={placeholder}
            />
          </div>
        )}
        <div className="viewer-current" ref={slide}>
          <SmartImage
            src={current.src}
            alt={current.caption || `${title} · ${photoLabel(current.index)}`}
            sizes="(max-width: 800px) 95vw, 65vw"
            fallback={placeholder}
          />
        </div>
        {count > 1 && (
          <div
            className="viewer-preview viewer-preview-right"
            aria-hidden="true"
          >
            <SmartImage
              src={at(1).src}
              alt=""
              sizes="18vw"
              fallback={placeholder}
            />
          </div>
        )}
        {count > 1 && (
          <>
            <button
              className="viewer-button viewer-prev"
              type="button"
              onClick={() => step(-1)}
              aria-label={t("Previous photo", "पिछली फ़ोटो")}
            >
              <ChevronLeft size={25} />
            </button>
            <button
              className="viewer-button viewer-next"
              type="button"
              onClick={() => step(1)}
              aria-label={t("Next photo", "अगली फ़ोटो")}
            >
              <ChevronRight size={25} />
            </button>
          </>
        )}
      </div>
      <p className="viewer-caption" aria-live="polite">
        {position + 1} / {count}
        {current.caption && ` · ${current.caption}`}
      </p>
      {count > 1 && (
        <div
          ref={strip}
          className="viewer-thumbs"
          role="group"
          aria-label={t("Photo thumbnails", "फ़ोटो थंबनेल")}
        >
          {photosInGroup.map((photo) => (
            <button
              type="button"
              key={photo.index}
              aria-label={
                photo.caption
                  ? `${photoLabel(photo.index)} · ${photo.caption}`
                  : photoLabel(photo.index)
              }
              aria-current={photo.index === selected ? "true" : undefined}
              onClick={() => setSelected(photo.index)}
            >
              <SmartImage
                src={photo.src}
                alt=""
                sizes="100px"
                fallback={placeholder}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
