import { expect, test } from "@playwright/test";

test("uploads a dropped file with progress, then deletes it", async ({ page }) => {
  await page.goto("/tasks/new");
  await page.getByLabel("Title").fill(`E2E attachments ${Date.now()}`);
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/);

  const files = page.getByRole("region", { name: "Files" });
  await expect(files.getByText("No files yet.")).toBeVisible();

  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["Notes from Playwright\n".repeat(50_000)], "notes.txt", { type: "text/plain" }));
    return transfer;
  });
  const dropZone = files.getByText("Images, documents and videos up to 2 GB").locator("..");
  await dropZone.dispatchEvent("dragenter", { dataTransfer });
  await expect(files.getByText("Drop to upload")).toBeVisible();
  await dropZone.dispatchEvent("drop", { dataTransfer });

  await expect(files.getByRole("progressbar", { name: "Uploading notes.txt" })).toBeVisible();
  await expect(files.getByText("notes.txt")).toBeVisible();
  await expect(files.getByRole("progressbar")).toHaveCount(0);
  await expect(files.getByText("1.0 MB")).toBeVisible();

  await files.getByLabel("Upload files").setInputFiles({
    name: "malware.exe",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("MZ"),
  });
  await expect(files.getByRole("alert")).toHaveText("This file type isn't allowed.");
  await files.getByRole("button", { name: "Dismiss malware.exe" }).click();

  await files.getByRole("button", { name: "Delete notes.txt" }).click();
  await expect(files.getByText("No files yet.")).toBeVisible();
});
