"use client";

import { useState, useTransition } from "react";
import { deleteAttachment } from "@/app/actions/attachments";
import type { Attachment } from "@/lib/types";

export function DeleteAttachmentButton({ attachment }: { attachment: Attachment }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      setError(undefined);
      const result = await deleteAttachment(attachment.id);
      if (result.message) setError(result.message);
    });

  return (
    <div className="flex shrink-0 flex-col items-end">
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label={`Delete ${attachment.file_name}`}
        className="rounded px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
