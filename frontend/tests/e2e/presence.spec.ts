import { type Browser, expect, type Page, test } from "@playwright/test";
import { admin } from "./credentials";

const apiUrl = process.env.E2E_API_URL ?? "http://localhost:8000/api";

type Member = { name: string; email: string; role: string };

async function findMember(page: Page): Promise<Member> {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "token")!.value;
  const users = await page.request.get(`${apiUrl}/users`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const { data } = (await users.json()) as { data: Member[] };
  return data.find((user) => user.role === "member")!;
}

async function signIn(browser: Browser, member: Member) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(member.email);
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  return { context, page };
}

test("shows who else is viewing a task and when they are typing", async ({ page, browser }) => {
  const member = await findMember(page);

  await page.goto("/tasks/new");
  await page.getByLabel("Title").fill(`E2E presence ${Date.now()}`);
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/);
  const taskUrl = page.url();

  await expect(page.getByText(/\d+ online$/)).toBeVisible({ timeout: 15_000 });

  const { context, page: memberPage } = await signIn(browser, member);
  await expect(page.getByRole("list", { name: "Online users" }).locator(`[title="${member.name}"]`)).toBeVisible({
    timeout: 15_000,
  });

  await memberPage.goto(taskUrl);
  await expect(page.getByText(`${member.name} is also here`)).toBeVisible({ timeout: 15_000 });
  await expect(memberPage.getByText(`${admin.name} is also here`)).toBeVisible({ timeout: 15_000 });

  const box = memberPage.getByLabel("Add a comment");
  await box.pressSequentially("Looking into it");
  await expect(page.getByText(`${member.name} is typing…`)).toBeVisible({ timeout: 15_000 });

  await box.clear();
  await expect(page.getByText(`${member.name} is typing…`)).toHaveCount(0, { timeout: 15_000 });

  await context.close();
  await expect(page.getByText(`${member.name} is also here`)).toHaveCount(0, { timeout: 15_000 });

  await page.getByRole("button", { name: "Delete task" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page).toHaveURL(/\/$/);
});
