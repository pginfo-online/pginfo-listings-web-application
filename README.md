# PGinfo web

A Next.js App Router application for discovering PGs, co-living spaces, flats and commercial properties in India. The existing PGinfo backend owns inventory, identity, permissions and request status.

## Run locally

Use Node.js 22.13 or newer in the 22.x line, or Node.js 24 or newer.

```sh
npm ci
cp .env.example .env.local
```

Set `BACKEND_API_URL` in `.env.local` to the approved PGinfo backend's `/api/v1` base URL. If you run the sibling backend on its documented local port, use `http://127.0.0.1:5001/api/v1`. A non-loopback backend must use HTTPS. Set `SITE_URL` to your app origin, such as `http://127.0.0.1:3000`. With `npm run dev`, local requests can also use `localhost` or `[::1]` on the port shown by Next.js. Set the exact browser origin when testing with `npm run start`.

```sh
npm run dev
```

The web server is required for listing pages and sessions. The build can run without backend connectivity. Pages that require backend data show an unavailable state if the dependency cannot be reached.

## Routes and API contracts

Backend routes below are relative to `/api/v1`.

| Web route                   | Functionality                                                                                                               | Backend dependencies                                                                                                                                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                         | City directory, featured PGs, category and locality search, nearby search                                                   | `GET /cities`, `GET /properties`, `GET /properties/suggestions`                                                                                                                                                                                                            |
| `/explore`                  | URL-based search and filters, sorting, server pagination, saved searches when available                                     | `GET /properties`, `GET /areas`, `GET /cities`, `GET /properties/suggestions`, `POST /saved-searches`                                                                                                                                                                      |
| `/property/[id]`            | Listing, photos, rent, room options and amenities, gated contact and request actions                                        | `GET /properties/:id`, `POST /visit`, `POST /rental-bookings`                                                                                                                                                                                                              |
| `/saved`                    | Device-local property shortlist and authenticated saved search management                                                   | `GET /properties/:id`, `GET /saved-searches`, `DELETE /saved-searches/:id`                                                                                                                                                                                                 |
| `/sign-in`                  | Web OTP by Indian mobile number or email, name collection for new accounts                                                  | `POST /auth/otp/send-unified`, `POST /auth/otp/verify-unified`, `POST /auth/register-complete`, `GET /auth/me`, `POST /auth/refresh-token`                                                                                                                                 |
| `/list-property`            | Authenticated listing creation for PGs, flats and commercial properties, photo upload and review status                     | `POST /properties`, `POST /upload/images`, `GET /properties/my`                                                                                                                                                                                                            |
| `/more`                     | Visit history and cancellation, rental status, withdrawal and owner decisions, notification inbox, preferences and sign-out | `GET /visit/my`, `PUT /visit/my/:id/cancel`, `GET /rental-bookings/mine`, `GET /rental-bookings/incoming`, `PATCH /rental-bookings/{mine,incoming}/:id`, `POST /rental-bookings/mine/:id/checkout`, `GET /notifications`, notification read routes and `POST /auth/logout` |
| `/meetups`, `/meetups/[id]` | Paginated upcoming and past events, event details and participation                                                         | `GET /meetups`, `GET /meetups/:id`, `POST /meetups/:id/join`, `DELETE /meetups/:id/join`                                                                                                                                                                                   |
| `/api/features`             | Detects rental requests and saved search availability for the configured upstream                                           | Unauthenticated `GET /rental-bookings/mine` and `GET /saved-searches`                                                                                                                                                                                                      |

The sticky navbar opens search on the left and OTP sign-in on the right. The selected city is remembered on the device. Standalone sign-in links still return users to the route that requested authentication. The property gallery opens full screen with thumbnail, keyboard and touch navigation. Photo groups appear when listing captions identify them.

The listing form uploads JPEG, PNG or WebP photos one at a time and marks the first image as the cover. New listings enter the backend review queue. My listings shows the submitted record and its status. Configure the web proxy to accept an 8 MiB photo plus multipart overhead and allow at least the app’s 35-second upstream deadline for uploads and listing submission.

