import { beforeEach, describe, expect, it, vi } from "vitest";
import { getExport, requestExport } from "@/app/actions/exports";
import { parseTaskFilters } from "@/lib/task-filters";
import { cookieJar, json, mockFetch, redirectOf, requestOf } from "@/tests/unit/fakes";

vi.mock("next/headers", async () => (await import("@/tests/unit/fakes")).nextHeaders);
vi.mock("next/navigation", async () => (await import("@/tests/unit/fakes")).nextNavigation);

const pending = { id: 4, format: "pdf", status: "pending", row_count: null };

describe("requestExport", () => {
  beforeEach(() => cookieJar.set("token", { value: "jwt" }));

  it("requests an export of exactly the tasks the list is showing", async () => {
    const fetchMock = mockFetch(json(202, { data: pending }));
    const filters = parseTaskFilters({
      search: "report",
      status: "pending",
      priority: "high",
      assigned_user_id: "3",
      sort: "due_date",
      direction: "asc",
      page: "2",
    });

    expect(await requestExport("pdf", filters)).toEqual({ export: pending });
    expect(requestOf(fetchMock)).toMatchObject({
      url: "http://localhost:8000/api/exports",
      method: "POST",
      body: {
        format: "pdf",
        search: "report",
        status: "pending",
        priority: "high",
        assigned_user_id: 3,
        sort: "due_date",
        direction: "asc",
      },
    });
  });

  it("sends only the format and default sort when nothing is filtered", async () => {
    const fetchMock = mockFetch(json(202, { data: { ...pending, format: "csv" } }));

    await requestExport("csv", parseTaskFilters({}));

    expect(requestOf(fetchMock).body).toEqual({ format: "csv", sort: "created_at", direction: "desc" });
  });

  it("passes on why the API refused the export", async () => {
    const message = "PDF exports are limited to 2000 tasks, but these filters match 2500. Use CSV or narrow the filters.";
    mockFetch(json(422, { message, errors: { format: [message] } }));

    expect(await requestExport("pdf", parseTaskFilters({}))).toEqual({ message });
  });

  it.each([
    [json(500, {}), "Couldn't start the export. Try again."],
    [new TypeError("fetch failed"), "Can't reach the server. Try again shortly."],
  ])("explains a failure", async (response, message) => {
    mockFetch(response);

    expect(await requestExport("csv", parseTaskFilters({}))).toEqual({ message });
  });

  it("sends an expired session to the login page", async () => {
    mockFetch(json(401, {}));

    expect(await redirectOf(requestExport("csv", parseTaskFilters({})))).toBe("/login");
  });
});

describe("getExport", () => {
  beforeEach(() => cookieJar.set("token", { value: "jwt" }));

  it("returns the export's current state", async () => {
    const completed = { ...pending, status: "completed", row_count: 12 };
    const fetchMock = mockFetch(json(200, { data: completed }));

    expect(await getExport(4)).toEqual({ export: completed });
    expect(requestOf(fetchMock)).toMatchObject({ url: "http://localhost:8000/api/exports/4", method: "GET" });
  });

  it("reports an export that belongs to someone else or no longer exists", async () => {
    mockFetch(json(404, {}));

    expect(await getExport(4)).toEqual({ message: "This export no longer exists." });
  });
});
