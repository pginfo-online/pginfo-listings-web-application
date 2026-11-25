import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import {
  BedDouble,
  Building2,
  CalendarDays,
  ChevronRight,
  Heart,
  House,
  MapPin,
  UsersRound,
} from "lucide-react";
import { siteURL } from "@/src/api/config";
import { Copy } from "@/src/components/preferences";
import { Skeletons } from "@/src/components/ui";
import { CityGrid, CityLoading, Featured } from "@/src/features/home/home-data";
import { HeroSearch } from "@/src/features/home/hero-search";

export const metadata: Metadata = {
  alternates: siteURL() ? { canonical: "/" } : undefined,
};

export default function Home() {
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="shell landing-hero-inner">
          <div className="landing-intro">
            <p className="landing-location">
              <MapPin size={17} />
              <Copy hi="भारत भर में घर खोजें">Find a place across India</Copy>
            </p>
            <h1>
              <Copy hi="अपनी जगह खोजें।">Find your space.</Copy>
              <br />
              <em>
                <Copy hi="घर जैसा महसूस करें।">Feel at home.</Copy>
              </em>
            </h1>
            <p className="landing-deck">
              <Copy hi="काम या कॉलेज के पास पीजी, साझा आवास और फ़्लैट देखें। अपने पसंदीदा विकल्प सहेजें और विज़िट की योजना बनाएँ।">
                Explore PGs, co-living spaces and flats near work or campus.
                Save the places you like and plan your next visit.
              </Copy>
            </p>
            <HeroSearch />
            <div className="landing-quick-links">
              <Link href="/explore?category=pg">
                <BedDouble size={18} />
                <Copy hi="पीजी और को-लिविंग">PG &amp; co-living</Copy>
              </Link>
              <Link href="/explore?category=residential_rental">
                <House size={18} />
                <Copy hi="फ़्लैट">Flats</Copy>
              </Link>
              <Link href="/explore?category=commercial">
                <Building2 size={18} />
                <Copy hi="व्यावसायिक">Commercial</Copy>
              </Link>
            </div>
          </div>
          <div className="landing-art">
            <div className="landing-art-backdrop" aria-hidden="true" />
            <div className="landing-art-photo">
              <Image
                src="/media/landing-shared-living.webp"
                alt="Two friends sharing coffee in a sunlit apartment"
                fill
                priority
                sizes="(max-width: 760px) 92vw, (max-width: 1400px) 43vw, 600px"
              />
            </div>
            <Link href="/explore?category=pg" className="landing-art-link">
              <span className="landing-art-icon">
                <BedDouble size={22} />
              </span>
              <span>
                <strong>
                  <Copy hi="साझा आवास खोजें">Find a shared stay</Copy>
                </strong>
                <small>
                  <Copy hi="पीजी और को-लिविंग">PGs &amp; co-living</Copy>
                </small>
              </span>
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>
      <section
        className="shell landing-section landing-cities"
        aria-labelledby="cities-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="cities-title">
              <Copy hi="लोकप्रिय शहर खोजें">Explore popular cities</Copy>
            </h2>
          </div>
          <Link href="/explore" className="text-button section-link">
            <Copy hi="सभी किराये देखें">Browse all rentals</Copy>
          </Link>
        </div>
        <Suspense fallback={<CityLoading />}>
          <CityGrid />
        </Suspense>
      </section>
      <section
        className="shell landing-section featured-section"
        aria-labelledby="featured-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="featured-title">
              <Copy hi="चुनिंदा आवास">Featured stays</Copy>
            </h2>
            <p>
              <Copy hi="पीजी और को-लिविंग आवास देखें।">
                Explore PG and co-living listings.
              </Copy>
            </p>
          </div>
          <Link
            href="/explore?category=pg"
            className="text-button section-link"
          >
            <Copy hi="सभी पीजी देखें">Explore all PGs</Copy>
          </Link>
        </div>
        <Suspense fallback={<Skeletons />}>
          <Featured />
        </Suspense>
      </section>
      <section
        className="shell landing-editorial"
        id="how-it-works"
        aria-label="Finding a place with PGinfo"
      >
        <div className="landing-story">
          <div className="story-visual story-sand">
            <Image
              src="/media/hero-light.webp"
              alt="Furnished bedroom with a study desk and a large window"
              fill
              sizes="(max-width: 760px) 90vw, 43vw"
            />
          </div>
          <div className="story-copy">
            <h2>
              <Copy hi="अपनी दिनचर्या के पास रहें।">
                Live closer to your <em>everyday.</em>
              </Copy>
            </h2>
            <p>
              <Copy hi="ऑफ़िस या कॉलेज के पास खोजें। बजट और आवास के प्रकार से विकल्प कम करें।">
                Search near work or campus, then narrow down the options by
                neighbourhood, budget and property type.
              </Copy>
            </p>
            <Link href="/explore" className="text-button">
              <MapPin size={17} />
              <Copy hi="इलाके खोजें">Explore neighbourhoods</Copy>
            </Link>
          </div>
        </div>
        <div className="landing-story story-reverse">
          <div className="story-visual story-rose">
            <Image
              src="/media/hero-room.webp"
              alt="Bedroom with a reading nook and desk in daylight"
              fill
              sizes="(max-width: 760px) 90vw, 43vw"
            />
          </div>
          <div className="story-copy">
            <h2>
              <Copy hi="शिफ़्ट होने से पहले देख लें।">
                Look around <em>before you move.</em>
              </Copy>
            </h2>
            <p>
              <Copy hi="फ़ोटो, कमरे और सुविधाएँ देखें। पसंदीदा घर सहेजें और तैयार होने पर विज़िट का अनुरोध करें।">
                Compare photos, rooms and amenities. Shortlist your favourites
                and request a visit when you’re ready.
              </Copy>
            </p>
            <div className="story-links">
              <Link href="/saved" className="text-button">
                <Heart size={17} />
                <Copy hi="सहेजे गए घर देखें">Open your shortlist</Copy>
              </Link>
              <Link href="/more" className="text-button">
                <CalendarDays size={17} />
                <Copy hi="विज़िट देखें">Manage visits</Copy>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section
        className="shell landing-section landing-community"
        aria-labelledby="community-title"
      >
        <div>
          <span className="landing-art-icon">
            <UsersRound size={24} />
          </span>
          <h2 id="community-title">
            <Copy hi="अपने नए शहर में लोगों से मिलें।">
              Meet people in your new city.
            </Copy>
          </h2>
          <p>
            <Copy hi="PGinfo पर स्थानीय कार्यक्रम और मुलाकातें खोजें।">
              Discover local gatherings and community events on PGinfo.
            </Copy>
          </p>
        </div>
        <Link href="/meetups" className="button button-primary">
          <Copy hi="मिलन देखें">Explore meetups</Copy>
        </Link>
      </section>
      <section className="shell landing-owner" aria-labelledby="owner-title">
        <div>
          <h2 id="owner-title">
            <Copy hi="किराये पर देने के लिए जगह है?">Have a place to rent?</Copy>
          </h2>
          <p>
            <Copy hi="विवरण और फ़ोटो जोड़ें और समीक्षा के लिए अपनी लिस्टिंग भेजें।">
              Add your details and photos, then submit your listing for review.
            </Copy>
          </p>
        </div>
        <Link href="/list-property" className="button button-outline">
          <Building2 size={18} />
          <Copy hi="संपत्ति सूचीबद्ध करें">List your property</Copy>
        </Link>
      </section>
    </div>
  );
}
