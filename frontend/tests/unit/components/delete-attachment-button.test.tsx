import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { deleteAttachment } from "@/app/actions/attachments";
import { DeleteAttachmentButton } from "@/app/(dashboard)/tasks/[id]/delete-attachment-button";
import type { Attachment } from "@/lib/types";

vi.mock("@/app/actions/attachments", () => ({ deleteAttachment: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const attachment = { id: 7, file_name: "report.pdf" } as Attachment;

describe("DeleteAttachmentButton", () => {
  it("deletes the file and confirms it", async () => {
    vi.mocked(deleteAttachment).mockResolvedValue({});
    render(<DeleteAttachmentButton attachment={attachment} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Delete report.pdf" }));

    expect(deleteAttachment).toHaveBeenCalledWith(7);
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("report.pdf deleted"));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows why the file couldn't be deleted", async () => {
    vi.mocked(deleteAttachment).mockResolvedValue({ message: "You don't have permission to delete this file." });
    render(<DeleteAttachmentButton attachment={attachment} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Delete report.pdf" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("You don't have permission to delete this file."),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("disables itself while deleting", async () => {
    vi.mocked(deleteAttachment).mockReturnValue(new Promise(() => {}));
    render(<DeleteAttachmentButton attachment={attachment} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Delete report.pdf" }));

    expect(await screen.findByRole("button", { name: "Delete report.pdf" })).toBeDisabled();
    expect(screen.getByRole("button")).toHaveTextContent("Deleting…");
  });
});
