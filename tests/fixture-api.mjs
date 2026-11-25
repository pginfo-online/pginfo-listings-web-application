// Isolated contract fixture. Never launched by the application.
import { createServer } from "node:http";

const listingId = "6234567890abcdef01234567";
const userId = "7234567890abcdef01234567";
const ownerId = "8234567890abcdef01234567";
const bookingId = "9234567890abcdef01234567";
const visitId = "a234567890abcdef01234567";
const searchId = "b234567890abcdef01234567";
const cityId = "c234567890abcdef01234567";
const meetupId = "d234567890abcdef01234567";
const photo = {
  url: "https://images.unsplash.com/photo-1615874959474-d609969a20ed",
  isMain: true,
};
const property = {
  _id: listingId,
  title: "Parkside Co-living",
  category: "pg",
  purpose: "rent",
  city: "Bengaluru",
  area: "Indiranagar",
  description: "A shared home close to the metro.",
  amenities: ["wifi", "laundry"],
  isVerified: true,
  isFeatured: true,
  photos: [photo, { ...photo, isMain: false, caption: "Second room" }],
  pricing: { expectedPrice: 8500, securityDeposit: 10000 },
  pgDetails: {
    propertySubtype: "Co-living",
    roomConfigs: [{ shareType: "single", rent: 8500, depositAmount: 10000 }],
  },
  owner: {
    _id: ownerId,
    name: "Parkside Housing",
    email: "private-owner@example.invalid",
  },
  contactPhone: "1234567890",
};
const user = { _id: userId, name: "QA Resident", role: "tenant" };
const token = "fixture-access-token";
const refreshToken = "a".repeat(80);
const temporary = "fixture-registration-token";
const meetup = {
  _id: meetupId,
  title: "Community coffee",
  location: { city: "Bengaluru", area: "Indiranagar" },
  startDate: "2037-04-15T00:00:00Z",
  endDate: "2037-04-15T14:00:00Z",
  description: "Meet your neighbours.",
  participation: { registrationType: "open", isFree: true },
};
const cities = [
  { _id: cityId, name: "Bengaluru", state: "Karnataka" },
  { _id: "e234567890abcdef01234567", name: "Pune", state: "Maharashtra" },
];
let visits = [];
let bookings = [];
let searches = [];
let participation = null;
const ownerItems = [];

function reply(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "X-Request-Id": "fixture-1",
  });
  res.end(JSON.stringify(payload));
}

