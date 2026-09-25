import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriorityLabel, StatusBadge } from "@/components/task-badges";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types";

describe("StatusBadge", () => {
  it.each([
    ["pending", "Pending"],
    ["in_progress", "In progress"],
    ["completed", "Completed"],
    ["cancelled", "Cancelled"],
  ] as const)("shows %s as %s", (status, label) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("gives every status its own look", () => {
    const classes = TASK_STATUSES.map((status) => {
      const { container, unmount } = render(<StatusBadge status={status} />);
      const className = container.firstElementChild!.className;
      unmount();
      return className;
    });

    expect(new Set(classes).size).toBe(TASK_STATUSES.length);
  });
});

describe("PriorityLabel", () => {
  it.each([
    ["low", "Low"],
    ["medium", "Medium"],
    ["high", "High"],
    ["urgent", "Urgent"],
  ] as const)("shows %s as %s", (priority, label) => {
    render(<PriorityLabel priority={priority} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("gives every priority its own look", () => {
    const classes = TASK_PRIORITIES.map((priority) => {
      const { container, unmount } = render(<PriorityLabel priority={priority} />);
      const className = container.firstElementChild!.className;
      unmount();
      return className;
    });

    expect(new Set(classes).size).toBe(TASK_PRIORITIES.length);
  });
});
