import { expect, test } from "@playwright/test";

test("lists tasks with pagination", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  await expect(page.getByRole("listitem").first()).toBeVisible();

  const pagination = page.getByRole("navigation", { name: "Pagination" });
  if (await pagination.isVisible()) {
    await pagination.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/\?page=2$/);
    await expect(pagination).toContainText("Page 2 of");
  }
});

test("creates, edits and deletes a task", async ({ page }) => {
  const title = `E2E task ${Date.now()}`;

  await page.goto("/");
  await page.getByRole("link", { name: "New task" }).click();
  await expect(page).toHaveURL(/\/tasks\/new$/);

  await page.getByLabel("Description").fill("Created by Playwright");
  await page.getByLabel("Priority").selectOption("high");
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(page.getByText("The title field is required.")).toBeVisible();
  await expect(page.getByLabel("Description")).toHaveValue("Created by Playwright");
  await expect(page.getByLabel("Priority")).toHaveValue("high");

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Due date").fill("2030-01-15");
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(page).toHaveURL(/\/tasks\/\d+$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const taskUrl = page.url();

  await page.getByLabel("Title").fill(`${title} (edited)`);
  await page.getByLabel("Status").selectOption("completed");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByRole("status")).toHaveText("Saved");
  await expect(page.getByRole("heading", { name: `${title} (edited)` })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Status")).toHaveValue("completed");

  await page.goto("/");
  await expect(page.getByRole("link", { name: new RegExp(`${title} \\(edited\\)`) })).toBeVisible();

  await page.goto(taskUrl);
  await page.getByRole("button", { name: "Delete task" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(title)).toHaveCount(0);

  const response = await page.goto(taskUrl);
  expect(response?.status()).toBe(404);
});
