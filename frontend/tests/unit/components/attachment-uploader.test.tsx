import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AttachmentUploader } from "@/app/(dashboard)/tasks/[id]/attachment-uploader";
import { UploadAborted, UploadError, uploadAttachment } from "@/lib/upload";

const router = { refresh: vi.fn() };

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/upload", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/upload")>()),
  uploadAttachment: vi.fn(),
}));

type Options = Parameters<typeof uploadAttachment>[2];

function controlUploads() {
  const calls: { file: File; options: Options; resolve: () => void; reject: (e: Error) => void }[] = [];
  vi.mocked(uploadAttachment).mockImplementation(
    (_taskId, file, options) =>
      new Promise((resolve, reject) => {
        calls.push({ file, options, resolve: () => resolve({} as never), reject });
        options?.signal?.addEventListener("abort", () => reject(new UploadAborted()));
      }),
  );
  return calls;
}

function drop(files: File[]) {
  const zone = screen.getByText(/Drag files here/).parentElement!;
  fireEvent.dragEnter(zone, { dataTransfer: { files: [] } });
  expect(screen.getByText("Drop to upload")).toBeInTheDocument();
  fireEvent.drop(zone, { dataTransfer: { files } });
}

describe("AttachmentUploader", () => {
  beforeEach(() => router.refresh.mockClear());

  it("uploads dropped files and shows their progress", async () => {
    const calls = controlUploads();
    render(<AttachmentUploader taskId={4} />);

    drop([new File(["hello"], "notes.txt"), new File(["img"], "photo.png")]);

    expect(uploadAttachment).toHaveBeenCalledTimes(2);
    expect(uploadAttachment).toHaveBeenCalledWith(4, calls[0].file, expect.anything());
    expect(screen.queryByText("Drop to upload")).not.toBeInTheDocument();

    act(() => calls[0].options?.onProgress?.(0.42));

    expect(screen.getByRole("progressbar", { name: "Uploading notes.txt" })).toHaveAttribute("aria-valuenow", "42");
    expect(screen.getByText("42% of 5 B")).toBeInTheDocument();

    act(() => calls[0].options?.onProgress?.(1));
    expect(screen.getByText("Processing…")).toBeInTheDocument();

    await act(async () => calls[0].resolve());

    expect(screen.queryByText("notes.txt")).not.toBeInTheDocument();
    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("uploads files picked with the browse button", async () => {
    controlUploads();
    render(<AttachmentUploader taskId={4} />);

    await userEvent.setup().upload(screen.getByLabelText("Upload files"), new File(["a"], "report.pdf"));

    expect(uploadAttachment).toHaveBeenCalledWith(4, expect.objectContaining({ name: "report.pdf" }), expect.anything());
    expect(screen.getByRole("progressbar", { name: "Uploading report.pdf" })).toBeInTheDocument();
  });

  it("rejects a disallowed file without uploading it", async () => {
    controlUploads();
    render(<AttachmentUploader taskId={4} />);

    drop([new File(["x"], "virus.exe")]);

    expect(uploadAttachment).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("This file type isn't allowed.");

    await userEvent.setup().click(screen.getByRole("button", { name: "Dismiss virus.exe" }));
    expect(screen.queryByText("virus.exe")).not.toBeInTheDocument();
  });

  it("shows why an upload failed", async () => {
    const calls = controlUploads();
    render(<AttachmentUploader taskId={4} />);

    drop([new File(["x"], "notes.txt")]);
    await act(async () => calls[0].reject(new UploadError("You don't have permission to add files to this task.", 403)));

    expect(screen.getByRole("alert")).toHaveTextContent("You don't have permission to add files to this task.");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("cancels an upload in progress", async () => {
    const calls = controlUploads();
    render(<AttachmentUploader taskId={4} />);

    drop([new File(["x"], "notes.txt")]);
    await userEvent.setup().click(screen.getByRole("button", { name: "Cancel upload of notes.txt" }));

    expect(calls[0].options?.signal?.aborted).toBe(true);
    expect(screen.queryByText("notes.txt")).not.toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("aborts uploads still running when it unmounts", () => {
    const calls = controlUploads();
    const { unmount } = render(<AttachmentUploader taskId={4} />);

    drop([new File(["x"], "notes.txt")]);
    unmount();

    expect(calls[0].options?.signal?.aborted).toBe(true);
  });
});
