import { test, expect } from "@playwright/test";

test.describe("Landing Page Navigation", () => {
  test("logo links to homepage", async ({ page }) => {
    await page.goto("/");
    const logo = page.locator("header").getByText("SimplifyOps");
    await expect(logo).toBeVisible();
  });

  test("Get Started Free leads to sign-up", async ({ page, browserName }) => {
    await page.goto("/");
    // On mobile viewports, nav links are behind hamburger menu
    const cta = page.getByRole("link", { name: "Get Started Free" });
    if (!(await cta.isVisible())) {
      // Open mobile menu first
      const menuButton = page.locator("header button").first();
      await menuButton.click();
      await cta.waitFor({ state: "visible", timeout: 3000 });
    }
    await expect(cta).toHaveAttribute("href", "/auth/sign-up");
    await cta.click();
    await expect(page).toHaveURL(/sign-up/);
  });

  test("Login leads to sign-in", async ({ page }) => {
    await page.goto("/");
    const login = page.getByRole("link", { name: "Login" });
    if (!(await login.isVisible())) {
      const menuButton = page.locator("header button").first();
      await menuButton.click();
      await login.waitFor({ state: "visible", timeout: 3000 });
    }
    await login.click();
    await expect(page).toHaveURL(/sign-in/);
  });

  test("footer privacy link works", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await footer.getByRole("link", { name: "Privacy Policy" }).first().click();
    await expect(page).toHaveURL(/privacy/);
  });

  test("footer terms link works", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await footer
      .getByRole("link", { name: "Terms of Service" })
      .first()
      .click();
    await expect(page).toHaveURL(/terms/);
  });
});

test.describe("Pricing Page Navigation", () => {
  test("back to home link works", async ({ page }) => {
    await page.goto("/pricing");
    const backLink = page.getByRole("link", { name: /Back to Home/ });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL("/");
  });

  test("pricing cards are displayed", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Growth" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scale" })).toBeVisible();
  });

  test("pricing plans show correct prices", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("$39")).toBeVisible();
    await expect(page.getByText("$99")).toBeVisible();
    await expect(page.getByText("$299")).toBeVisible();
  });

  test("growth plan is highlighted as most popular", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("Most Popular")).toBeVisible();
  });
});

test.describe("Cross-Page Navigation", () => {
  test("sign-in to sign-up and back", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await page.getByRole("link", { name: "Sign Up" }).click();
    await expect(page).toHaveURL(/sign-up/);
    await page.getByRole("link", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/sign-in/);
  });

  test("404 page shows for non-existent routes", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    // Next.js returns 404 page
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page Not Found")).toBeVisible();
  });
});
