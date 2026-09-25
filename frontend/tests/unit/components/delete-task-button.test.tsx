import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { deleteTask } from "@/app/actions/tasks";
import { DeleteTaskButton } from "@/app/(dashboard)/tasks/[id]/delete-task-button";

vi.mock("@/app/actions/tasks", () => ({ deleteTask: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

describe("DeleteTaskButton", () => {
  it("asks for confirmation before deleting", async () => {
    render(<DeleteTaskButton taskId={5} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Delete task" }));

    expect(screen.getByText("Delete this task?")).toBeInTheDocument();
    expect(deleteTask).not.toHaveBeenCalled();
  });

  it("backs out without deleting when cancelled", async () => {
    render(<DeleteTaskButton taskId={5} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Delete task" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Delete task" })).toBeInTheDocument();
    expect(deleteTask).not.toHaveBeenCalled();
  });

  it("deletes the task once confirmed", async () => {
    vi.mocked(deleteTask).mockReturnValue(new Promise(() => {}));
    render(<DeleteTaskButton taskId={5} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Delete task" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete" }));

    expect(deleteTask).toHaveBeenCalledWith(5);
    expect(await screen.findByRole("button", { name: "Deleting…" })).toBeDisabled();
  });

  it("shows the reason when deleting fails", async () => {
    vi.mocked(deleteTask).mockResolvedValue({ message: "You don't have permission to change this task." });
    render(<DeleteTaskButton taskId={5} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Delete task" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete" }));

    expect(await screen.findByRole("button", { name: "Delete task" })).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("You don't have permission to change this task.");
  });
});
