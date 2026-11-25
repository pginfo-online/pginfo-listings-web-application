import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const id = "6234567890abcdef01234567";
const meetupId = "d234567890abcdef01234567";

test.beforeEach(async ({ page }) => {
  await page.route(
    (url) =>
      url.pathname === "/_next/image" &&
      url.searchParams
        .get("url")
        ?.startsWith("https://images.unsplash.com/") === true,
    (route) =>
      route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=",
          "base64",
        ),
      }),
  );
});

async function signIn(page: Page) {
  await page.getByLabel("Mobile number or email").fill("qa@example.invalid");
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("Four-digit code").fill("1234");
  await page.getByRole("button", { name: "Verify code" }).click();
  await page.getByLabel("Your name").fill("QA Resident");
  await page.getByRole("button", { name: "Create account" }).click();
}

test("desktop explores, filters, paginates, and saves a listing", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Find your space/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose a city" }).click();
  await page.getByLabel("Search cities").fill("Benga");
  await page.getByRole("button", { name: "Bengaluru Karnataka" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page
    .getByRole("button", { name: "Search by locality or property" })
    .click();
  const search = page.getByRole("dialog", {
    name: "Find your next place in Bengaluru",
  });
  await search.getByLabel("Look up a property or landmark").fill("Indi");
  await search
    .getByRole("button", { name: "Indiranagar", exact: true })
    .last()
    .click();
  await search.getByRole("button", { name: "Show properties" }).click();
  await expect(page).toHaveURL(/area=Indiranagar.*city=Bengaluru/);
  await page.getByLabel("Minimum price").fill("10000");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("heading", { name: "No matching properties" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page.getByText("16 properties found")).toBeVisible();
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  const save = page.getByRole("button", { name: /^Save · Parkside/ });
  await save.click();
  await expect(
    page.getByRole("button", { name: /^Remove from saved/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Saved" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Parkside Co-living" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Parkside Co-living" }),
  ).toBeVisible();
});

test("OTP registration stays server-side and visit and rental status can be tracked", async ({
  page,
  context,
}) => {
  await page.goto(`/property/${id}`);
  await expect(
    page.getByRole("heading", { name: "Parkside Co-living", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("private-guest-field")).toHaveCount(0);
  await page.getByRole("button", { name: /View photos/ }).click();
  await page.getByRole("button", { name: "Next photo" }).click();
  await expect(page.getByText("2 / 2 · Second room")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Sign in to request a visit" }).click();
  await signIn(page);
  await expect(page).toHaveURL(new RegExp(`/property/${id}$`));
  const cookies = await context.cookies();
  expect(
    cookies
      .filter(({ name }) => name.startsWith("pginfo_"))
      .every(({ httpOnly, sameSite }) => httpOnly && sameSite === "Lax"),
  ).toBeTruthy();
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage })),
  ).not.toContain("fixture-access-token");
  await expect(page.getByText("1 Park Street")).toBeVisible();
  await page
    .getByRole("button", { name: "Request a visit", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Visit date (IST)").fill("2037-05-20");
  await dialog.getByLabel("Visit time (IST)").fill("17:15");
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(dialog.getByText("Request sent to the owner")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Request rental" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Move-in date (IST)").fill("2037-05-29");
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(dialog.getByText("Request sent to the owner")).toBeVisible();
  await dialog.getByRole("link", { name: "My requests" }).click();
  await expect(page.getByText("Pending", { exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "Withdraw" })).toBeVisible();
  await page.getByRole("button", { name: "Withdraw" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Withdraw request" })
    .click();
  await expect(page.getByText("Withdrawn", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "My visits" }).click();
  await expect(page.getByText("5:15 PM IST", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Cancel visit" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel visit" })
    .click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to manage your requests" }),
  ).toBeVisible();
});

test("uncertain rental response preserves input and prevents immediate resubmission", async ({
  page,
}) => {
  await page.goto(`/sign-in?next=/property/${id}`);
  await signIn(page);
  await page.getByRole("button", { name: "Request rental" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Move-in date (IST)").fill("2037-05-29");
  await dialog
    .getByLabel("Message to the owner")
    .fill("Simulate an uncertain response");
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(
    dialog.getByText("The request may have been sent.", { exact: false }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Message to the owner")).toHaveValue(
    "Simulate an uncertain response",
  );
  await expect(
    dialog.getByRole("button", { name: "Send request" }),
  ).toBeDisabled();
});

test("meetup participation and server-side saved search use verified routes", async ({
  page,
}) => {
  await page.goto("/sign-in?next=/explore%3Fcity%3DBengaluru");
  await signIn(page);
  await page.getByRole("button", { name: "Save search", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Search saved" }),
  ).toBeVisible();
  await page.goto("/saved");
  await expect(
    page.getByRole("link", { name: "Bengaluru", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove Bengaluru" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove saved search" })
    .click();
  await expect(
    page.getByRole("heading", { name: "No saved searches yet" }),
  ).toBeVisible();
  await page.goto(`/meetups/${meetupId}`);
  await page.getByRole("button", { name: "Join meetup" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Join meetup" })
    .click();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Cancel participation" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel participation" })
    .click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
});

test("protected and unlisted BFF routes reject unsafe access and public fields are projected", async ({
  request,
}) => {
  expect((await request.get("/api/data/properties/admin/all")).status()).toBe(
    404,
  );
  const anonymous = await request.get(`/api/data/contact/${id}`);
  expect(anonymous.status()).toBe(401);
  expect(anonymous.headers()["cache-control"]).toContain("no-store");
  expect(
    (
      await request.post("/api/data/auth/otp/send-unified", {
        headers: { Origin: "https://another.example" },
        data: { contact: "qa@example.invalid", type: "email" },
      })
    ).status(),
  ).toBe(403);
  const response = await request.get("/api/data/properties");
  expect(response.status()).toBe(200);
  const value = await response.text();
  expect(value).not.toContain("private-owner");
  expect(value).not.toContain("1234567890");
  expect((await request.get("/api/features")).status()).toBe(200);
});

test("mobile bottom tabs, colour theme, language and modal keyboard behavior", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const navigation = page.getByRole("navigation", {
    name: "Mobile navigation",
  });
  await expect(navigation.getByRole("link")).toHaveText([
    "Home",
    "Saved",
    "Meetups",
    "More",
  ]);
  await expect(navigation.getByRole("link", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.getByRole("button", { name: "Toggle colour theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: /Switch to Hindi/ }).click();
  await expect(
    page.getByRole("heading", { name: /अपनी जगह खोजें/ }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await page.getByRole("button", { name: /अंग्रेज़ी में बदलें/ }).click();
  const picker = page.getByRole("button", { name: "Choose a city" });
  await picker.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).toBeFocused();
});

const widths = [375, 390, 414, 768, 1024, 1280, 1440, 1920];
for (const width of widths) {
  test(`key routes fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/explore?city=Bengaluru",
      `/property/${id}`,
      "/saved",
      "/meetups",
      "/more",
      "/sign-in",
      "/list-property",
    ]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  });
}

test("automated WCAG A/AA checks on home, explore, details, and sign-in", async ({
  page,
}) => {
  for (const [width, colorScheme] of [
    [1440, "light"],
    [390, "dark"],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme });
    for (const route of [
      "/",
      "/explore?city=Bengaluru",
      `/property/${id}`,
      "/sign-in",
      "/list-property",
    ]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const report = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        report.violations.map(({ id, nodes }) => ({
          id,
          nodes: nodes.map(({ target }) => target),
        })),
        `${route} ${width}px ${colorScheme}`,
      ).toEqual([]);
    }
  }
});

test("rotating session restoration and checkout use the protected browser boundary", async ({
  page,
  context,
}) => {
  await page.goto(`/sign-in?next=/property/${id}`);
  await signIn(page);
  await expect(
    page.getByRole("button", { name: "Request rental" }),
  ).toBeVisible();
  await context.clearCookies({ name: "pginfo_access" });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Request rental" }),
  ).toBeVisible();
  expect(
    (await context.cookies()).some(
      ({ name, httpOnly }) => name === "pginfo_access" && httpOnly,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Request rental" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Move-in date (IST)").fill("2037-05-30");
  await dialog
    .getByLabel("Message to the owner")
    .fill("Fixture accepted payment");
  await dialog.getByRole("button", { name: "Send request" }).click();
  await dialog.getByRole("link", { name: "My requests" }).click();
  await page.getByRole("button", { name: "Pay", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText(/₹250 · Razorpay/),
  ).toBeVisible();
  await page.route("https://rzp.io/i/fixture", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Isolated checkout fixture</h1>",
    }),
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Pay booking amount" })
    .click();
  await expect(page).toHaveURL("https://rzp.io/i/fixture");
  await expect(
    page.getByRole("heading", { name: "Isolated checkout fixture" }),
  ).toBeVisible();
  await page.goBack();
  await page.reload();
  await expect(page.getByText("Booking amount ₹250 · Pending")).toBeVisible();
  await expect(page.getByRole("button", { name: "Withdraw" })).toHaveCount(0);
});

test("sticky city selector stays usable and the search drawer opens from the left", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("footer").scrollIntoViewIfNeeded();
  const header = page.getByRole("banner");
  const picker = header.getByRole("button", { name: "Choose a city" });
  await picker.click();
  await page.getByLabel("Search cities").fill("Pune");
  await page.getByRole("button", { name: "Pune Maharashtra" }).click();
  await header.getByRole("button", { name: "Search", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Find your next place in Pune",
  });
  await expect(dialog).toBeVisible();
  await expect
    .poll(async () => Math.round((await dialog.boundingBox())?.x ?? -100))
    .toBe(0);
  await dialog.getByRole("button", { name: /Choose a city/ }).click();
  await dialog.getByLabel("Search cities").fill("Benga");
  await dialog.getByRole("button", { name: "Bengaluru Karnataka" }).click();
  await expect(
    page.getByRole("dialog", { name: "Find your next place in Bengaluru" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    header.getByRole("button", { name: "Search", exact: true }),
  ).toBeFocused();
  await page.reload();
  await expect(
    header.getByRole("button", { name: /Choose a city · Bengaluru/ }),
  ).toBeVisible();
});

test("right drawer signs in and publishes an owner submission for review with a photo", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  const trigger = header.getByRole("button", { name: "Sign in", exact: true });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Sign in to PGinfo" });
  await expect(drawer).toBeVisible();
  await expect
    .poll(async () =>
      Math.round(
        (await page.evaluate(() => innerWidth)) -
          ((await drawer.boundingBox())?.x ?? 0) -
          ((await drawer.boundingBox())?.width ?? 0),
      ),
    )
    .toBe(0);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();

  await header
    .getByRole("link", { name: "List your property", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sign in to add a listing" }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await signIn(page);
  await expect(page).toHaveURL(/\/list-property$/);
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(header.getByRole("link", { name: "Account" })).toBeVisible();

  const rejected = await page.request.post("/api/data/upload/images", {
    headers: { origin: new URL(page.url()).origin },
    multipart: {
      images: {
        name: "bad.png",
        mimeType: "image/png",
        buffer: Buffer.from("not an image"),
      },
    },
  });
  expect(rejected.status()).toBe(415);
  const guest = await request.post("/api/data/properties", {
    headers: { origin: new URL(page.url()).origin },
    data: {},
  });
  expect(guest.status()).toBe(401);

  await page.getByLabel("Property title").fill("Daylight PG");
  await page.getByLabel("Monthly rent (₹)").fill("8750");
  await page.getByLabel("City", { exact: true }).fill("Bengaluru");
  await page.getByLabel("Neighbourhood").fill("Indiranagar");
  await page.getByLabel("Street address").fill("25 Daylight Drive");
  await page.getByLabel("Contact mobile number").fill("9000000000");
  await page.getByLabel("Choose photos").setInputFiles({
    name: "bedroom.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByText("bedroom.png")).toBeVisible();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Listing submitted for review")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "My listings" }).getByText("Daylight PG"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "My listings" })
      .getByText("Submitted", { exact: true }),
  ).toBeVisible();
});

test("discovery drawers and photo viewer pass automated accessibility checks", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 850 });
  async function check() {
    const report = await new AxeBuilder({ page })
      .include(
        '[role="dialog"][aria-modal], [role="dialog"][data-state="open"]',
      )
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      report.violations.map(({ id, nodes }) => ({
        id,
        nodes: nodes.map(({ target }) => target),
      })),
    ).toEqual([]);
  }
  await page.goto("/");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Search", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Look up a property or landmark")
    .waitFor();
  await check();
  await page.keyboard.press("Escape");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await page.getByLabel("Mobile number or email").waitFor();
  await check();
  await page.keyboard.press("Escape");
  await page.goto(`/property/${id}`);
  await page.getByRole("button", { name: /View photos/ }).click();
  await page.getByRole("button", { name: "Next photo" }).waitFor();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("2 / 2 · Second room")).toBeVisible();
  await check();
});
