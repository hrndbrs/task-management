import { cookies } from "next/headers";

export const FLASH_COOKIE = "flash";

export async function flash(message: string) {
  (await cookies()).set(FLASH_COOKIE, message, {
    sameSite: "lax",
    path: "/",
    maxAge: 60,
  });
}
