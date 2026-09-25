import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskFilterBar } from "@/app/(dashboard)/task-filter-bar";
import { parseTaskFilters } from "@/lib/task-filters";
import type { User } from "@/lib/types";

const router = { replace: vi.fn() };

vi.mock("next/navigation", () => ({ useRouter: () => router }));

const users: User[] = [
  { id: 3, name: "Ada Lovelace", email: "ada@example.com", role: "member" },
  { id: 4, name: "Alan Turing", email: "alan@example.com", role: "admin" },
];

function renderBar(params: Record<string, string> = {}) {
  return render(<TaskFilterBar filters={parseTaskFilters(params)} users={users} />);
}

describe("TaskFilterBar", () => {
  beforeEach(() => router.replace.mockReset());
  afterEach(() => vi.useRealTimers());

  it("shows the current filters", () => {
    renderBar({ search: "report", status: "pending", assigned_user_id: "4", sort: "due_date", direction: "asc" });

    expect(screen.getByRole("searchbox", { name: "Search" })).toHaveValue("report");
    expect(screen.getByLabelText("Status")).toHaveValue("pending");
    expect(screen.getByLabelText("Priority")).toHaveValue("");
    expect(screen.getByLabelText("Assignee")).toHaveValue("4");
    expect(screen.getByLabelText("Sort by")).toHaveValue("due_date:asc");
  });

  it("applies a filter straight away and returns to page 1", async () => {
    renderBar({ priority: "high", page: "3" });

    await userEvent.setup().selectOptions(screen.getByLabelText("Status"), "completed");

    expect(router.replace).toHaveBeenCalledWith("/?status=completed&priority=high", { scroll: false });
  });

  it("changes the sort order", async () => {
    renderBar();

    await userEvent.setup().selectOptions(screen.getByLabelText("Sort by"), "Priority");

    expect(router.replace).toHaveBeenCalledWith("/?sort=priority&direction=desc", { scroll: false });
  });

  it("waits for a pause in typing before searching", () => {
    vi.useFakeTimers();
    renderBar({ status: "pending" });
    const search = screen.getByRole("searchbox", { name: "Search" });

    fireEvent.change(search, { target: { value: "quar" } });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.change(search, { target: { value: "quarterly " } });
    act(() => vi.advanceTimersByTime(299));
    expect(router.replace).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(router.replace).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledWith("/?search=quarterly&status=pending", { scroll: false });
  });

  it("searches immediately on Enter", async () => {
    renderBar();

    await userEvent.setup().type(screen.getByRole("searchbox", { name: "Search" }), "bug{Enter}");

    expect(router.replace).toHaveBeenCalledWith("/?search=bug", { scroll: false });
  });

  it("keeps a pending search when another filter changes", async () => {
    vi.useFakeTimers();
    renderBar();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), { target: { value: "bug" } });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "urgent" } });
    act(() => vi.advanceTimersByTime(1000));

    expect(router.replace).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledWith("/?search=bug&priority=urgent", { scroll: false });
  });

  it("clears filters but keeps the sort order", async () => {
    renderBar({ search: "bug", status: "pending", sort: "title", direction: "asc" });

    await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters" }));

    expect(router.replace).toHaveBeenCalledWith("/?sort=title&direction=asc", { scroll: false });
    expect(screen.getByRole("searchbox", { name: "Search" })).toHaveValue("");
  });

  it("offers to clear only when something is filtered", () => {
    renderBar({ sort: "title", direction: "asc" });

    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("shows the search from the URL after back/forward navigation", () => {
    const { rerender } = renderBar({ search: "old" });

    rerender(<TaskFilterBar filters={parseTaskFilters({ search: "new" })} users={users} />);

    expect(screen.getByRole("searchbox", { name: "Search" })).toHaveValue("new");
  });
});
