"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ALLOWED_EXTENSIONS,
  UploadAborted,
  formatBytes,
  uploadAttachment,
  validateFile,
} from "@/lib/upload";

type Upload = {
  id: number;
  name: string;
  size: number;
  progress: number;
  error?: string;
  controller?: AbortController;
};

let nextUploadId = 0;

export function AttachmentUploader({ taskId }: { taskId: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const controllers = useRef(new Set<AbortController>());
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);

  useEffect(() => {
    const active = controllers.current;
    return () => active.forEach((controller) => controller.abort());
  }, []);

  const patch = (id: number, changes: Partial<Upload>) =>
    setUploads((current) => current.map((u) => (u.id === id ? { ...u, ...changes } : u)));

  const remove = (id: number) => setUploads((current) => current.filter((u) => u.id !== id));

  async function start(file: File) {
    const id = nextUploadId++;
    const base = { id, name: file.name, size: file.size, progress: 0 };

    const invalid = validateFile(file);
    if (invalid) {
      setUploads((current) => [...current, { ...base, error: invalid }]);
      return;
    }

    const controller = new AbortController();
    controllers.current.add(controller);
    setUploads((current) => [...current, { ...base, controller }]);

    try {
      await uploadAttachment(taskId, file, {
        signal: controller.signal,
        onProgress: (progress) => patch(id, { progress }),
      });
      remove(id);
      router.refresh();
    } catch (error) {
      if (error instanceof UploadAborted) remove(id);
      else patch(id, { controller: undefined, error: (error as Error).message });
    } finally {
      controllers.current.delete(controller);
    }
  }

  const startAll = (files: FileList | null) => Array.from(files ?? []).forEach(start);

  return (
    <div className="space-y-3">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current++;
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={() => {
          if (--dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          startAll(e.dataTransfer.files);
        }}
        data-dragging={dragging || undefined}
        className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-zinc-300 px-4 py-8 text-center transition-colors data-dragging:border-zinc-900 data-dragging:bg-zinc-50 dark:border-zinc-700 dark:data-dragging:border-zinc-300 dark:data-dragging:bg-zinc-900"
      >
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {dragging ? (
            "Drop to upload"
          ) : (
            <>
              Drag files here or{" "}
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="font-medium text-zinc-900 underline underline-offset-2 hover:no-underline dark:text-zinc-50"
              >
                browse
              </button>
            </>
          )}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Images, documents and videos up to 2 GB
        </p>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          aria-label="Upload files"
          accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
          onChange={(e) => {
            startAll(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {uploads.length > 0 && (
        <ul className="space-y-2">
          {uploads.map((upload) => (
            <UploadRow
              key={upload.id}
              upload={upload}
              onCancel={() => upload.controller?.abort()}
              onDismiss={() => remove(upload.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadRow({
  upload,
  onCancel,
  onDismiss,
}: {
  upload: Upload;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const percent = Math.round(upload.progress * 100);
  const status = upload.error
    ? upload.error
    : percent >= 100
      ? "Processing…"
      : `${percent}% of ${formatBytes(upload.size)}`;

  return (
    <li className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {upload.name}
        </span>
        <button
          type="button"
          onClick={upload.error ? onDismiss : onCancel}
          aria-label={`${upload.error ? "Dismiss" : "Cancel upload of"} ${upload.name}`}
          className="shrink-0 rounded px-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {upload.error ? "Dismiss" : "Cancel"}
        </button>
      </div>
      {!upload.error && (
        <div
          role="progressbar"
          aria-label={`Uploading ${upload.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        >
          <div
            className="h-full rounded-full bg-zinc-900 transition-[width] duration-200 dark:bg-zinc-100"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      <p
        role={upload.error ? "alert" : undefined}
        className={`mt-1 text-xs ${upload.error ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}`}
      >
        {status}
      </p>
    </li>
  );
}
