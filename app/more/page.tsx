import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { Copy } from "@/src/components/preferences";
import { Account } from "@/src/features/account/account";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default function MorePage() {
  return (
    <>
      <section className="subhero">
        <div className="shell">
          <p className="eyebrow">
            <UserRound size={16} />
            <Copy hi="मेरी गतिविधि">My activity</Copy>
          </p>
          <h1>
            <Copy hi="आपका खाता">Your account</Copy>
          </h1>
        </div>
      </section>
      <div className="shell page-section">
        <Account />
      </div>
    </>
  );
}
