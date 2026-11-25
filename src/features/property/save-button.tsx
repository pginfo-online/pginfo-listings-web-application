"use client";

import { Heart } from "lucide-react";
import { useCopy } from "@/src/components/preferences";
import { useSaved } from "./saved-store";

export function SaveButton({
  id,
  title,
  showLabel = false,
}: {
  id: string;
  title: string;
  showLabel?: boolean;
}) {
  const t = useCopy();
  const saved = useSaved((state) => state.ids.includes(id));
  const toggle = useSaved((state) => state.toggle);
  const action = saved
    ? t("Remove from saved", "सहेजी गई सूची से हटाएँ")
    : t("Save", "सहेजें");
  return (
    <button
      type="button"
      className={showLabel ? "button button-outline" : "save-button"}
      aria-label={`${action} · ${title}`}
      aria-pressed={saved}
      onClick={() => toggle(id)}
    >
      <Heart size={19} fill={saved ? "currentColor" : "none"} />
      {showLabel && action}
    </button>
  );
}
