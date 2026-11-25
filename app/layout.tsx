import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { siteURL } from "@/src/api/config";
import { BottomNav, Footer, Header } from "@/src/components/navigation";
import { Providers } from "@/src/components/providers";
import "./globals.css";
import "./discovery.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});
const base = siteURL();
export const metadata: Metadata = {
  metadataBase: base,
  title: {
    default: "PGinfo | Find PGs, flats and rentals in India",
    template: "%s | PGinfo",
  },
  description:
    "Explore paying guest accommodation, co-living spaces, flats and commercial rentals. Compare places, save your shortlist and request a visit.",
  applicationName: "PGinfo",
  icons: { icon: "/icon.png", apple: "/icon.png" },
  openGraph: { siteName: "PGinfo", type: "website", locale: "en_IN" },
  robots: base ? undefined : { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={geist.variable} suppressHydrationWarning>
      <body>
        <Providers>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
