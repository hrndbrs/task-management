import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 320, height: 640 } });

for (const path of ["/", "/tasks/new", "/tasks/1"]) {
  test(`${path} fits a narrow phone without horizontal scrolling`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
}

test("stacks task details under the title on a phone", async ({ page }) => {
  await page.goto("/");

  const row = page.getByRole("list").getByRole("link").first();
  const title = await row.locator("span").first().boundingBox();
  const status = await row.locator("span").nth(1).boundingBox();

  expect(status!.y).toBeGreaterThan(title!.y + title!.height - 1);
});

test("uses 16px form text on a phone so iOS doesn't zoom on focus", async ({ page }) => {
  await page.goto("/tasks/new");

  await expect(page.getByLabel("Title")).toHaveCSS("font-size", "16px");
});
