"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { Modal } from "@/src/components/dialog";
import { useCopy, usePreferences } from "@/src/components/preferences";
import type { Category } from "@/src/domain/search";

const SearchPanel = dynamic(
  () => import("./search-panel").then(({ SearchPanel }) => SearchPanel),
  {
    loading: () => (
      <div
        className="skeleton skeleton-card"
        aria-label="Loading search"
        role="status"
      />
    ),
  },
);

export function SearchDrawer({
  trigger,
  category,
}: {
  trigger: ReactNode;
  category?: Category;
}) {
  const t = useCopy();
  const city = usePreferences((state) => state.city);
  const [open, setOpen] = useState(false);
  return (
    <Modal
      title={
        city
          ? t(`Find your next place in ${city}`, `${city} में अपना अगला घर खोजें`)
          : t("Find your next place", "अपना अगला घर खोजें")
      }
      description={t(
        "Search by city, neighbourhood or property name.",
        "शहर, इलाका या संपत्ति के नाम से खोजें।",
      )}
      placement="left"
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
    >
      <SearchPanel
        initialCategory={category}
        onNavigate={() => setOpen(false)}
      />
    </Modal>
  );
}
