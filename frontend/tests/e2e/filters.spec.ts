import { expect, test, type Page } from "@playwright/test";

async function createTask(page: Page, title: string, priority: string) {
  await page.goto("/tasks/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Priority").selectOption(priority);
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/);
  return page.url();
}

async function deleteTask(page: Page, url: string) {
  await page.goto(url);
  await page.getByRole("button", { name: "Delete task" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("searches, filters and sorts the task list through the URL", async ({ page }) => {
  const tag = `filter${Date.now()}`;
  const urgent = await createTask(page, `${tag} alpha`, "urgent");
  const low = await createTask(page, `${tag} beta`, "low");
  const tasks = page.getByRole("list", { name: "Tasks" });

  try {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Search" }).fill(tag);

    await expect(page).toHaveURL(`/?search=${tag}`);
    await expect(tasks.getByRole("link")).toHaveCount(2);
    await expect(page.getByText("2 tasks match your filters")).toBeVisible();

    await page.getByLabel("Sort by").selectOption("Title A–Z");
    await expect(page).toHaveURL(`/?search=${tag}&sort=title&direction=asc`);
    await expect(tasks.getByRole("link").first()).toContainText(`${tag} alpha`);

    await page.getByLabel("Priority").selectOption("low");
    await expect(page).toHaveURL(`/?search=${tag}&priority=low&sort=title&direction=asc`);
    await expect(tasks.getByRole("link")).toHaveCount(1);
    await expect(tasks.getByRole("link")).toContainText(`${tag} beta`);

    await page.reload();
    await expect(page.getByRole("searchbox", { name: "Search" })).toHaveValue(tag);
    await expect(page.getByLabel("Priority")).toHaveValue("low");
    await expect(tasks.getByRole("link")).toHaveCount(1);

    await page.getByLabel("Status").selectOption("completed");
    await expect(page.getByText("No matching tasks")).toBeVisible();

    await page.getByRole("link", { name: "clear the filters" }).click();
    await expect(page).toHaveURL("/?sort=title&direction=asc");
    await expect(page.getByRole("searchbox", { name: "Search" })).toHaveValue("");

    await page.goBack();
    await expect(page.getByRole("searchbox", { name: "Search" })).toHaveValue(tag);
  } finally {
    await deleteTask(page, urgent);
    await deleteTask(page, low);
  }
});

test("keeps filters when paging", async ({ page }) => {
  await page.goto("/?sort=title&direction=asc");

  const next = page.getByRole("navigation", { name: "Pagination" }).getByRole("link", { name: "Next" });
  test.skip(!(await next.isVisible()), "Needs more than one page of tasks");

  await expect(next).toHaveAttribute("href", "/?sort=title&direction=asc&page=2");
});
