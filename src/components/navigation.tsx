"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Compass,
  Heart,
  House,
  Languages,
  LayoutGrid,
  Moon,
  Search,
  Sun,
  UsersRound,
  UserRound,
} from "lucide-react";
import { useCopy, usePreferences } from "./preferences";
import { SearchDrawer } from "@/src/features/search/search-drawer";
import { CityMenu } from "@/src/features/search/city-menu";
import { SignInDrawer } from "@/src/features/account/sign-in-drawer";
import { useSession } from "@/src/features/account/session";
import { searchFilters, searchHref } from "@/src/domain/search";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="PGinfo home">
      <Image
        src="/icon.png"
        width={43}
        height={43}
        alt=""
        className="brand-image"
      />
      <span>
        PG<span className="brand-accent">info</span>
      </span>
    </Link>
  );
}

const links = [
  { href: "/", name: "Home", hi: "होम", icon: House },
  { href: "/explore", name: "Explore", hi: "खोजें", icon: Compass },
  { href: "/saved", name: "Saved", hi: "सहेजे गए", icon: Heart },
  { href: "/meetups", name: "Meetups", hi: "मिलन", icon: UsersRound },
  { href: "/more", name: "More", hi: "अधिक", icon: LayoutGrid },
];

export function Header() {
  const t = useCopy();
  const path = usePathname();
  const { theme, locale, setTheme, setLocale, city, setCity } =
    usePreferences();
  const router = useRouter();
  const session = useSession();
  function chooseCity(name: string) {
    setCity(name);
    if (path === "/explore") {
      const previous = searchFilters(
        Object.fromEntries(new URLSearchParams(window.location.search)),
      );
      router.push(
        searchHref({
          ...previous,
          city: name,
          cityId: undefined,
          area: undefined,
          areaId: undefined,
          areas: undefined,
          areaIds: undefined,
          lat: undefined,
          lng: undefined,
          radius: undefined,
          sort: previous.sort === "distance" ? undefined : previous.sort,
          page: undefined,
        }),
      );
    }
  }
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Brand />
        <div className="nav-discovery">
          <CityMenu city={city} onCity={chooseCity} />
          <SearchDrawer
            trigger={
              <button
                type="button"
                className="nav-search"
                aria-label={t("Search", "खोजें")}
              >
                <Search size={17} />
                <span>{t("Search", "खोजें")}</span>
              </button>
            }
          />
        </div>
        <nav className="desktop-nav" aria-label={t("Primary", "मुख्य")}>
          {links.slice(1, 4).map(({ href, name, hi }) => {
            const active =
              path === href ||
              path.startsWith(href + "/") ||
              (href === "/explore" &&
                (path === "/" || path.startsWith("/property/")));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active && path !== "/" ? "page" : undefined}
                className={active ? "nav-active" : ""}
              >
                {t(name, hi)}
              </Link>
            );
          })}
        </nav>
        <div className="header-actions">
          <Link href="/list-property" className="nav-list-property">
            <Building2 size={17} />
            <span>{t("List your property", "संपत्ति सूचीबद्ध करें")}</span>
          </Link>
          <button
            className="icon-btn header-locale"
            type="button"
            aria-label={t("हिन्दी · Switch to Hindi", "English · अंग्रेज़ी में बदलें")}
            onClick={() => setLocale(locale === "en" ? "hi" : "en")}
          >
            <Languages size={17} />
            <span>{locale === "en" ? "हिन्दी" : "English"}</span>
          </button>
          <button
            className="icon-btn"
            type="button"
            aria-label={t("Toggle colour theme", "रंग थीम बदलें")}
            onClick={() =>
              setTheme(
                theme === "dark" ||
                  (theme === "system" &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches)
                  ? "light"
                  : "dark",
              )
            }
          >
            <Moon className="theme-moon" size={18} />
            <Sun className="theme-sun" size={18} />
          </button>
          {session.data ? (
            <Link className="button button-primary header-account" href="/more">
              <UserRound size={17} />
              {t("Account", "खाता")}
            </Link>
          ) : (
            <SignInDrawer
              trigger={
                <button
                  type="button"
                  className="button button-primary header-account"
                >
                  <UserRound size={17} />
                  {t("Sign in", "साइन इन")}
                </button>
              }
            />
          )}
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  const t = useCopy();
  return (
    <nav
      className="bottom-nav"
      aria-label={t("Mobile navigation", "मोबाइल नेविगेशन")}
    >
      {links
        .filter(({ href }) => href !== "/explore")
        .map(({ href, name, hi, icon: Icon }) => {
          const active =
            href === "/"
              ? path === "/" ||
                path.startsWith("/explore") ||
                path.startsWith("/property/")
              : path === href ||
                path.startsWith(href + "/") ||
                (href === "/more" && path === "/sign-in");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
            >
              <span>
                <Icon size={20} />
              </span>
              {t(name, hi)}
            </Link>
          );
        })}
    </nav>
  );
}

export function Footer() {
  const t = useCopy();
  return (
    <footer className="site-footer discovery-footer">
      <div className="shell footer-columns">
        <div className="footer-brand">
          <Brand />
          <p>
            {t(
              "Find PGs, flats and places to live across India.",
              "भारत भर में पीजी, फ़्लैट और रहने की जगहें खोजें।",
            )}
          </p>
        </div>
        <nav aria-label={t("Discover", "खोजें")}>
          <strong>{t("Discover", "खोजें")}</strong>
          <Link href="/explore?category=pg">
            {t("PG & co-living", "पीजी और को-लिविंग")}
          </Link>
          <Link href="/explore?category=residential_rental">
            {t("Flats for rent", "किराये के फ़्लैट")}
          </Link>
          <Link href="/explore?category=commercial">
            {t("Commercial spaces", "व्यावसायिक जगहें")}
          </Link>
        </nav>
        <nav aria-label={t("Your PGinfo", "आपका PGinfo")}>
          <strong>{t("Your PGinfo", "आपका PGinfo")}</strong>
          <Link href="/saved">{t("Saved properties", "सहेजी गई संपत्तियाँ")}</Link>
          <Link href="/meetups">{t("Meetups", "मिलन")}</Link>
          <Link href="/more">{t("Your account", "आपका खाता")}</Link>
        </nav>
        <nav aria-label={t("For owners", "मालिकों के लिए")}>
          <strong>{t("For owners", "मालिकों के लिए")}</strong>
          <Link href="/list-property">
            {t("List your property", "संपत्ति सूचीबद्ध करें")}
          </Link>
          <Link href="/list-property#my-listings">
            {t("My listings", "मेरी लिस्टिंग")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
