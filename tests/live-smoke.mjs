// Read-only browser and navigation measurements against a configured application.
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const web = new URL(process.env.PGINFO_WEB_URL || "http://127.0.0.1:3102");
const browser = await chromium.launch();
const reports = [];

try {
  for (const width of [1440, 390]) {
    for (const route of ["/", "/explore?city=Bengaluru"]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.name));
      await page.addInitScript(() => {
        window.pginfoVitals = { lcp: 0, shifts: [] };
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            window.pginfoVitals.lcp = entry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            if (!entry.hadRecentInput)
              window.pginfoVitals.shifts.push({
                value: entry.value,
                startTime: entry.startTime,
              });
        }).observe({ type: "layout-shift", buffered: true });
      });
      const response = await page.goto(new URL(route, web).href, {
        waitUntil: "networkidle",
      });
      assert.equal(response?.status(), 200);
      const card = page.locator(".property-card").first();
      await card.waitFor();
      await page
        .locator(".listing-picture img")
        .first()
        .evaluate((img) => (img.loading = "eager"));
      await page.waitForFunction(
        () => document.querySelector(".listing-picture img")?.naturalWidth > 0,
      );
      const measurements = await page.evaluate(() => {
        const resources = performance.getEntriesByType("resource");
        const nav = performance.getEntriesByType("navigation")[0];
        const js = resources.filter(
          ({ name }) =>
            name.includes("/_next/static/") &&
            new URL(name).pathname.endsWith(".js"),
        );
        const { lcp, shifts } = window.pginfoVitals;
        let cls = 0;
        let windowScore = 0;
        let start = -Infinity;
        let previous = -Infinity;
        for (const { value, startTime } of shifts) {
          if (startTime - previous >= 1000 || startTime - start >= 5000) {
            start = startTime;
            windowScore = 0;
          }
          previous = startTime;
          windowScore += value;
          cls = Math.max(cls, windowScore);
        }
        return {
          ttfbMs: Math.round(nav.responseStart),
          lcpMs: Math.round(lcp),
          cls: Number(cls.toFixed(3)),
          scriptTransferKiB: Math.round(
            js.reduce((total, entry) => total + entry.transferSize, 0) / 1024,
          ),
          scriptChunks: js.length,
          documentWidth: document.documentElement.scrollWidth,
        };
      });
      assert.equal(measurements.documentWidth, width);
      assert.deepEqual(errors, []);
      reports.push({ width, route, ...measurements });
      if (route.startsWith("/explore")) {
        const property = await card.locator("h3 a").getAttribute("href");
        assert.ok(property?.startsWith("/property/"));
        await page.goto(new URL(property, web).href);
        await page.getByRole("heading", { level: 1 }).waitFor();
        await page
          .getByRole("link", { name: "Sign in to request a visit" })
          .waitFor();
      }
      await page.close();
    }
  }
  for (const route of [
    "/api/data/cities?limit=6",
    "/api/data/areas?city=Bengaluru&limit=6",
    "/api/data/properties/suggestions?q=kor",
    "/api/data/meetups?limit=3",
    "/api/features",
  ]) {
    const response = await fetch(new URL(route, web));
    assert.equal(response.status, 200, route);
    const json = await response.json();
    assert.equal(json.success, true, route);
    if (route === "/api/features")
      console.log(JSON.stringify({ features: json.data }));
  }
  console.table(reports);
} finally {
  await browser.close();
}
