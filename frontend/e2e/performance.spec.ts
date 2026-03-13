import { test, expect } from "@playwright/test";

test.describe("Performance - Page Load Times", () => {
  test("landing page loads under 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });

  test("sign-in page loads under 2 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/auth/sign-in", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(2000);
  });

  test("pricing page loads under 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });

  test("install page loads under 2 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/install", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(2000);
  });
});

test.describe("Performance - No Layout Shift", () => {
  test("landing page has no major CLS", async ({ page }) => {
    // Navigate and check that main elements are stable
    await page.goto("/", { waitUntil: "networkidle" });
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    const box1 = await h1.boundingBox();
    // Wait a moment for any late shifts
    await page.waitForTimeout(500);
    const box2 = await h1.boundingBox();
    // Position should not shift significantly
    expect(Math.abs(box2!.y - box1!.y)).toBeLessThan(5);
  });
});

test.describe("Performance - Resource Loading", () => {
  test("no broken resources on landing page", async ({ page }) => {
    const failedRequests: string[] = [];
    page.on("requestfailed", (request) => {
      const url = request.url();
      // Ignore known acceptable failures
      if (!url.includes("favicon") && !url.includes("localhost:8000")) {
        failedRequests.push(url);
      }
    });
    await page.goto("/", { waitUntil: "networkidle" });
    expect(failedRequests).toHaveLength(0);
  });

  test("Space Grotesk font loads", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const fontFamily = await page.locator("body").evaluate((el) =>
      getComputedStyle(el).fontFamily
    );
    expect(fontFamily).toContain("Space Grotesk");
  });
});
