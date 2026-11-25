import { expect, it } from "vitest";
import {
  listingBody,
  listingInput,
  type ListingValues,
} from "@/src/domain/listing-submission";

const values: ListingValues = {
  title: "Daylight PG",
  description: "A room near the metro.",
  city: "Bengaluru",
  area: "Indiranagar",
  address: "25 Daylight Drive",
  contactPhone: "9000000000",
  category: "pg",
  purpose: "rent",
  price: 8750,
  deposit: "0",
  amenities: "Wi-Fi, Laundry , ",
  propertySubtype: "PG",
  gender: "any",
  foodIncluded: false,
  shareType: "single",
  bhk: "1BHK",
  furnishingStatus: "semi_furnished",
  bedrooms: "1",
  bathrooms: "1",
  carpetAreaSqFt: "430",
  commercialSubtype: "office_space",
  fitoutStatus: "warm_shell",
};

it("encodes PG rent and the first uploaded photo as the cover", () => {
  const body = listingBody.parse(
    listingInput({ ...values, purpose: "sale" }, [
      {
        url: "https://res.cloudinary.com/fixture/image/upload/a.png",
        publicId: "a",
      },
    ]),
  );
  expect(body).toMatchObject({
    purpose: "rent",
    pricing: { expectedPrice: 8750, securityDeposit: 0 },
    amenities: ["Wi-Fi", "Laundry"],
    pgDetails: { roomConfigs: [{ shareType: "single", monthlyRent: 8750 }] },
    photos: [{ isMain: true, order: 0 }],
  });
});

it("retains only category-matching details and omits a sale deposit", () => {
  const body = listingBody.parse(
    listingInput(
      {
        ...values,
        category: "residential_rental",
        purpose: "sale",
        deposit: "500",
      },
      [],
    ),
  );
  expect(body).toMatchObject({
    purpose: "sale",
    residentialDetails: {
      bhk: "1BHK",
      bedrooms: 1,
      bathrooms: 1,
      carpetAreaSqFt: 430,
    },
  });
  expect(body.pricing.securityDeposit).toBeUndefined();
  expect(body).not.toHaveProperty("pgDetails");
});

it("rejects malformed commercial fields and unapproved photo origins", () => {
  const body = listingInput(
    { ...values, category: "commercial", carpetAreaSqFt: "9" },
    [{ url: "https://other.example.invalid/photo.png", publicId: "a" }],
  );
  expect(listingBody.safeParse(body).success).toBe(false);
  expect(
    listingBody.parse(listingInput({ ...values, category: "commercial" }, [])),
  ).toMatchObject({
    commercialDetails: {
      commercialSubtype: "office_space",
      fitoutStatus: "warm_shell",
      carpetAreaSqFt: 430,
    },
  });
});
