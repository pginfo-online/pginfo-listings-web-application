"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, UserRound } from "lucide-react";
import { useFeatures } from "@/src/api/features";
import { api } from "@/src/api/client";
import { ok } from "@/src/api/contracts";
import { useCopy, usePreferences } from "@/src/components/preferences";
import { Empty, Failure } from "@/src/components/ui";
import { RentalActivity, VisitActivity } from "./activity";
import { Inbox } from "./inbox";
import { notifySessionChanged, sessionKey, useSession } from "./session";

export function Account() {
  const t = useCopy();
  const user = useSession();
  const client = useQueryClient();
  const features = useFeatures(Boolean(user.data));
  const rentals = features.data?.rentals === "available";
  const [tab, setTab] = useState<"rentals" | "visits" | "incoming" | "inbox">(
    "rentals",
  );
  const { theme, locale, setTheme, setLocale } = usePreferences();
  const logout = useMutation({
    mutationFn: async () => {
      const request = () => api("auth/logout", ok, { method: "POST" });
      return navigator.locks
        ? navigator.locks.request("pginfo-session", request)
        : request();
    },
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: ["private"] });
      await client.cancelQueries({ queryKey: sessionKey });
      client.removeQueries({ queryKey: ["private"] });
      client.setQueryData(sessionKey, null);
      notifySessionChanged();
    },
  });
  const canHandleRequests =
    rentals &&
    user.data &&
    [user.data.role, ...(user.data.roles ?? [])].some(
      (role) => role === "owner" || role === "pg_owner" || role === "admin",
    );
  const activeTab =
    !rentals && (tab === "rentals" || tab === "incoming") ? "visits" : tab;
  return (
    <>
      {user.isPending && (
        <div
          className="skeleton skeleton-heading"
          role="status"
          aria-label={t("Checking session", "सत्र की जाँच")}
        />
      )}
      {user.error && (
        <Failure error={user.error} retry={() => void user.refetch()} />
      )}
      {user.data === null && (
        <Empty
          title={t(
            "Sign in to manage your requests",
            "अपने अनुरोध देखने के लिए साइन इन करें",
          )}
          action={
            <Link href="/sign-in" className="button button-primary">
              {t("Sign in", "साइन इन")}
            </Link>
          }
        >
          {t(
            "See visit requests, rental requests and notifications from your account.",
            "अपने खाते में विज़िट, किराये के अनुरोध और सूचनाएँ देखें।",
          )}
        </Empty>
      )}
      {user.data && (
        <>
          <div className="account-identity">
            <span className="section-symbol">
              <UserRound size={22} />
            </span>
            <div>
              <h2>{user.data.name || t("Your profile", "आपकी प्रोफ़ाइल")}</h2>
              {(user.data.email || user.data.phone) && (
                <p className="muted">{user.data.email || user.data.phone}</p>
              )}
            </div>
            <button
              className="button button-outline"
              disabled={logout.isPending}
              type="button"
              onClick={() => logout.mutate()}
            >
              <LogOut size={17} />
              {t("Sign out", "साइन आउट")}
            </button>
          </div>
          {logout.error && <Failure error={logout.error} />}
          <div
            className="module-controls"
            role="group"
            aria-label={t("Account sections", "खाते के अनुभाग")}
          >
            {rentals && (
              <button
                type="button"
                className="button button-outline"
                aria-pressed={activeTab === "rentals"}
                onClick={() => setTab("rentals")}
              >
                {t("My rentals", "मेरे किराये")}
              </button>
            )}
            <button
              type="button"
              className="button button-outline"
              aria-pressed={activeTab === "visits"}
              onClick={() => setTab("visits")}
            >
              {t("My visits", "मेरी विज़िट")}
            </button>
            {canHandleRequests && (
              <button
                type="button"
                className="button button-outline"
                aria-pressed={activeTab === "incoming"}
                onClick={() => setTab("incoming")}
              >
                {t("Incoming requests", "प्राप्त अनुरोध")}
              </button>
            )}
            <button
              type="button"
              className="button button-outline"
              aria-pressed={activeTab === "inbox"}
              onClick={() => setTab("inbox")}
            >
              {t("Notifications", "सूचनाएँ")}
            </button>
          </div>
          {activeTab === "visits" ? (
            <VisitActivity userId={user.data._id} />
          ) : activeTab === "inbox" ? (
            <Inbox userId={user.data._id} />
          ) : (
            <RentalActivity
              key={activeTab}
              userId={user.data._id}
              incoming={activeTab === "incoming" && Boolean(canHandleRequests)}
            />
          )}
        </>
      )}
      <section className="module-section" aria-labelledby="preferences-title">
        <h2 id="preferences-title">{t("Preferences", "पसंद")}</h2>
        <div className="preferences-grid">
          <label className="field">
            {t("Colour theme", "रंग थीम")}
            <select
              value={theme}
              onChange={(event) => {
                const v = event.currentTarget.value;
                setTheme(v === "light" || v === "dark" ? v : "system");
              }}
            >
              <option value="system">
                {t("Use device theme", "डिवाइस थीम इस्तेमाल करें")}
              </option>
              <option value="light">{t("Light", "हल्की")}</option>
              <option value="dark">{t("Dark", "गहरी")}</option>
            </select>
          </label>
          <label className="field">
            {t("Language", "भाषा")}
            <select
              value={locale}
              onChange={(event) =>
                setLocale(event.currentTarget.value === "hi" ? "hi" : "en")
              }
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
          </label>
        </div>
      </section>
    </>
  );
}
