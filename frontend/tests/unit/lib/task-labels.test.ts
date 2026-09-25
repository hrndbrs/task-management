import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDueDate, isOverdue } from "@/lib/task-labels";

describe("formatDueDate", () => {
  it("formats the calendar date without shifting it across timezones", () => {
    expect(formatDueDate("2026-01-01")).toBe("Jan 1, 2026");
  });
});

describe("isOverdue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 25, 12));
  });
  afterEach(() => vi.useRealTimers());

  it("flags open tasks due before today", () => {
    expect(isOverdue("2026-09-24", "pending")).toBe(true);
    expect(isOverdue("2026-09-24", "in_progress")).toBe(true);
  });

  it("does not flag tasks due today or later", () => {
    expect(isOverdue("2026-09-25", "pending")).toBe(false);
    expect(isOverdue("2026-10-01", "pending")).toBe(false);
  });

  it("does not flag finished tasks or tasks without a due date", () => {
    expect(isOverdue("2026-09-01", "completed")).toBe(false);
    expect(isOverdue("2026-09-01", "cancelled")).toBe(false);
    expect(isOverdue(null, "pending")).toBe(false);
  });
});
