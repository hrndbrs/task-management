"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";

const TASK_FIELDS = ["title", "description", "status", "priority", "assigned_user_id", "due_date"] as const;
type TaskField = (typeof TASK_FIELDS)[number];

export type TaskFormState =
  | {
      message?: string;
      errors?: Partial<Record<TaskField, string[]>>;
      saved?: boolean;
      values?: Partial<Record<TaskField, string>>;
    }
  | undefined;

function taskPayload(formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const assignee = text("assigned_user_id");

  return {
    title: text("title"),
    description: text("description") || null,
    status: text("status"),
    priority: text("priority"),
    assigned_user_id: assignee ? Number(assignee) : null,
    due_date: text("due_date") || null,
  };
}

function submittedValues(formData: FormData): Partial<Record<TaskField, string>> {
  return Object.fromEntries(TASK_FIELDS.map((field) => [field, String(formData.get(field) ?? "")]));
}

async function failure(res: Response, formData?: FormData): Promise<TaskFormState> {
  if (res.status === 401) redirect("/login");

  const values = formData && submittedValues(formData);
  const body = await res.json().catch(() => ({}));
  switch (res.status) {
    case 422:
      return { values, errors: body.errors, message: body.message };
    case 403:
      return { values, message: "You don't have permission to change this task." };
    case 404:
      return { message: "This task no longer exists." };
    default:
      return { values, message: body.message ?? "Something went wrong. Try again." };
  }
}

async function send(path: string, init: RequestInit): Promise<Response | null> {
  try {
    return await apiFetch(path, init);
  } catch {
    return null;
  }
}

function unreachable(formData?: FormData): TaskFormState {
  return {
    values: formData && submittedValues(formData),
    message: "Can't reach the server. Try again shortly.",
  };
}

export async function createTask(
  _state: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const res = await send("/tasks", {
    method: "POST",
    body: JSON.stringify(taskPayload(formData)),
  });
  if (!res) return unreachable(formData);
  if (!res.ok) return failure(res, formData);

  const { data } = await res.json();
  redirect(`/tasks/${data.id}`);
}

export async function updateTask(
  id: number,
  _state: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const res = await send(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(taskPayload(formData)),
  });
  if (!res) return unreachable(formData);
  if (!res.ok) return failure(res, formData);

  refresh();
  return { saved: true };
}

export async function deleteTask(id: number): Promise<TaskFormState> {
  const res = await send(`/tasks/${id}`, { method: "DELETE" });
  if (!res) return unreachable();
  if (!res.ok) return failure(res);

  redirect("/");
}
