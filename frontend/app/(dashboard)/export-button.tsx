"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getExport, requestExport } from "@/app/actions/exports";
import type { TaskFilters } from "@/lib/task-filters";
import type { ExportFormat, TaskExport } from "@/lib/types";

export const EXPORT_POLL_INTERVAL_MS = 1500;
export const EXPORT_TIMEOUT_MS = 120_000;

const FORMATS: { format: ExportFormat; label: string }[] = [
  { format: "csv", label: "CSV" },
  { format: "pdf", label: "PDF" },
];

function download(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = "";
  document.body.append(link);
  link.click();
  link.remove();
}

export function ExportButton({ filters }: { filters: TaskFilters }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !container.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function waitUntilReady(id: number): Promise<TaskExport | string> {
    const deadline = Date.now() + EXPORT_TIMEOUT_MS;

    while (mounted.current && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, EXPORT_POLL_INTERVAL_MS));
      if (!mounted.current) break;
      const result = await getExport(id);
      if (!result.export) return result.message ?? "Couldn't check the export. Try again.";
      if (result.export.status === "completed") return result.export;
      if (result.export.status === "failed") return "The export failed. Try again.";
    }

    return "The export is taking too long. Try again later.";
  }

  async function start(format: ExportFormat, label: string) {
    setOpen(false);
    setBusy(true);
    const toastId = toast.loading(`Preparing ${label} export…`);

    try {
      const started = await requestExport(format, filters);
      if (!started.export) {
        toast.error(started.message ?? "Couldn't start the export. Try again.", { id: toastId });
        return;
      }

      const outcome = await waitUntilReady(started.export.id);
      if (!mounted.current) return;
      if (typeof outcome === "string") {
        toast.error(outcome, { id: toastId });
        return;
      }

      download(`/api/exports/${outcome.id}/download`);
      const rows = outcome.row_count ?? 0;
      toast.success(`${label} export ready: ${rows} ${rows === 1 ? "task" : "tasks"}`, { id: toastId });
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium whitespace-nowrap text-zinc-800 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {busy ? "Exporting…" : "Export"}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Export format"
          className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {FORMATS.map(({ format, label }) => (
            <button
              key={format}
              type="button"
              role="menuitem"
              onClick={() => start(format, label)}
              className="block w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
