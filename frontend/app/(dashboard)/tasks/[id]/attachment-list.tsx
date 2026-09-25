import type { Attachment } from "@/lib/types";
import { formatBytes } from "@/lib/upload";
import { DeleteAttachmentButton } from "./delete-attachment-button";

export function AttachmentList({
  attachments,
  canDelete,
}: {
  attachments: Attachment[];
  canDelete: boolean;
}) {
  if (attachments.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">No files yet.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {attachments.map((attachment) => (
        <li key={attachment.id} className="flex items-center gap-3 px-3 py-2">
          <Preview attachment={attachment} />
          <div className="min-w-0 flex-1">
            <FileName attachment={attachment} />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatBytes(attachment.file_size)}
              {attachment.version > 1 && ` · v${attachment.version}`}
              <ScanNote attachment={attachment} />
            </p>
          </div>
          {canDelete && <DeleteAttachmentButton attachment={attachment} />}
        </li>
      ))}
    </ul>
  );
}

function Preview({ attachment }: { attachment: Attachment }) {
  if (attachment.thumbnail_url && attachment.scan_status === "clean") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/attachments/${attachment.id}/thumbnail`}
        alt=""
        className="size-10 shrink-0 rounded object-cover"
      />
    );
  }

  const extension = attachment.file_name.split(".").pop()?.slice(0, 4).toUpperCase() ?? "";
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded bg-zinc-100 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      {extension}
    </span>
  );
}

function FileName({ attachment }: { attachment: Attachment }) {
  const className = "block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100";

  if (attachment.scan_status !== "clean") {
    return <span className={className}>{attachment.file_name}</span>;
  }
  return (
    <a
      href={`/api/attachments/${attachment.id}/download`}
      download={attachment.file_name}
      className={`${className} hover:underline`}
    >
      {attachment.file_name}
    </a>
  );
}

function ScanNote({ attachment }: { attachment: Attachment }) {
  switch (attachment.scan_status) {
    case "pending":
      return <> · Scanning for viruses…</>;
    case "infected":
      return <span className="text-red-600 dark:text-red-400"> · Removed: failed virus scan</span>;
    default:
      return null;
  }
}
