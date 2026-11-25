import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { Copy } from "@/src/components/preferences";
import { SavedProperties, SavedSearches } from "@/src/features/account/saved";
import { searchFilters } from "@/src/domain/search";

export const metadata: Metadata = {
  title: "Saved",
  robots: { index: false, follow: false },
};

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { page } = searchFilters(await searchParams);
  return (
    <>
      <section className="subhero">
        <div className="shell">
          <p className="eyebrow">
            <Heart size={16} />
            <Copy hi="आपकी सूची">Your shortlist</Copy>
          </p>
          <h1>
            <Copy hi="सहेजे गए आवास">Saved properties</Copy>
          </h1>
        </div>
      </section>
      <div className="shell page-section">
        <SavedProperties page={page ?? 1} />
        <SavedSearches />
      </div>
    </>
  );
}
