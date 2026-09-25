import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const toasts = (page: Page) => page.getByRole("region", { name: /^Notifications/ });

async function createTask(page: Page, title: string) {
  await page.goto("/tasks/new");
  await page.getByLabel("Title").fill(title);
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

async function exportAs(page: Page, format: "CSV" | "PDF") {
  const download = page.waitForEvent("download", { timeout: 30_000 });
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("menuitem", { name: format }).click();
  return download;
}

test("exports the filtered task list as CSV and PDF", async ({ page }) => {
  const tag = `export${Date.now()}`;
  const first = await createTask(page, `${tag} first`);
  const second = await createTask(page, `${tag} second`);

  try {
    await page.goto(`/?search=${tag}`);
    await expect(page.getByText("2 tasks match your filters")).toBeVisible();

    const csv = await exportAs(page, "CSV");
    await expect(toasts(page).getByText("CSV export ready: 2 tasks")).toBeVisible();
    expect(csv.suggestedFilename()).toMatch(/^tasks-export-.+\.csv$/);
    const rows = (await readFile(await csv.path(), "utf8")).trim().split("\n");
    expect(rows[0]).toContain("Title");
    expect(rows).toHaveLength(3);
    expect(rows.slice(1).join("\n")).toContain(`${tag} first`);
    expect(rows.slice(1).join("\n")).toContain(`${tag} second`);

    const pdf = await exportAs(page, "PDF");
    await expect(toasts(page).getByText("PDF export ready: 2 tasks")).toBeVisible();
    expect(pdf.suggestedFilename()).toMatch(/^tasks-export-.+\.pdf$/);
    expect((await readFile(await pdf.path())).subarray(0, 5).toString()).toBe("%PDF-");
  } finally {
    await deleteTask(page, first);
    await deleteTask(page, second);
  }
});
