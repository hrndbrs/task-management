import { expect, test } from "@playwright/test";
import { admin } from "./credentials";

test.use({ storageState: { cookies: [], origins: [] } });

test("rejects wrong credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("main").getByRole("alert")).toHaveText("The provided credentials are incorrect.");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Email")).toHaveValue("nobody@example.com");
});

test("returns to the requested page after sign-in and ends the session on logout", async ({ page }) => {
  await page.goto("/tasks/new");
  await expect(page).toHaveURL(/\/login\?from=%2Ftasks%2Fnew$/);

  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password").fill(admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/tasks\/new$/);
  await expect(page.getByRole("banner").getByText(admin.name)).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("region", { name: /^Notifications/ }).getByText("You've been signed out")).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
