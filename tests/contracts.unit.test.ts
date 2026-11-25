import { describe, expect, it } from "vitest";
import { checkout, contacts, listings } from "@/src/api/contracts";
import { responseError } from "@/src/api/errors";
import { resolveRoute } from "@/src/api/routes";
import {
  dateOnly,
  imageURL,
  paiseAsRupees,
  visitTime,
} from "@/src/domain/display";
import { safeReturnPath } from "@/src/domain/navigation";
import { discover, params, searchFilters } from "@/src/domain/search";

const id = "6234567890abcdef01234567";

describe("URL state", () => {
  it("serializes supported parameters, preserves zero and drops malformed or unknown fields", () => {
    const parsed = searchFilters({
      city: "  Pune ",
      page: "2",
      minPrice: "0",
      category: "residential_rental",
      q: ["x", "y"],
      secret: "x",
      lat: "19.04",
    });
    expect(params(discover(parsed)).toString()).toBe(
      "category=residential_rental&city=Pune&limit=12&minPrice=0&page=2&purpose=rent",
    );
  });
  it("drops distance sorts without valid coordinates and inverted budgets", () => {
    expect(
      searchFilters({
        lat: "92",
        lng: "73",
        sort: "distance",
        minPrice: "9000",
        maxPrice: "8000",
      }),
    ).toMatchObject({});
    expect(
      params(
        searchFilters({
          lat: "92",
          lng: "73",
          sort: "distance",
          minPrice: "9000",
          maxPrice: "8000",
        }),
      ).size,
    ).toBe(0);
  });
  it("only permits return paths for the web app", () => {
    expect(safeReturnPath("/explore?city=Pune")).toBe("/explore?city=Pune");
    for (const untrusted of [
      "//attacker.invalid",
      "/\\attacker.invalid",
      "/api/data/auth/me",
      "https://attacker.invalid",
      "/%2f%2fattacker.invalid",
    ]) {
      expect(safeReturnPath(untrusted)).toBe("/more");
    }
  });
});

describe("verified contracts", () => {
  it("strips contact, address, and unexpected owner details from the public catalogue", () => {
    const result = listings.parse({
      success: true,
      data: [
        {
          _id: id,
          title: "Park PG",
          category: "pg",
          address: "private",
          contactPhone: "private",
          owner: { _id: id, email: "private@example.invalid" },
          minRent: "1234",
        },
      ],
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });
    expect(result.data[0]).toMatchObject({
      _id: id,
      minRent: 1234,
      owner: { _id: id },
    });
    expect(JSON.stringify(result)).not.toContain("private");
    expect(
      contacts.parse({
        success: true,
        data: { property: { isPublicPreview: false, contactPhone: "allowed" } },
      }).data.property.contactPhone,
    ).toBe("allowed");
  });
  it("rejects unexpected envelopes or identifiers and routes outside the explicit allowlist", () => {
    expect(listings.safeParse({ success: true, data: [{}] }).success).toBe(
      false,
    );
    expect(resolveRoute("GET", ["properties", "admin", "all"])).toBeUndefined();
    expect(resolveRoute("GET", ["properties", ".."])).toBeUndefined();
    expect(resolveRoute("POST", ["properties", id])).toBeUndefined();
    expect(resolveRoute("PATCH", ["rental-bookings", "mine", id])?.auth).toBe(
      "required",
    );
  });
  it("only accepts verified Razorpay checkout URLs and observed public image hosts", () => {
    expect(
      checkout.safeParse({
        success: true,
        data: { url: "https://rzp.io/i/fixture" },
      }).success,
    ).toBe(true);
    expect(
      checkout.safeParse({
        success: true,
        data: { url: "https://rzp.io.attacker.invalid/i/fixture" },
      }).success,
    ).toBe(false);
    expect(
      imageURL(
        "https://pgdekhoprod.s3.ap-south-1.amazonaws.com/pgDekhoWeb/photo.jpg",
      ),
    ).toBeDefined();
    expect(
      imageURL("https://images.unsplash.com.attacker.invalid/photo-a"),
    ).toBeUndefined();
    expect(
      imageURL("https://res.cloudinary.com/demo/raw/upload/photo.png"),
    ).toBeUndefined();
  });
  it("normalizes failure hints without exposing arbitrary upstream text", () => {
    const error = responseError(
      400,
      {
        message: "stack credential",
        errors: [
          { field: "scheduledDate", message: "stack credential" },
          { field: "secret", message: "credential" },
        ],
      },
      new Headers({ "x-request-id": "test-42", "retry-after": "7" }),
    );
    expect(error.requestId).toBe("test-42");
    expect(error.retryAfter).toBe(7);
    expect(error.fields).toEqual([
      {
        field: "scheduledDate",
        message: "Choose a future visit date and time in IST.",
      },
    ]);
    expect(error.message).not.toContain("credential");
  });
});

describe("India-specific presentation", () => {
  it("maintains date-only values, IST time notation and exact paise", () => {
    expect(dateOnly("2030-01-02T00:00:00.000Z")).toMatch(/2 Jan 2030/);
    expect(visitTime("00:15")).toBe("12:15 AM");
    expect(visitTime("16:40")).toBe("4:40 PM");
    expect(paiseAsRupees(100000001)).toBe("₹10,00,000.01");
  });
});
