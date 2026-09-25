import { expect, test as setup } from "@playwright/test";
import { admin } from "./credentials";

setup("sign in as the seeded admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password").fill(admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  await page.context().storageState({ path: "tests/e2e/.auth/admin.json" });
});
