"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState =
  | {
      message?: string;
      errors?: { email?: string[]; password?: string[] };
      email?: string;
    }
  | undefined;

function safeRedirectPath(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  let res: Response;
  try {
    res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { email, message: "Can't reach the server. Try again shortly." };
  }

  if (res.status === 422) {
    const body = await res.json();
    return { email, errors: body.errors, message: body.message };
  }
  if (res.status === 429) {
    return { email, message: "Too many login attempts. Wait a minute and try again." };
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { email, message: body.message ?? "Login failed." };
  }

  const { access_token, expires_in } = await res.json();
  await createSession(access_token, expires_in);

  redirect(safeRedirectPath(formData.get("from")));
}

export async function logout() {
  await apiFetch("/auth/logout", { method: "POST" }).catch(() => null);
  await deleteSession();

  redirect("/login");
}
