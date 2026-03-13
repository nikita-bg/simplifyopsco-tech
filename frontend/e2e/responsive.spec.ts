import { test, expect } from "@playwright/test";

test.describe("Responsive - Landing Page", () => {
  test("mobile: hamburger menu is visible", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/", { waitUntil: "networkidle" });

    // On mobile, the desktop nav links should be hidden
    // and a hamburger button should be visible
    const hamburger = page.locator("button").filter({ has: page.locator("svg") }).first();
    await expect(hamburger).toBeVisible();
  });

  test("mobile: hero text is readable", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    const box = await h1.boundingBox();
    expect(box).not.toBeNull();
    // Text should not overflow viewport
    expect(box!.width).toBeLessThanOrEqual(375);
  });

  test("tablet: layout adapts correctly", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toBeVisible();
    await page.screenshot({
      path: "./e2e/screenshots/landing-tablet.png",
      fullPage: false,
    });
  });

  test("desktop: full navigation is visible", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Get Started Free" })).toBeVisible();
  });
});

test.describe("Responsive - Pricing Page", () => {
  test("mobile: pricing cards stack vertically", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/pricing");

    const starter = page.getByText("Starter").first();
    const growth = page.getByText("Growth").first();
    await expect(starter).toBeVisible();
    await expect(growth).toBeVisible();

    const starterBox = await starter.boundingBox();
    const growthBox = await growth.boundingBox();
    // On mobile, Growth card should be below Starter (stacked)
    expect(growthBox!.y).toBeGreaterThan(starterBox!.y);
  });

  test("desktop: pricing cards are side by side", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/pricing");

    const starter = page.getByText("$39").first();
    const growth = page.getByText("$99").first();
    const starterBox = await starter.boundingBox();
    const growthBox = await growth.boundingBox();
    // On desktop, they should be roughly on the same row
    expect(Math.abs(growthBox!.y - starterBox!.y)).toBeLessThan(50);
  });
});

test.describe("Responsive - Auth Pages", () => {
  test("mobile: sign-in form fits viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/auth/sign-in");
    const form = page.locator("form");
    await expect(form).toBeVisible();
    const box = await form.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(375);
  });

  test("mobile: sign-up form fits viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/auth/sign-up");
    const form = page.locator("form");
    await expect(form).toBeVisible();
    const box = await form.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(375);
  });
});
