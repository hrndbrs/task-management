"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { TaskFilters } from "@/lib/task-filters";
import type { ExportFormat, TaskExport } from "@/lib/types";

export type ExportResult = { export?: TaskExport; message?: string };

async function send(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await apiFetch(path, init);
  } catch {
    return null;
  }
}

async function result(res: Response | null, fallback: string): Promise<ExportResult> {
  if (!res) return { message: "Can't reach the server. Try again shortly." };
  if (res.status === 401) redirect("/login");

  const body = await res.json().catch(() => ({}));
  if (res.ok) return { export: body.data };
  if (res.status === 422) return { message: body.message ?? fallback };
  if (res.status === 404) return { message: "This export no longer exists." };
  return { message: fallback };
}

export async function requestExport(format: ExportFormat, filters: TaskFilters): Promise<ExportResult> {
  const [sort, direction] = filters.sort.split(":");
  const payload = {
    format,
    sort,
    direction,
    ...(filters.search && { search: filters.search }),
    ...(filters.status && { status: filters.status }),
    ...(filters.priority && { priority: filters.priority }),
    ...(filters.assigned_user_id && { assigned_user_id: Number(filters.assigned_user_id) }),
  };

  return result(
    await send("/exports", { method: "POST", body: JSON.stringify(payload) }),
    "Couldn't start the export. Try again.",
  );
}

export async function getExport(id: number): Promise<ExportResult> {
  return result(await send(`/exports/${id}`), "Couldn't check the export. Try again.");
}
