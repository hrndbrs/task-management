"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Attachment } from "@/lib/types";
import { formatBytes } from "@/lib/upload";
import { DeleteAttachmentButton } from "./delete-attachment-button";

const VideoPlayer = dynamic(() => import("./video-player").then((module) => module.VideoPlayer), {
  ssr: false,
  loading: () => <div aria-hidden className="aspect-video w-full rounded-md bg-black" />,
});

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
        <AttachmentItem key={attachment.id} attachment={attachment} canDelete={canDelete} />
      ))}
    </ul>
  );
}

function AttachmentItem({ attachment, canDelete }: { attachment: Attachment; canDelete: boolean }) {
  const [playing, setPlaying] = useState(false);
  const playable = attachment.stream_status === "ready" && attachment.scan_status === "clean";

  return (
    <li className="px-3 py-2">
      <div className="flex items-center gap-3">
        <Preview attachment={attachment} />
        <div className="min-w-0 flex-1">
          <FileName attachment={attachment} />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatBytes(attachment.file_size)}
            {attachment.duration !== null && ` · ${formatDuration(attachment.duration)}`}
            {attachment.version > 1 && ` · v${attachment.version}`}
            <ScanNote attachment={attachment} />
          </p>
        </div>
        {playable && (
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-expanded={playing}
            aria-label={`${playing ? "Close" : "Play"} ${attachment.file_name}`}
            className="shrink-0 rounded px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {playing ? "Close" : "Play"}
          </button>
        )}
        {canDelete && <DeleteAttachmentButton attachment={attachment} />}
      </div>
      {playable && playing && (
        <div className="mt-3">
          <VideoPlayer
            src={`/api/attachments/${attachment.id}/stream/master.m3u8`}
            poster={attachment.thumbnail_url ? `/api/attachments/${attachment.id}/thumbnail` : undefined}
            title={attachment.file_name}
          />
        </div>
      )}
    </li>
  );
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

function Preview({ attachment }: { attachment: Attachment }) {
  if (attachment.thumbnail_url && attachment.scan_status === "clean") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/attachments/${attachment.id}/thumbnail`}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        decoding="async"
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
  }

  switch (attachment.stream_status) {
    case "pending":
      return <> · Preparing video…</>;
    case "failed":
      return <span className="text-red-600 dark:text-red-400"> · Video can&apos;t be played</span>;
    default:
      return null;
  }
}
