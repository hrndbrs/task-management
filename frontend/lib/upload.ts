import type { Attachment } from "@/lib/types";

export const ALLOWED_EXTENSIONS = [
  "jpg", "jpeg", "png", "gif", "webp",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
  "mp4", "webm", "mov",
];
export const DIRECT_UPLOAD_MAX_BYTES = 45 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

export class UploadError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

export class UploadAborted extends Error {
  constructor() {
    super("Upload cancelled.");
  }
}

type UploadOptions = {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function validateFile(file: File): string | null {
  const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return "This file type isn't allowed.";
  }
  if (file.size === 0) {
    return "This file is empty.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Files can be at most ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }
  return null;
}

export async function uploadAttachment(
  taskId: number,
  file: File,
  { onProgress, signal }: UploadOptions = {},
): Promise<Attachment> {
  if (file.size <= DIRECT_UPLOAD_MAX_BYTES) {
    const body = new FormData();
    body.append("file", file);
    const { data } = await send<{ data: Attachment }>("POST", `/api/tasks/${taskId}/attachments`, body, {
      signal,
      onProgress: (loaded) => onProgress?.(loaded / file.size),
    });
    return data;
  }

  return uploadInChunks(taskId, file, { onProgress, signal });
}

async function uploadInChunks(
  taskId: number,
  file: File,
  { onProgress, signal }: UploadOptions,
): Promise<Attachment> {
  const { data: upload } = await send<{ data: { id: string; chunk_size: number; total_chunks: number } }>(
    "POST",
    `/api/tasks/${taskId}/attachments/uploads`,
    JSON.stringify({ file_name: file.name, file_size: file.size }),
    { signal },
  );

  try {
    for (let index = 0; index < upload.total_chunks; index++) {
      const start = index * upload.chunk_size;
      const body = new FormData();
      body.append("chunk", file.slice(start, start + upload.chunk_size), file.name);

      await send("POST", `/api/uploads/${upload.id}/chunks/${index}`, body, {
        signal,
        onProgress: (loaded) => onProgress?.(Math.min(start + loaded, file.size) / file.size),
      });
    }

    const { data } = await send<{ data: Attachment }>("POST", `/api/uploads/${upload.id}/complete`, null, {
      signal,
    });
    return data;
  } catch (error) {
    send("DELETE", `/api/uploads/${upload.id}`).catch(() => {});
    throw error;
  }
}

function send<T = unknown>(
  method: string,
  url: string,
  body: XMLHttpRequestBodyInit | null = null,
  { onProgress, signal }: { onProgress?: (loaded: number) => void; signal?: AbortSignal } = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new UploadAborted());

    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();

    xhr.open(method, url);
    xhr.setRequestHeader("Accept", "application/json");
    if (typeof body === "string") xhr.setRequestHeader("Content-Type", "application/json");

    if (onProgress) {
      xhr.upload.onprogress = (event) => onProgress(event.loaded);
    }

    xhr.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      const json = parseJson(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) return resolve(json as T);
      reject(new UploadError(errorMessage(xhr.status, json), xhr.status));
    };
    xhr.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new UploadError("Can't reach the server. Try again shortly."));
    };
    xhr.onabort = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new UploadAborted());
    };

    signal?.addEventListener("abort", onAbort);
    xhr.send(body);
  });
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function errorMessage(status: number, body: unknown): string {
  const { message, errors } = (body ?? {}) as {
    message?: string;
    errors?: Record<string, string[]>;
  };

  switch (status) {
    case 401:
      return "Your session has expired. Sign in again.";
    case 403:
      return "You don't have permission to add files to this task.";
    case 413:
      return "This file is too large for the server.";
    case 422:
      return Object.values(errors ?? {})[0]?.[0] ?? message ?? "This file was rejected.";
    default:
      return message ?? "Upload failed. Try again.";
  }
}
