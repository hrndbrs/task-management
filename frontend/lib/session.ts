import { cookies } from "next/headers";

export const SESSION_COOKIE = "token";

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function createSession(token: string, expiresIn: number) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
