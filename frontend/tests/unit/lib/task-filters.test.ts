import { describe, expect, it } from "vitest";
import { DEFAULT_SORT, dashboardHref, hasActiveFilters, parseTaskFilters } from "@/lib/task-filters";

describe("parseTaskFilters", () => {
  it("defaults to every task, newest first, on page 1", () => {
    expect(parseTaskFilters({})).toEqual({
      search: "",
      status: "",
      priority: "",
      assigned_user_id: "",
      sort: DEFAULT_SORT,
      page: 1,
    });
  });

  it("reads valid filters from the URL", () => {
    expect(
      parseTaskFilters({
        search: "  quarterly report ",
        status: "in_progress",
        priority: "urgent",
        assigned_user_id: "12",
        sort: "priority",
        direction: "desc",
        page: "3",
      }),
    ).toEqual({
      search: "quarterly report",
      status: "in_progress",
      priority: "urgent",
      assigned_user_id: "12",
      sort: "priority:desc",
      page: 3,
    });
  });

  it("ignores values the API would reject", () => {
    expect(
      parseTaskFilters({
        status: "archived",
        priority: "HIGH",
        assigned_user_id: "1 OR 1=1",
        sort: "password",
        direction: "asc",
        page: "-4",
      }),
    ).toEqual(parseTaskFilters({}));
  });

  it("takes the first of repeated params and caps the search length", () => {
    const filters = parseTaskFilters({ status: ["completed", "pending"], search: "x".repeat(300) });

    expect(filters.status).toBe("completed");
    expect(filters.search).toHaveLength(255);
  });
});

describe("dashboardHref", () => {
  it("keeps the URL bare for the default view", () => {
    expect(dashboardHref(parseTaskFilters({}))).toBe("/");
  });

  it("writes only the filters that differ from the default", () => {
    const filters = parseTaskFilters({ search: "a b", priority: "high", sort: "title", direction: "asc", page: "2" });

    expect(dashboardHref(filters)).toBe("/?search=a+b&priority=high&sort=title&direction=asc&page=2");
  });

  it("round-trips through parseTaskFilters", () => {
    const filters = parseTaskFilters({ status: "cancelled", assigned_user_id: "4", sort: "due_date", direction: "asc" });
    const params = new URL(dashboardHref(filters), "http://x").searchParams;

    expect(parseTaskFilters(Object.fromEntries(params))).toEqual(filters);
  });
});

describe("hasActiveFilters", () => {
  it("does not count sort or page as a filter", () => {
    expect(hasActiveFilters(parseTaskFilters({ sort: "title", direction: "asc", page: "2" }))).toBe(false);
    expect(hasActiveFilters(parseTaskFilters({ search: "x" }))).toBe(true);
  });
});
