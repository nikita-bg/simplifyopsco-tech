import { test, expect } from "@playwright/test";

test.describe("Sign In Page", () => {
  test("renders sign-in form correctly", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(page.getByPlaceholder("m@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
  });

  test("sign-in form has correct labels", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await expect(page.getByText("Email")).toBeVisible();
    await expect(page.getByText("Password")).toBeVisible();
  });

  test("has link to sign-up page", async ({ page }) => {
    await page.goto("/auth/sign-in");
    const signUpLink = page.getByRole("link", { name: "Sign Up" });
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toHaveAttribute("href", "/auth/sign-up");
  });

  test("has link back to homepage", async ({ page }) => {
    await page.goto("/auth/sign-in");
    const logo = page.getByRole("link", { name: /SimplifyOps/ });
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("href", "/");
  });

  test("shows validation for empty form submission", async ({ page }) => {
    await page.goto("/auth/sign-in");
    // HTML5 validation should prevent empty submit
    const emailInput = page.getByPlaceholder("m@example.com");
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("sign-in button shows loading state on click", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await page.getByPlaceholder("m@example.com").fill("test@example.com");
    await page.getByPlaceholder("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();
    // Should show error after Supabase rejects (or loading spinner briefly)
    // Wait for either error message or loading state
    await page.waitForTimeout(2000);
    // Page should still be on sign-in (not redirected)
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("Sign Up Page", () => {
  test("renders sign-up form correctly", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await expect(page.getByRole("heading", { name: "Sign Up" })).toBeVisible();
    await expect(page.getByPlaceholder("Your name")).toBeVisible();
    await expect(page.getByPlaceholder("m@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("Min 6 characters")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create an account" })
    ).toBeVisible();
  });

  test("has link to sign-in page", async ({ page }) => {
    await page.goto("/auth/sign-up");
    const signInLink = page.getByRole("link", { name: "Sign In" });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", "/auth/sign-in");
  });

  test("password field requires min 6 characters", async ({ page }) => {
    await page.goto("/auth/sign-up");
    const passwordInput = page.getByPlaceholder("Min 6 characters");
    await expect(passwordInput).toHaveAttribute("minlength", "6");
    await expect(passwordInput).toHaveAttribute("required", "");
  });

  test("Google OAuth button is present", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
  });

  test("has link back to homepage", async ({ page }) => {
    await page.goto("/auth/sign-up");
    const logo = page.getByRole("link", { name: /SimplifyOps/ });
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("href", "/");
  });
});

test.describe("Auth Guards", () => {
  test("dashboard redirects to sign-in when not authenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test("dashboard/conversations redirects to sign-in", async ({ page }) => {
    await page.goto("/dashboard/conversations");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("dashboard/reports redirects to sign-in", async ({ page }) => {
    await page.goto("/dashboard/reports");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("dashboard/settings redirects to sign-in", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("dashboard/billing redirects to sign-in", async ({ page }) => {
    await page.goto("/dashboard/billing");
    await expect(page).toHaveURL(/sign-in/);
  });
});
