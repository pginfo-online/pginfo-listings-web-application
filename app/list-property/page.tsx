import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { Copy } from "@/src/components/preferences";
import { OwnerListing } from "@/src/features/owner/owner-listing";

export const metadata: Metadata = {
  title: "List your property",
  robots: { index: false, follow: false },
};

export default function ListProperty() {
  return (
    <>
      <section className="subhero">
        <div className="shell">
          <p className="eyebrow">
            <Building2 size={17} />
            <Copy hi="संपत्ति मालिकों के लिए">For property owners</Copy>
          </p>
          <h1>
            <Copy hi="अपनी संपत्ति सूचीबद्ध करें">List your property</Copy>
          </h1>
          <p>
            <Copy hi="लोगों को अपना पीजी, फ़्लैट या व्यावसायिक जगह खोजने में मदद करें।">
              Help people find your PG, flat or commercial space.
            </Copy>
          </p>
        </div>
      </section>
      <div className="shell page-section">
        <OwnerListing />
      </div>
    </>
  );
}
