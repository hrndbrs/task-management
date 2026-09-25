import { expect, test } from "@playwright/test";

test("shows comments posted and deleted in another session without reloading", async ({ page, browser }) => {
  await page.goto("/tasks/new");
  await page.getByLabel("Title").fill(`E2E comments ${Date.now()}`);
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/);
  const taskUrl = page.url();
  const taskId = taskUrl.split("/").pop();

  const subscribed = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/broadcasting/auth") &&
      response.request().postData()?.includes(`private-tasks.${taskId}`) === true &&
      response.ok(),
  );
  await page.reload();
  await subscribed;
  await expect(page.getByText("No comments yet.")).toBeVisible();

  const otherSession = await browser.newContext({ storageState: "tests/e2e/.auth/admin.json" });
  const otherPage = await otherSession.newPage();
  await otherPage.goto(taskUrl);

  const text = `Live comment ${Date.now()}`;
  const box = otherPage.getByLabel("Add a comment");
  await box.fill(text);
  await box.press("ControlOrMeta+Enter");
  await expect(box).toHaveValue("");
  await expect(otherPage.getByRole("list", { name: "Comments" }).getByText(text)).toHaveCount(1);

  const comments = page.getByRole("list", { name: "Comments" });
  await expect(comments.getByText(text)).toBeVisible({ timeout: 15_000 });

  await otherPage.getByRole("button", { name: /^Delete comment by / }).click();
  await expect(comments.getByText(text)).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByText("No comments yet.")).toBeVisible();

  await otherSession.close();
  await page.getByRole("button", { name: "Delete task" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("does not post a blank comment", async ({ page }) => {
  await page.goto("/tasks/1");

  const box = page.getByLabel("Add a comment");
  await box.fill("   ");
  await expect(page.getByRole("button", { name: "Comment", exact: true })).toBeDisabled();
});
