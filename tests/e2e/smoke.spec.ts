import { expect, test } from "@playwright/test";

/** Smoke coverage in DATA_MODE=mock: public pages, auth, entitlements and RBAC. */
const PUBLIC = ["/", "/markets", "/news", "/atlas", "/options-flow", "/whales", "/learn", "/pricing", "/about", "/contact", "/privacy", "/terms", "/disclaimer", "/symbols/NVDA"];
const PASSWORD = "Northstar-2026!";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.locator("input[name=email]").fill(email);
  await page.locator("input[name=password]").fill(PASSWORD);
  await page.locator("main form button:not([type=button])").click();
  await page.waitForURL(/\/dashboard/);
}

for (const path of PUBLIC) {
  test(`public page renders: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("member area requires sign-in", async ({ page }) => {
  await page.goto("/dashboard/atlas");
  await expect(page).toHaveURL(/\/login/);
});

test("paid member reaches Atlas setups", async ({ page }) => {
  await login(page, "member@nsalgo.dev");
  await page.goto("/dashboard/atlas");
  await expect(page.getByText(/simulated/i).first()).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Something went wrong");
});

test("free account sees the membership gate, not Atlas levels", async ({ page }) => {
  await login(page, "free@nsalgo.dev");
  await page.goto("/dashboard/atlas");
  await expect(page.getByRole("link", { name: /pricing|join|upgrade|membership/i }).first()).toBeVisible();
});

test("non-admin cannot open admin", async ({ page }) => {
  await login(page, "member@nsalgo.dev");
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin/);
});

test("admin can open admin", async ({ page }) => {
  await login(page, "admin@nsalgo.dev");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/);
});

test("APIs enforce entitlements", async ({ request }) => {
  expect((await request.get("/api/atlas/setups")).status()).toBe(401);
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
});
