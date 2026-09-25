import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

test.use({ channel: "chrome" });
test.skip(!CHROME_PATHS.some(existsSync), "Needs Google Chrome: Playwright's Chromium can't decode H.264 video");

test("uploads a video, streams it with adaptive quality levels and plays it", async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto("/tasks/new");
  await page.getByLabel("Title").fill(`E2E video ${Date.now()}`);
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/);

  try {
    const files = page.getByRole("region", { name: "Files" });
    await files.getByLabel("Upload files").setInputFiles("tests/e2e/fixtures/clip.mp4");

    const play = files.getByRole("button", { name: "Play clip.mp4" });
    await expect(play).toBeVisible({ timeout: 60_000 });
    await expect(files.getByText("0:03")).toBeVisible();
    await expect(files.getByRole("listitem").locator("img")).toHaveAttribute("src", /\/thumbnail$/);

    const segment = page.waitForResponse((r) => /\/stream\/stream_\d+\/seg_\d+\.ts$/.test(r.url()) && r.ok());
    await play.click();
    await segment;

    const quality = files.getByLabel("Quality");
    await expect(quality.locator("option")).toHaveText(["Auto", "720p", "360p"]);

    const video = files.getByLabel("clip.mp4", { exact: true });
    await video.evaluate(async (element: HTMLVideoElement) => {
      element.muted = true;
      await element.play();
    });
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0.5);

    await quality.selectOption("360p");
    await expect(quality).toHaveValue(/^\d+$/);
  } finally {
    await page.getByRole("button", { name: "Delete task" }).click();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page).toHaveURL(/\/$/);
  }
});
