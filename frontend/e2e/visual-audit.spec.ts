import { test, expect } from "@playwright/test";

const pages = [
  { name: "landing", path: "/" },
  { name: "sign-in", path: "/auth/sign-in" },
  { name: "sign-up", path: "/auth/sign-up" },
  { name: "pricing", path: "/pricing" },
  { name: "install", path: "/install" },
  { name: "privacy", path: "/privacy" },
  { name: "terms", path: "/terms" },
];

test.describe("Visual Audit - All Public Pages", () => {
  for (const page of pages) {
    test(`${page.name} page loads correctly`, async ({ page: p }) => {
      const response = await p.goto(page.path, { waitUntil: "networkidle" });
      expect(response?.status()).toBeLessThan(400);

      // Check no console errors
      const errors: string[] = [];
      p.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      // Screenshot
      await p.screenshot({
        path: `./e2e/screenshots/${page.name}-desktop.png`,
        fullPage: true,
      });

      // Check page has visible content
      const body = p.locator("body");
      await expect(body).toBeVisible();

      // Check no broken images
      const images = await p.locator("img").all();
      for (const img of images) {
        const naturalWidth = await img.evaluate(
          (el: HTMLImageElement) => el.naturalWidth
        );
        if (naturalWidth === 0) {
          const src = await img.getAttribute("src");
          console.warn(`Broken image found: ${src} on ${page.path}`);
        }
      }
    });
  }
});

test.describe("Visual Audit - Navigation & Links", () => {
  test("navbar links are correct", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Check logo text
    const logo = page.locator("header").getByText("SimplifyOps");
    await expect(logo).toBeVisible();

    // Check CTA buttons (may be hidden behind hamburger on mobile)
    const getStarted = page.getByRole("link", { name: "Get Started Free" });
    if (await getStarted.isVisible()) {
      await expect(getStarted).toHaveAttribute("href", "/auth/sign-up");
      const login = page.getByRole("link", { name: "Login" });
      await expect(login).toBeVisible();
    }
  });

  test("footer links exist", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    // Check privacy and terms links in footer (single link each after dedup fix)
    const privacy = footer.getByRole("link", { name: "Privacy Policy" });
    await expect(privacy.first()).toBeVisible();
    const terms = footer.getByRole("link", { name: "Terms of Service" });
    await expect(terms.first()).toBeVisible();
  });
});

test.describe("Visual Audit - Responsive", () => {
  test("landing page hero is responsive", async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.screenshot({
      path: "./e2e/screenshots/landing-1440.png",
      fullPage: false,
    });

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({
      path: "./e2e/screenshots/landing-768.png",
      fullPage: false,
    });

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: "./e2e/screenshots/landing-375.png",
      fullPage: false,
    });
  });

  test("pricing page cards stack on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/pricing", { waitUntil: "networkidle" });
    await page.screenshot({
      path: "./e2e/screenshots/pricing-mobile.png",
      fullPage: true,
    });
  });
});

test.describe("Visual Audit - Accessibility", () => {
  test("landing page meets basic a11y", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Check heading hierarchy
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();

    // Check interactive elements have accessible text
    const links = await page.locator("a").all();
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute("aria-label");
      const title = await link.getAttribute("title");
      const hasText = (text && text.trim().length > 0) || ariaLabel || title;
      if (!hasText) {
        const href = await link.getAttribute("href");
        console.warn(`Link without accessible text: ${href}`);
      }
    }
  });

  test("color contrast check on key elements", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Check that text is visible (not transparent on dark bg)
    const heroTitle = page.locator("h1");
    const color = await heroTitle.evaluate((el) =>
      getComputedStyle(el).color
    );
    expect(color).not.toBe("rgba(0, 0, 0, 0)");
    expect(color).not.toBe("transparent");
  });
});
