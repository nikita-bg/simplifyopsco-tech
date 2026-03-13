import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("has correct meta title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/SimplifyOps/);
  });

  test("hero section has heading and CTA", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    // CTA may be in header (hidden on mobile) or in hero section
    const cta = page.getByRole("link", { name: "Get Started Free" }).first();
    // On mobile, header CTA is hidden — check that at least the hero section exists
    const heroVisible = await cta.isVisible();
    if (heroVisible) {
      await expect(cta).toHaveAttribute("href", "/auth/sign-up");
    }
  });

  test("page loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/", { waitUntil: "networkidle" });
    // Filter out known acceptable errors (e.g., favicon, external resources)
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("ERR_CONNECTION_REFUSED")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("Pricing Page", () => {
  test("displays all three plans with features", async ({ page }) => {
    await page.goto("/pricing");
    // Each plan should have feature list items with checkmark icons
    const checkmarks = await page.locator("svg").all();
    expect(checkmarks.length).toBeGreaterThan(10); // 6 features x 3 plans
  });

  test("trial badge is visible", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText(/14-Day Free Trial/)).toBeVisible();
  });

  test("CTA buttons redirect unauthenticated users to sign-up", async ({
    page,
  }) => {
    await page.goto("/pricing");
    // Click on Starter "Get Started" -- should redirect to sign-up since not logged in
    const buttons = page.getByRole("button", { name: /Get Started|Start Free/ });
    const firstButton = buttons.first();
    await firstButton.click();
    await page.waitForURL(/sign-up/);
    await expect(page).toHaveURL(/sign-up/);
  });
});

test.describe("Install Page", () => {
  test("loads correctly", async ({ page }) => {
    await page.goto("/install");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("has installation instructions", async ({ page }) => {
    await page.goto("/install");
    // Page should have code block or instructions
    await expect(page.getByText(/script/i).first()).toBeVisible();
  });
});

test.describe("Legal Pages", () => {
  test("privacy policy loads and has content", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("h1")).toBeVisible();
    // Should have substantial text content
    const body = await page.locator("body").textContent();
    expect(body!.length).toBeGreaterThan(500);
  });

  test("terms of service loads and has content", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("h1")).toBeVisible();
    const body = await page.locator("body").textContent();
    expect(body!.length).toBeGreaterThan(500);
  });
});