function result(res, data, status = 200) {
  reply(res, status, { success: true, data });
}
function failure(res, message, status = 400, errors) {
  reply(res, status, { success: false, message, errors });
}
function collect(items, page, limit, total = items.length) {
  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function bodyOf(req) {
  const body = await rawBody(req);
  return body.length ? JSON.parse(body.toString()) : {};
}

createServer(async (req, res) => {
  try {
    const { pathname, searchParams } = new URL(
      req.url,
      "http://127.0.0.1:3105",
    );
    if (pathname === "/") return result(res, { fixture: true });
    const route = pathname.substring("/api/v1/".length);
    const authorized = req.headers.authorization === `Bearer ${token}`;
    const method = req.method;
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "12");
    if (route === "cities") {
      const values = cities.filter(({ name }) =>
        name.toLowerCase().includes(searchParams.get("q")?.toLowerCase() || ""),
      );
      const collection = collect(values, page, limit);
      return result(res, { cities: values, pagination: collection.pagination });
    }
    if (route === "areas")
      return result(res, {
        areas: [{ _id: cityId, name: "Indiranagar", propertyCount: 12 }],
      });
    if (route === "properties/suggestions")
      return result(res, {
        suggestions: [
          {
            id: cityId,
            title: "Indiranagar",
            type: "locality",
            area: "Indiranagar",
            city: "Bengaluru",
          },
        ],
      });
    if (route === "properties" && method === "GET") {
      const found =
        (!searchParams.has("minPrice") ||
          Number(searchParams.get("minPrice")) <= 8500) &&
        (!searchParams.has("category") ||
          ["all", "pg"].includes(searchParams.get("category"))) &&
        (!searchParams.has("city") || searchParams.get("city") === "Bengaluru");
      return reply(res, 200, {
        success: true,
        ...collect(found ? [property] : [], page, limit, found ? 16 : 0),
      });
    }
    if (route === `properties/${listingId}` && method === "GET")
      return result(res, {
        property: {
          ...property,
          isPublicPreview: !authorized,
          address: authorized ? "1 Park Street" : "private-guest-field",
        },
      });
    if (route === "meetups" && method === "GET")
      return reply(res, 200, {
        success: true,
        ...collect([meetup], page, limit),
      });
    if (route === `meetups/${meetupId}` && method === "GET")
      return result(res, {
        meetup,
        myParticipation: authorized ? participation : null,
      });
    if (route === "auth/otp/send-unified" && method === "POST") {
      const body = await bodyOf(req);
      return body.contact === "qa@example.invalid"
        ? result(res, { channels: ["email"] })
        : failure(res, "Wrong test contact");
    }
    if (route === "auth/otp/verify-unified" && method === "POST") {
      const body = await bodyOf(req);
      return body.otp === "1234" && body.isMobile === false
        ? result(res, { tempToken: temporary, isNewUser: true })
        : failure(res, "Invalid OTP");
    }
    if (route === "auth/register-complete" && method === "POST") {
      const body = await bodyOf(req);
      if (body.tempToken !== temporary || body.name !== "QA Resident")
        return failure(res, "Invalid registration");
      return result(res, { user, accessToken: token, refreshToken }, 201);
    }
    if (route === "auth/refresh-token" && method === "POST") {
      const body = await bodyOf(req);
      return body.userId === userId && body.refreshToken === refreshToken
        ? result(res, { user, accessToken: token, refreshToken })
        : failure(res, "Refresh denied", 401);
    }
    if (route === "auth/logout" && method === "POST")
      return result(res, { success: true });
    if (
      !authorized &&
      (route === "auth/me" ||
        route.startsWith("rental-bookings") ||
        route.startsWith("visit") ||
        route.startsWith("saved-searches") ||
        route.startsWith("notifications") ||
        route.endsWith("/join"))
    )
      return failure(res, "Auth required", 401);
    if (route === "auth/me")
      return result(res, {
        user: ownerItems.length
          ? { ...user, roles: ["tenant", "owner"] }
          : user,
        capabilities: [],
      });
    if (route === "upload/images" && method === "POST") {
      if (!authorized) return failure(res, "Auth required", 401);
      const body = await new Response(await rawBody(req), {
        headers: { "content-type": req.headers["content-type"] },
      }).formData();
      if (!(body.get("images") instanceof File))
        return failure(res, "Missing image");
      return result(
        res,
        {
          images: [
            {
              url: "https://res.cloudinary.com/fixture/image/upload/pginfo/listings/photo.png",
              publicId: "pginfo/listings/photo",
            },
          ],
        },
        201,
      );
    }
    if (route === "properties" && method === "POST") {
      if (!authorized) return failure(res, "Auth required", 401);
      const item = await bodyOf(req);
      if (
        item.category === "pg" &&
        (item.purpose !== "rent" ||
          item.pgDetails?.roomConfigs?.[0]?.monthlyRent !==
            item.pricing.expectedPrice)
      )
        return failure(res, "Invalid room payload");
      if (
        item.title === "Daylight PG" &&
        item.photos?.[0]?.publicId !== "pginfo/listings/photo"
      )
        return failure(res, "Missing uploaded photo");
      const property = {
        _id: "f234567890abcdef01234567",
        title: item.title,
        city: item.city,
        area: item.area,
        category: item.category,
        status: "submitted",
        contactPhone: item.contactPhone,
      };
      ownerItems.push(property);
      return result(res, { property }, 201);
    }
    if (route === "properties/my" && method === "GET") {
      if (!authorized) return failure(res, "Auth required", 401);
      if (!ownerItems.length) return failure(res, "Owner access required", 403);
      return reply(res, 200, {
        success: true,
        ...collect(ownerItems, page, limit),
      });
    }
    if (route === "rental-bookings/mine" && method === "GET")
      return result(res, { bookings, next: null, paymentsEnabled: true });
    if (route === "rental-bookings" && method === "POST") {
      const body = await bodyOf(req);
      if (body.propertyId !== listingId || !body.moveInDate)
        return failure(res, "Wrong request");
      if (body.message === "Simulate an uncertain response")
        return failure(res, "internal upstream detail", 503);
      const booking = {
        _id: bookingId,
        property: listingId,
        status:
          body.message === "Fixture accepted payment"
            ? "accepted"
            : "requested",
        moveInDate: body.moveInDate,
        bookingAmountPaise: 25000,
        listingTitle: property.title,
      };
      bookings = [booking];
      return result(res, { booking }, 201);
    }
    if (
      route === `rental-bookings/mine/${bookingId}/checkout` &&
      method === "POST"
    ) {
      if (bookings[0]?.status !== "accepted")
        return failure(
          res,
          "This request has no payable checkout available.",
          409,
        );
      bookings[0].payment = {
        state: "pending",
        expiresAt: "2037-05-30T00:00:00.000Z",
      };
      return result(res, { url: "https://rzp.io/i/fixture" });
    }
    if (route === `rental-bookings/mine/${bookingId}` && method === "PATCH") {
      const body = await bodyOf(req);
      const booking = { ...bookings[0], status: body.status };
      bookings = [booking];
      return result(res, { booking });
    }
    if (route === "visit/my" && method === "GET")
      return result(res, { visits });
    if (route === "visit" && method === "POST") {
      const body = await bodyOf(req);
      if (body.scheduledTime !== "5:15 PM" || body.propertyId !== listingId)
        return failure(res, "Invalid date", 400, [
          { field: "scheduledTime", message: "Invalid" },
        ]);
      const visit = {
        _id: visitId,
        property: { _id: listingId, title: property.title },
        status: "pending",
        scheduledDate: body.scheduledDate + "T00:00:00.000Z",
        scheduledTime: body.scheduledTime,
      };
      visits = [visit];
      return result(res, { visit }, 201);
    }
    if (route === `visit/my/${visitId}/cancel` && method === "PUT") {
      const visit = { ...visits[0], status: "cancelled" };
      visits = [visit];
      return result(res, { visit });
    }
    if (route === "saved-searches" && method === "GET")
      return result(res, { searches });
    if (route === "saved-searches" && method === "POST") {
      const body = await bodyOf(req);
      if (!body.filters?.city) return failure(res, "Choose a city");
      const search = {
        _id: searchId,
        label: body.label,
        filters: body.filters,
      };
      searches = [search];
      return result(res, { search }, 201);
    }
    if (route === `saved-searches/${searchId}` && method === "DELETE") {
      searches = [];
      return reply(res, 200, { success: true });
    }
    if (route === `meetups/${meetupId}/join`) {
      participation =
        method === "DELETE" ? { status: "cancelled" } : { status: "confirmed" };
      return result(res, { participant: participation });
    }
    if (route === "notifications" && method === "GET")
      return reply(res, 200, {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, pages: 0, unreadCount: 0 },
      });
    return failure(res, "Fixture route not found", 404);
  } catch {
    return failure(res, "Invalid fixture request", 500);
  }
}).listen(3105, "127.0.0.1");
