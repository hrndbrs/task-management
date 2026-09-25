import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AttachmentList } from "@/app/(dashboard)/tasks/[id]/attachment-list";
import type { Attachment } from "@/lib/types";

vi.mock("@/app/actions/attachments", () => ({ deleteAttachment: vi.fn() }));
vi.mock("@/app/(dashboard)/tasks/[id]/video-player", () => ({
  VideoPlayer: ({ src, poster, title }: { src: string; poster?: string; title: string }) => (
    <div data-testid="player" data-src={src} data-poster={poster} aria-label={title} />
  ),
}));

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
    stream_status: null,
    stream_url: null,
    duration: null,
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

    const image = screen.getByRole("listitem").querySelector("img");
    expect(image).toHaveAttribute("src", "/api/attachments/7/thumbnail");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("decoding", "async");
    expect(image).toHaveAttribute("width", "40");
    expect(image).toHaveAttribute("height", "40");
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

  describe("videos", () => {
    const video = (overrides: Partial<Attachment> = {}) =>
      attachment({
        file_name: "walkthrough.mp4",
        mime_type: "video/mp4",
        stream_status: "ready",
        stream_url: "http://api/attachments/7/stream/master.m3u8",
        duration: 83.4,
        thumbnail_url: "http://api/attachments/7/thumbnail",
        ...overrides,
      });

    it("shows the video's length", () => {
      render(<AttachmentList attachments={[video()]} canDelete={false} />);

      expect(screen.getByText("1.5 MB · 1:23")).toBeInTheDocument();
    });

    it("plays a ready video inline through the proxy, and closes it again", async () => {
      render(<AttachmentList attachments={[video()]} canDelete={false} />);
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Play walkthrough.mp4" }));

      const player = await screen.findByTestId("player");
      expect(player).toHaveAttribute("data-src", "/api/attachments/7/stream/master.m3u8");
      expect(player).toHaveAttribute("data-poster", "/api/attachments/7/thumbnail");
      expect(screen.getByRole("button", { name: "Close walkthrough.mp4" })).toHaveAttribute("aria-expanded", "true");

      await user.click(screen.getByRole("button", { name: "Close walkthrough.mp4" }));

      expect(screen.queryByTestId("player")).not.toBeInTheDocument();
    });

    it.each([
      ["pending", "Preparing video…"],
      ["failed", "Video can't be played"],
    ] as const)("offers no player while the stream is %s", (stream_status, note) => {
      render(
        <AttachmentList attachments={[video({ stream_status, stream_url: null, duration: null })]} canDelete={false} />,
      );

      expect(screen.queryByRole("button", { name: /^Play/ })).not.toBeInTheDocument();
      expect(screen.getByRole("listitem")).toHaveTextContent(note);
    });

    it("still offers the original file for download", () => {
      render(<AttachmentList attachments={[video()]} canDelete={false} />);

      expect(screen.getByRole("link", { name: "walkthrough.mp4" })).toHaveAttribute(
        "href",
        "/api/attachments/7/download",
      );
    });
  });
});
