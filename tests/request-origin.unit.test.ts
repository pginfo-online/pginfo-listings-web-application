import { afterEach, describe, expect, it, vi } from "vitest";
import { originMismatchMessage, responseError } from "@/src/api/errors";
vi.mock("server-only", () => ({}));
import { siteURL } from "@/src/api/config";
import { requestSiteOrigin } from "@/src/api/request-origin";

afterEach(() => vi.unstubAllEnvs());

describe("request origin", () => {
  it("uses the stable Vercel production URL when SITE_URL is not set", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "pginfo.vercel.app");
    vi.stubEnv("VERCEL_URL", "pginfo-git-main.vercel.app");

    expect(siteURL()?.origin).toBe("https://pginfo.vercel.app");
  });

  it("uses the deployment URL for Vercel previews", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "pginfo.vercel.app");
    vi.stubEnv("VERCEL_URL", "pginfo-git-feature.vercel.app");

    expect(siteURL()?.origin).toBe("https://pginfo-git-feature.vercel.app");
  });

  it("prefers an explicitly configured origin", () => {
    vi.stubEnv("SITE_URL", "https://www.pginfo.business");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "pginfo.vercel.app");

    expect(siteURL()?.origin).toBe("https://www.pginfo.business");
  });

  it("uses the current loopback address in development even with a configured origin", () => {
    const configured = new URL("https://www.example.invalid");
    expect(requestSiteOrigin(configured, "localhost:3000", true)?.origin).toBe(
      "http://localhost:3000",
    );
    expect(requestSiteOrigin(configured, "127.0.0.1:3110", true)?.origin).toBe(
      "http://127.0.0.1:3110",
    );
  });

  it("keeps the configured origin in production and on non-loopback development hosts", () => {
    const configured = new URL("https://pginfo.example");
    expect(requestSiteOrigin(configured, "127.0.0.1:3000", false)).toBe(
      configured,
    );
    expect(
      requestSiteOrigin(configured, "localhost.other.example:3000", true),
    ).toBe(configured);
    expect(
      requestSiteOrigin(undefined, "localhost@another.example", true),
    ).toBeUndefined();
  });

  it("preserves HTTPS for a configured local origin", () => {
    const configured = new URL("https://localhost:3000");
    expect(requestSiteOrigin(configured, "localhost:3000", true)).toBe(
      configured,
    );
  });

  it("preserves the actionable message for a rejected origin", () => {
    expect(
      responseError(403, { message: originMismatchMessage }, new Headers())
        .message,
    ).toBe(originMismatchMessage);
  });
});
