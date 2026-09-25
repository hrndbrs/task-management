import { cache } from "react";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Paginated, Task, User } from "@/lib/types";

async function getJson<T>(path: string): Promise<T | null> {
  const res = await apiFetch(path);

  if (res.status === 401) redirect("/login");
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`);

  return res.json();
}

export async function getTasks(page = 1): Promise<Paginated<Task>> {
  const params = new URLSearchParams({ page: String(page), per_page: "15" });
  return (await getJson<Paginated<Task>>(`/tasks?${params}`))!;
}

export const getTask = cache(async (id: number): Promise<Task | null> => {
  const body = await getJson<{ data: Task }>(`/tasks/${id}`);
  return body?.data ?? null;
});

export async function getUsers(): Promise<User[]> {
  return (await getJson<{ data: User[] }>("/users"))!.data;
}
