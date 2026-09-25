import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTask, getTasks, getUsers } from "@/lib/tasks";
import { cookieJar, json, mockFetch, redirectOf, requestOf } from "@/tests/unit/fakes";

vi.mock("next/headers", async () => (await import("@/tests/unit/fakes")).nextHeaders);
vi.mock("next/navigation", async () => (await import("@/tests/unit/fakes")).nextNavigation);

const page = { data: [], meta: { current_page: 2, last_page: 3, per_page: 15, total: 40, from: 16, to: 30 } };

describe("task data", () => {
  beforeEach(() => cookieJar.set("token", { value: "jwt" }));

  it("requests the given page of tasks", async () => {
    const fetchMock = mockFetch(json(200, page));

    const result = await getTasks(2);

    expect(requestOf(fetchMock).url).toBe("http://localhost:8000/api/tasks?page=2&per_page=15");
    expect(result.meta.current_page).toBe(2);
  });

  it("returns null for a task that does not exist", async () => {
    mockFetch(json(404, { message: "Not found" }));

    expect(await getTask(404)).toBeNull();
  });

  it("unwraps the users list", async () => {
    const users = [{ id: 1, name: "Ada", email: "ada@example.com", role: "admin" }];
    mockFetch(json(200, { data: users }));

    expect(await getUsers()).toEqual(users);
  });

  it("redirects to login when the token is rejected", async () => {
    mockFetch(json(401, { message: "Unauthenticated." }));

    expect(await redirectOf(getTasks())).toBe("/login");
  });

  it("throws on unexpected server errors", async () => {
    mockFetch(json(500, {}));

    await expect(getUsers()).rejects.toThrow("GET /users failed with 500");
  });
});
