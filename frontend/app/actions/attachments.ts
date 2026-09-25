"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";

export async function deleteAttachment(id: number): Promise<{ message?: string }> {
  let res: Response;
  try {
    res = await apiFetch(`/attachments/${id}`, { method: "DELETE" });
  } catch {
    return { message: "Can't reach the server. Try again shortly." };
  }

  if (res.status === 401) redirect("/login");
  if (res.status === 403) return { message: "You don't have permission to delete this file." };
  if (!res.ok && res.status !== 404) return { message: "Couldn't delete the file. Try again." };

  refresh();
  return {};
}
