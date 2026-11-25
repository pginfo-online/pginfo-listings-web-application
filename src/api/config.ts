import "server-only";

export function backendURL() {
  const raw = process.env.BACKEND_API_URL;
  if (!raw) {
    console.error(
      JSON.stringify({
        event: "server_configuration_error",
        setting: "BACKEND_API_URL",
        reason: "missing",
      }),
    );
    throw new Error("BACKEND_API_URL is required for API requests");
  }
  const url = new URL(raw);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (!local && url.protocol !== "https:") ||
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.replace(/\/$/, "") !== "/api/v1"
  ) {
    throw new Error("BACKEND_API_URL must be a trusted HTTPS /api/v1 base URL");
  }
  return url.toString().replace(/\/$/, "");
}

export function siteURL() {
  const vercelHost =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
      : process.env.VERCEL_URL;
  const configured =
    process.env.SITE_URL || (vercelHost && `https://${vercelHost}`);
  if (!configured) return undefined;
  const url = new URL(configured);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (!local && url.protocol !== "https:") ||
    !["https:", "http:"].includes(url.protocol) ||
    url.pathname !== "/" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "SITE_URL or the Vercel deployment URL must be the HTTPS origin of the web app",
    );
  }
  return url;
}
