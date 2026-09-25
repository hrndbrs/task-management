import { cache } from "react";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/session";
import type { User } from "@/lib/types";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!(await getToken())) return null;

  const res = await apiFetch("/auth/me");
  if (!res.ok) return null;

  const { id, name, email, role } = await res.json();
  return { id, name, email, role };
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