The public property and meetup routes render on the server. Allowlisted browser API routes validate requests and project upstream responses through Zod. The API boundary keeps backend credentials in scoped HttpOnly cookies, enforces a same-origin check for writes, and passes read cancellation upstream. TanStack Query handles browser data, query invalidation and stale reads. Zustand holds browser preferences and shortlist IDs. React Hook Form and Zod validate search, OTP and request forms.

Dates for visits and move-ins are entered in IST. Visit payloads use a calendar date and the backend's 12-hour time format. Rental booking amounts remain integer paise until formatting. Hosted checkout is offered only for an eligible backend-confirmed booking when payments are enabled. The requester sees the backend’s payment state after returning.

## Design research

The supplied screenshots informed the cyan theme, the city-first entry point, image-led cards, and the detail layout with a gallery and enquiry panel. The sibling mobile app informed location search and the Home, Saved, Meetups and More tabs. PGinfo's mobile assets supplied the room imagery.

- NoBroker emphasizes locality and landmark search with rental filters. 99acres also uses locality and project search as primary navigation. PGinfo uses server-filtered, linkable result pages. [NoBroker](https://www.nobroker.in/) · [99acres on Google Play](https://play.google.com/store/apps/details?id=com.nnacres.app)
- Zolo and CoFynd group discovery by city and show room types, rent and amenities. Stanza Living connects listing details to a scheduled visit. These patterns informed the city grid and the property detail layout. [Zolo](https://zolostays.com/) · [CoFynd](https://cofynd.com/co-living) · [Stanza Living](https://www.stanzaliving.com/coliving-in-bangalore)
- BedR uses a shortlist and separates visits from booking. Your-Space uses a city selector, amenity information and a callback option. PGinfo uses separate visit and rental requests according to the backend contract. [BedR](https://bedrindia.com/faq) · [Your-Space](https://www.your-space.in/)
- Competitor observations are limited to public product surfaces and official materials. The front-end architecture follows the inspected PGinfo contracts and the supported [Next.js App Router](https://nextjs.org/docs/app) and [backend-for-frontend](https://nextjs.org/docs/app/guides/backend-for-frontend) APIs.

The Bengaluru city image is a resized crop of the CC0 photo [Vidhana Soudha, 14 February 2022](https://commons.wikimedia.org/wiki/File:Vidhana_Soudha,_14_February_2022.jpg). Other city and listing imagery comes from the backend.

## Verify

```sh
npm run format
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --audit-level=moderate
```

Playwright launches a loopback API fixture on port 3105 and a production Next.js server on port 3106. Those checks are isolated from hosted credentials, personal data, SMS providers and Razorpay.

For read-only checks on a running web build connected to the approved backend:

```sh
PGINFO_WEB_URL=http://127.0.0.1:3102 npm run test:live
```

The live smoke script uses Bengaluru as its search case and requires inventory with approved images. It checks first-navigation timings, transferred JavaScript and no horizontal overflow at desktop and mobile widths.

## Deploy

1. Import the `pginfo-listings-web-application` repository into Vercel with the repository root as the project root. Vercel detects the Next.js framework and uses `npm run build`; use Node.js 22.13 or newer. Add `BACKEND_API_URL=https://api.pginfo.business/api/v1` to the Production, Preview and Development environments. Vercel deployment URLs are used automatically for same-origin write checks; set `SITE_URL` only when you need to pin a custom HTTPS origin. For a self-hosted deployment, configure `SITE_URL` as the final HTTPS web origin and serve the same origin to visitors.
2. For self-hosted deployments, install with `npm ci`, run `npm run build`, then start `npm run start -- --hostname 0.0.0.0 --port 3000` under a supervised Node.js process. The app requires a Next.js server.
3. Serve HTTPS and enable HSTS at the edge. Allow the Next.js image optimizer to reach the verified image hosts. Apply public cache policy at the CDN while preserving cache-control for private API data. Set upstream rate limits and client attribution with the backend operator.
4. Run the read-only smoke test and verify one complete authenticated flow in staging, including expiry, provider-backed OTP, owner acceptance and payment or refund handling as applicable. Verify cache sharing, rate limits and peak traffic capacity in the intended environment.

Read the [verification report and production-readiness summary](docs/verification.md) for deployment differences and release gates.
