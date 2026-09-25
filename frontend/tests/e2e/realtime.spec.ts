import { expect, test } from "@playwright/test";

test("shows tasks created and deleted in another session without reloading", async ({ page, browser }) => {
  const title = `Realtime task ${Date.now()}`;

  const subscribed = page.waitForResponse(
    (response) => response.url().endsWith("/api/broadcasting/auth") && response.ok(),
  );
  await page.goto("/");
  await subscribed;

  const otherSession = await browser.newContext({ storageState: "tests/e2e/.auth/admin.json" });
  const otherPage = await otherSession.newPage();

  await otherPage.goto("/tasks/new");
  await otherPage.getByLabel("Title").fill(title);
  await otherPage.getByRole("button", { name: "Create task" }).click();
  await expect(otherPage).toHaveURL(/\/tasks\/\d+$/);

  await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });

  await otherPage.getByRole("button", { name: "Delete task" }).click();
  await otherPage.getByRole("button", { name: "Yes, delete" }).click();
  await expect(otherPage).toHaveURL(/\/$/);

  await expect(page.getByText(title)).toHaveCount(0, { timeout: 15_000 });

  await otherSession.close();
});
