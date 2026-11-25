import { unstable_cache } from "next/cache";
import { backendURL } from "@/src/api/config";

async function supports(base: string, endpoint: string) {
  try {
    const response = await fetch(`${base}/${endpoint}`, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4000),
    });
    await response.body?.cancel();
    if (response.status === 401 || response.status === 403) return "available";
    if (response.status === 404) return "unavailable";
  } catch {}
  return "unknown";
}

const capabilities = unstable_cache(
  async (base: string) => {
    const [rentals, savedSearches] = await Promise.all([
      supports(base, "rental-bookings/mine"),
      supports(base, "saved-searches"),
    ]);
    return { rentals, savedSearches };
  },
  ["pginfo-public-capabilities"],
  { revalidate: 60 },
);

export async function GET() {
  try {
    return Response.json(
      { success: true, data: await capabilities(backendURL()) },
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  } catch {
    return Response.json(
      { success: true, data: { rentals: "unknown", savedSearches: "unknown" } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
