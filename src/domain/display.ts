import type { Photo, Property } from "@/src/api/contracts";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const indianCalendar = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const indianTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  dateStyle: "medium",
  timeStyle: "short",
});
const calendar = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  dateStyle: "medium",
});

export const rupees = (value: number) => inr.format(value);
export const todayIST = () => indianCalendar.format(new Date());
export const dateOnly = (value: string) => {
  const date = new Date(value.slice(0, 10) + "T00:00:00Z");
  return Number.isFinite(date.getTime()) ? calendar.format(date) : "";
};
export const instant = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? indianTime.format(date) : "";
};
export const label = (value: string) =>
  value.replace(/[_-]/g, " ").replace(/^./, (first) => first.toUpperCase());
export const titleOf = (p: Property) => p.title || p.name || "Rental property";
export const priceOf = (p: Property) =>
  [p.minRent, p.pricing?.expectedPrice, p.monthlyPricing].find(
    (value): value is number => typeof value === "number" && value > 0,
  );
export const amenitiesOf = (p: Property) => [
  ...new Set(
    [...(p.amenities ?? []), ...(p.facilities ?? [])]
      .map((value) => value.trim())
      .filter(Boolean),
  ),
];
export const photosOf = (p: Property) =>
  [...(p.photos ?? [])]
    .filter(({ url }) => Boolean(imageURL(url)))
    .sort((a, b) => Number(Boolean(b.isMain)) - Number(Boolean(a.isMain)));
export const photoSrc = (photo: Photo | undefined | null, thumbnail = false) =>
  thumbnail
    ? (imageURL(photo?.thumbnailUrl) ?? imageURL(photo?.url))
    : imageURL(photo?.url);

export function imageURL(value: string | null | undefined) {
  const url = httpsURL(value);
  if (!url) return undefined;
  if (
    url.hostname === "res.cloudinary.com" &&
    /\/image\/upload\//.test(url.pathname)
  )
    return url.href;
  if (
    url.hostname === "images.unsplash.com" &&
    url.pathname.startsWith("/photo-")
  )
    return url.href;
  if (
    url.hostname === "pgdekhoprod.s3.ap-south-1.amazonaws.com" &&
    url.pathname.startsWith("/pgDekhoWeb/") &&
    !url.search
  )
    return url.href;
  return undefined;
}

export function httpsURL(value: string | null | undefined) {
  try {
    if (!value) return undefined;
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port
    )
      return url;
  } catch {}
  return undefined;
}

export function visitTime(value: string) {
  const [hour, minute] = value.split(":");
  const hh = Number(hour);
  return `${hh % 12 || 12}:${minute} ${hh >= 12 ? "PM" : "AM"}`;
}

export function paiseAsRupees(paise: number) {
  const value = BigInt(paise);
  const fraction = value % 100n;
  return fraction === 0n
    ? inr.format(value / 100n)
    : `${inr.format(value / 100n)}.${String(fraction).padStart(2, "0")}`;
}
