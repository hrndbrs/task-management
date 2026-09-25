import { describe, expect, it, vi } from "vitest";
import {
  DIRECT_UPLOAD_MAX_BYTES,
  UploadAborted,
  UploadError,
  formatBytes,
  uploadAttachment,
  validateFile,
} from "@/lib/upload";

type Reply = { status: number; body?: unknown };

class FakeXhr {
  static replies: Reply[] = [];
  static sent: { method: string; url: string; body: unknown; headers: Record<string, string> }[] = [];
  static hold = false;

  method = "";
  url = "";
  headers: Record<string, string> = {};
  status = 0;
  responseText = "";
  upload: { onprogress?: (event: { loaded: number }) => void } = {};
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;

  static install(...replies: Reply[]) {
    FakeXhr.replies = replies;
    FakeXhr.sent = [];
    FakeXhr.hold = false;
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(body: unknown) {
    FakeXhr.sent.push({ method: this.method, url: this.url, body, headers: this.headers });
    if (FakeXhr.hold) return;

    queueMicrotask(() => {
      const reply = FakeXhr.replies.shift();
      if (!reply) return this.onerror?.();

      const size = body instanceof FormData ? [...body.values()].reduce((n, v) => n + (v as Blob).size, 0) : 0;
      this.upload.onprogress?.({ loaded: size });
      this.status = reply.status;
      this.responseText = reply.body === undefined ? "" : JSON.stringify(reply.body);
      this.onload?.();
    });
  }

  abort() {
    queueMicrotask(() => this.onabort?.());
  }
}

const attachment = { id: 7, file_name: "a.txt" };

function fileOfSize(size: number, name = "a.txt") {
  const file = new File(["x"], name);
  Object.defineProperty(file, "size", { value: size });
  file.slice = (start = 0, end = size) => new Blob([new Uint8Array(Math.min(end, size) - start)]);
  return file;
}

describe("validateFile", () => {
  it("accepts an allowed file", () => {
    expect(validateFile(new File(["x"], "Report.PDF"))).toBeNull();
  });

  it.each([
    ["script.exe", "This file type isn't allowed."],
    ["README", "This file type isn't allowed."],
  ])("rejects %s", (name, message) => {
    expect(validateFile(new File(["x"], name))).toBe(message);
  });

  it("rejects empty and oversized files", () => {
    expect(validateFile(new File([], "a.txt"))).toBe("This file is empty.");
    expect(validateFile(fileOfSize(3 * 1024 ** 3))).toBe("Files can be at most 2.0 GB.");
  });
});

describe("formatBytes", () => {
  it.each([
    [512, "512 B"],
    [1536, "1.5 KB"],
    [52_428_800, "50 MB"],
    [2 * 1024 ** 3, "2.0 GB"],
  ])("formats %i as %s", (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });
});

describe("uploadAttachment", () => {
  it("sends a small file in one request and reports progress", async () => {
    FakeXhr.install({ status: 201, body: { data: attachment } });
    const onProgress = vi.fn();
    const file = new File(["hello"], "a.txt");

    await expect(uploadAttachment(3, file, { onProgress })).resolves.toEqual(attachment);

    expect(FakeXhr.sent).toHaveLength(1);
    expect(FakeXhr.sent[0]).toMatchObject({ method: "POST", url: "/api/tasks/3/attachments" });
    expect((FakeXhr.sent[0].body as FormData).get("file")).toBeInstanceOf(File);
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });

  it("sends a large file in chunks, then completes it", async () => {
    const size = DIRECT_UPLOAD_MAX_BYTES + 10;
    const chunkSize = Math.ceil(size / 3);
    FakeXhr.install(
      { status: 201, body: { data: { id: "u-1", chunk_size: chunkSize, total_chunks: 3 } } },
      { status: 200 },
      { status: 200 },
      { status: 200 },
      { status: 201, body: { data: attachment } },
    );
    const onProgress = vi.fn();

    await expect(uploadAttachment(3, fileOfSize(size, "big.mp4"), { onProgress })).resolves.toEqual(attachment);

    expect(FakeXhr.sent.map((r) => `${r.method} ${r.url}`)).toEqual([
      "POST /api/tasks/3/attachments/uploads",
      "POST /api/uploads/u-1/chunks/0",
      "POST /api/uploads/u-1/chunks/1",
      "POST /api/uploads/u-1/chunks/2",
      "POST /api/uploads/u-1/complete",
    ]);
    expect(JSON.parse(FakeXhr.sent[0].body as string)).toEqual({ file_name: "big.mp4", file_size: size });
    expect(FakeXhr.sent[0].headers["Content-Type"]).toBe("application/json");
    expect(onProgress.mock.calls.map(([p]) => p)).toEqual([chunkSize / size, (2 * chunkSize) / size, 1]);
  });

  it("chunks a file of exactly 50 MB, which is too big for one request once wrapped", async () => {
    const size = 50 * 1024 * 1024;
    FakeXhr.install(
      { status: 201, body: { data: { id: "u-1", chunk_size: size, total_chunks: 1 } } },
      { status: 200 },
      { status: 201, body: { data: attachment } },
    );

    await uploadAttachment(3, fileOfSize(size));

    expect(FakeXhr.sent[0].url).toBe("/api/tasks/3/attachments/uploads");
  });

  it("discards a chunked upload that fails part-way", async () => {
    FakeXhr.install(
      { status: 201, body: { data: { id: "u-1", chunk_size: DIRECT_UPLOAD_MAX_BYTES, total_chunks: 2 } } },
      { status: 422, body: { message: "Bad chunk", errors: { chunk: ["The chunk must be exactly 5 bytes."] } } },
      { status: 204 },
    );

    await expect(uploadAttachment(3, fileOfSize(DIRECT_UPLOAD_MAX_BYTES + 1))).rejects.toThrow(
      "The chunk must be exactly 5 bytes.",
    );

    expect(FakeXhr.sent.at(-1)).toMatchObject({ method: "DELETE", url: "/api/uploads/u-1" });
  });

  it.each([
    [403, undefined, "You don't have permission to add files to this task."],
    [413, undefined, "This file is too large for the server."],
    [422, { errors: { file: ["The file field must be a file of type: pdf."] } }, "The file field must be a file of type: pdf."],
    [500, { message: "Server Error" }, "Server Error"],
  ])("explains a %i response", async (status, body, message) => {
    FakeXhr.install({ status, body });

    const error = await uploadAttachment(3, new File(["x"], "a.txt")).catch((e) => e);

    expect(error).toBeInstanceOf(UploadError);
    expect(error).toMatchObject({ message, status });
  });

  it("reports a network failure", async () => {
    FakeXhr.install();

    await expect(uploadAttachment(3, new File(["x"], "a.txt"))).rejects.toThrow(
      "Can't reach the server. Try again shortly.",
    );
  });

  it("stops when aborted", async () => {
    FakeXhr.install();
    FakeXhr.hold = true;
    const controller = new AbortController();

    const upload = uploadAttachment(3, new File(["x"], "a.txt"), { signal: controller.signal });
    controller.abort();

    await expect(upload).rejects.toBeInstanceOf(UploadAborted);
  });
});
