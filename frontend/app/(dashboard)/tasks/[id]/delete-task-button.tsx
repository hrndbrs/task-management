"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteTask } from "@/app/actions/tasks";

export function DeleteTaskButton({ taskId }: { taskId: number }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirmDelete = () =>
    startTransition(async () => {
      const result = await deleteTask(taskId);
      if (result?.message) {
        toast.error(result.message);
        setConfirming(false);
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      {confirming ? (
        <>
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Delete this task?</span>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={pending}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          Delete task
        </button>
      )}
    </div>
  );
}
