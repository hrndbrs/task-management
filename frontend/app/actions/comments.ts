"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Comment } from "@/lib/types";

export type CommentResult = { comment?: Comment; message?: string };

async function send(path: string, init: RequestInit): Promise<Response | null> {
  try {
    return await apiFetch(path, init);
  } catch {
    return null;
  }
}

export async function postComment(taskId: number, text: string): Promise<CommentResult> {
  const res = await send(`/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({ comment: text }),
  });
  if (!res) return { message: "Can't reach the server. Try again shortly." };
  if (res.status === 401) redirect("/login");

  const body = await res.json().catch(() => ({}));
  if (res.ok) return { comment: body.data };

  switch (res.status) {
    case 422:
      return { message: body.errors?.comment?.[0] ?? body.message };
    case 404:
      return { message: "This task no longer exists." };
    case 429:
      return { message: "You're commenting too fast. Wait a moment and try again." };
    default:
      return { message: "Couldn't post your comment. Try again." };
  }
}

export async function deleteComment(id: number): Promise<CommentResult> {
  const res = await send(`/comments/${id}`, { method: "DELETE" });
  if (!res) return { message: "Can't reach the server. Try again shortly." };
  if (res.status === 401) redirect("/login");
  if (res.status === 403) return { message: "You can only delete your own comments." };
  if (!res.ok && res.status !== 404) return { message: "Couldn't delete the comment. Try again." };

  return {};
}
