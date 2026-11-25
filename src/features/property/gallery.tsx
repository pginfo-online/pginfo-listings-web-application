"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { House, Images, X } from "lucide-react";
import dynamic from "next/dynamic";
import { SmartImage } from "@/src/components/smart-image";
import { useCopy } from "@/src/components/preferences";

export type GalleryPhoto = { src: string; caption: string };
const GalleryViewer = dynamic(() =>
  import("./gallery-viewer").then(({ GalleryViewer }) => GalleryViewer),
);

export function Gallery({
  photos,
  title,
}: {
  photos: GalleryPhoto[];
  title: string;
}) {
  const t = useCopy();
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div className="gallery">
        <div
          className={
            photos.length > 1 ? "gallery-grid" : "gallery-grid gallery-single"
          }
        >
          <div className="gallery-image gallery-main">
            <SmartImage
              src={photos[0]?.src}
              alt={photos[0]?.caption || title}
              sizes="(max-width: 760px) 94vw, 70vw"
              priority
              fallback={<House size={45} />}
            />
          </div>
          {photos.slice(1, 3).map((photo, i) => (
            <div
              className="gallery-image gallery-secondary"
              key={photo.src + i}
            >
              <SmartImage
                src={photo.src}
                alt={
                  photo.caption || `${title} · ${t("Photo", "फ़ोटो")} ${i + 2}`
                }
                sizes="(max-width: 760px) 1px, 32vw"
                fallback={<House size={30} />}
              />
            </div>
          ))}
        </div>
        {photos.length > 0 && (
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="button button-outline gallery-trigger"
            >
              <Images size={18} />
              {t("View photos", "फ़ोटो देखें")} ({photos.length})
            </button>
          </Dialog.Trigger>
        )}
      </div>
      {photos.length > 0 && (
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay viewer-overlay" />
          <Dialog.Content className="photo-viewer">
            <header className="photo-viewer-heading">
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description className="sr-only">
                {t(
                  "Property photos. Use left and right arrow keys to browse.",
                  "संपत्ति की फ़ोटो। ब्राउज़ करने के लिए तीर कुंजियाँ इस्तेमाल करें।",
                )}
              </Dialog.Description>
              <Dialog.Close
                className="viewer-button"
                aria-label={t("Close photos", "फ़ोटो बंद करें")}
              >
                <X size={22} />
              </Dialog.Close>
            </header>
            <GalleryViewer photos={photos} title={title} />
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
}
