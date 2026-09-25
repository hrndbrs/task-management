import { describe, expect, it } from "vitest";
import { hasProcessingFiles } from "@/lib/attachments";
import type { Attachment } from "@/lib/types";

describe("hasProcessingFiles", () => {
  const file = (overrides: Partial<Attachment>) =>
    ({ scan_status: "clean", stream_status: null, ...overrides }) as Attachment;

  it.each([
    ["a file is still being scanned", [file({ scan_status: "pending" })]],
    ["a video is still being prepared", [file({ stream_status: "pending" })]],
    ["one of several files is still processing", [file({}), file({ stream_status: "pending" })]],
  ])("keeps refreshing while %s", (_case, attachments) => {
    expect(hasProcessingFiles(attachments)).toBe(true);
  });

  it.each([
    ["there are no files", []],
    ["every file is scanned and every video ready", [file({}), file({ stream_status: "ready" })]],
    ["a video failed to process", [file({ stream_status: "failed" })]],
    ["a file failed the virus scan", [file({ scan_status: "infected" })]],
  ])("stops refreshing when %s", (_case, attachments) => {
    expect(hasProcessingFiles(attachments)).toBe(false);
  });
});
