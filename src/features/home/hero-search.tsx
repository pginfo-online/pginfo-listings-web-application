"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, Search } from "lucide-react";
import { useCopy } from "@/src/components/preferences";
import { searchHref } from "@/src/domain/search";
import { SearchDrawer } from "@/src/features/search/search-drawer";

export function HeroSearch() {
  const t = useCopy();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "pending" | "denied">("idle");
  function locate() {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }
    setStatus("pending");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setStatus("idle");
        router.push(
          searchHref({
            lat: Number(coords.latitude.toFixed(3)),
            lng: Number(coords.longitude.toFixed(3)),
            radius: 10,
            sort: "distance",
          }),
        );
      },
      () => setStatus("denied"),
      { timeout: 7000, maximumAge: 60_000 },
    );
  }
  return (
    <div className="landing-search">
      <div className="landing-search-bar">
        <SearchDrawer
          trigger={
            <button type="button" className="landing-search-open">
              <Search size={22} />
              <span>
                {t("Search by locality or property", "इलाके या संपत्ति से खोजें")}
              </span>
            </button>
          }
        />
        <button
          type="button"
          className="button button-primary landing-nearby"
          onClick={locate}
          disabled={status === "pending"}
        >
          <LocateFixed size={19} />
          {status === "pending"
            ? t("Locating…", "खोज रहे हैं…")
            : t("Near me", "मेरे आस-पास")}
        </button>
      </div>
      {status === "denied" && (
        <p role="status" className="field-error">
          {t(
            "We couldn’t get your location. Search by city instead.",
            "लोकेशन नहीं मिली। शहर से खोजें।",
          )}
        </p>
      )}
    </div>
  );
}
