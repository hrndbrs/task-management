import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TaskFormState } from "@/app/actions/tasks";
import { TaskForm } from "@/app/(dashboard)/tasks/task-form";
import type { Task, User } from "@/lib/types";

const users: User[] = [
  { id: 1, name: "Ada Lovelace", email: "ada@example.com", role: "admin" },
  { id: 2, name: "Grace Hopper", email: "grace@example.com", role: "member" },
];

const task: Task = {
  id: 9,
  title: "Write report",
  description: "Quarterly numbers",
  status: "in_progress",
  priority: "high",
  due_date: "2026-10-01",
  assigned_user: users[1],
  creator: users[0],
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  can: { update: true, delete: true },
};

function renderForm(action = vi.fn<(s: TaskFormState, f: FormData) => Promise<TaskFormState>>(), taskProp?: Task) {
  render(<TaskForm action={action} users={users} task={taskProp} submitLabel="Save" pendingLabel="Saving…" />);
  return action;
}

describe("TaskForm", () => {
  it("starts a new task as pending, medium priority and unassigned", () => {
    renderForm();

    expect(screen.getByLabelText("Status")).toHaveValue("pending");
    expect(screen.getByLabelText("Priority")).toHaveValue("medium");
    expect(screen.getByLabelText("Assignee")).toHaveValue("");
    expect(screen.getByRole("option", { name: "Grace Hopper" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/");
  });

  it("prefills every field from an existing task", () => {
    renderForm(undefined, task);

    expect(screen.getByLabelText("Title")).toHaveValue("Write report");
    expect(screen.getByLabelText(/Description/)).toHaveValue("Quarterly numbers");
    expect(screen.getByLabelText("Status")).toHaveValue("in_progress");
    expect(screen.getByLabelText("Priority")).toHaveValue("high");
    expect(screen.getByLabelText("Assignee")).toHaveValue("2");
    expect(screen.getByLabelText(/Due date/)).toHaveValue("2026-10-01");
    expect(screen.queryByRole("link", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("submits the entered values", async () => {
    const action = renderForm();
    action.mockResolvedValue(undefined);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Title"), "Plan sprint");
    await user.selectOptions(screen.getByLabelText("Priority"), "urgent");
    await user.selectOptions(screen.getByLabelText("Assignee"), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(Object.fromEntries(action.mock.calls[0][1])).toMatchObject({
      title: "Plan sprint",
      priority: "urgent",
      assigned_user_id: "1",
      status: "pending",
    });
  });

  it("keeps every entered value, including dropdowns, after a validation error", async () => {
    const action = renderForm();
    action.mockImplementation(async (_state, formData) => ({
      message: "The title field is required.",
      errors: { title: ["The title field is required."] },
      values: Object.fromEntries(formData) as Record<string, string>,
    }));
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Description/), "Keep me");
    await user.selectOptions(screen.getByLabelText("Status"), "in_progress");
    await user.selectOptions(screen.getByLabelText("Priority"), "high");
    await user.selectOptions(screen.getByLabelText("Assignee"), "Grace Hopper");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("The title field is required.")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Description/)).toHaveValue("Keep me");
    expect(screen.getByLabelText("Status")).toHaveValue("in_progress");
    expect(screen.getByLabelText("Priority")).toHaveValue("high");
    expect(screen.getByLabelText("Assignee")).toHaveValue("2");
  });

  it("shows a non-field error as an alert", async () => {
    const action = renderForm(undefined, task);
    action.mockResolvedValue({ message: "You don't have permission to change this task." });

    await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You don't have permission to change this task.");
  });

  it("confirms a successful save", async () => {
    const action = renderForm(undefined, task);
    action.mockResolvedValue({ saved: true });

    await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
  });
});
