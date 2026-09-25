import type { Attachment } from "@/lib/types";

export function hasProcessingFiles(attachments: Attachment[]): boolean {
  return attachments.some((a) => a.scan_status === "pending" || a.stream_status === "pending");
}
