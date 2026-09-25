"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteAttachment } from "@/app/actions/attachments";
import type { Attachment } from "@/lib/types";

export function DeleteAttachmentButton({ attachment }: { attachment: Attachment }) {
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const result = await deleteAttachment(attachment.id);
      if (result.message) toast.error(result.message);
      else toast.success(`${attachment.file_name} deleted`);
    });

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      aria-label={`Delete ${attachment.file_name}`}
      className="shrink-0 rounded px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
