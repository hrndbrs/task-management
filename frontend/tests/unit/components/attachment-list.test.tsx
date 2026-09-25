import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttachmentList } from "@/app/(dashboard)/tasks/[id]/attachment-list";
import type { Attachment } from "@/lib/types";

vi.mock("@/app/actions/attachments", () => ({ deleteAttachment: vi.fn() }));

function attachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: 7,
    task_id: 3,
    version: 1,
    file_name: "report.pdf",
    file_size: 1_572_864,
    mime_type: "application/pdf",
    scan_status: "clean",
    scanned_at: "2026-09-26T10:00:00Z",
    uploaded_at: "2026-09-26T09:59:00Z",
    thumbnail_url: null,
    ...overrides,
  };
}

describe("AttachmentList", () => {
  it("says when there are no files", () => {
    render(<AttachmentList attachments={[]} canDelete />);

    expect(screen.getByText("No files yet.")).toBeInTheDocument();
  });

  it("links a clean file to its download through the proxy, with its size", () => {
    render(<AttachmentList attachments={[attachment()]} canDelete={false} />);

    const link = screen.getByRole("link", { name: "report.pdf" });
    expect(link).toHaveAttribute("href", "/api/attachments/7/download");
    expect(link).toHaveAttribute("download", "report.pdf");
    expect(screen.getByText("1.5 MB")).toBeInTheDocument();
  });

  it("shows the version number after the first version", () => {
    render(<AttachmentList attachments={[attachment({ version: 3 })]} canDelete={false} />);

    expect(screen.getByText("1.5 MB · v3")).toBeInTheDocument();
  });

  it.each([
    ["pending", "Scanning for viruses…"],
    ["infected", "Removed: failed virus scan"],
  ] as const)("does not offer a %s file for download", (scan_status, note) => {
    render(<AttachmentList attachments={[attachment({ scan_status })]} canDelete={false} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent(note);
  });

  it("shows a clean image's thumbnail through the proxy", () => {
    render(
      <AttachmentList
        attachments={[attachment({ file_name: "photo.png", thumbnail_url: "http://api/attachments/7/thumbnail" })]}
        canDelete={false}
      />,
    );

    expect(screen.getByRole("listitem").querySelector("img")).toHaveAttribute(
      "src",
      "/api/attachments/7/thumbnail",
    );
  });

  it("shows the file type instead of a thumbnail until the image is clean", () => {
    render(
      <AttachmentList
        attachments={[
          attachment({ file_name: "photo.jpeg", scan_status: "pending", thumbnail_url: "http://api/attachments/7/thumbnail" }),
        ]}
        canDelete={false}
      />,
    );

    const item = screen.getByRole("listitem");
    expect(item.querySelector("img")).toBeNull();
    expect(within(item).getByText("JPEG")).toBeInTheDocument();
  });

  it("offers delete only to users who can edit the task", () => {
    const { rerender } = render(<AttachmentList attachments={[attachment()]} canDelete={false} />);
    expect(screen.queryByRole("button", { name: "Delete report.pdf" })).not.toBeInTheDocument();

    rerender(<AttachmentList attachments={[attachment()]} canDelete />);
    expect(screen.getByRole("button", { name: "Delete report.pdf" })).toBeInTheDocument();
  });
});
