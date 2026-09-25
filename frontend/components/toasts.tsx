"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Toaster, toast } from "sonner";

const FLASH_COOKIE = "flash";

function takeFlash(): string | null {
  const entry = document.cookie.split("; ").find((c) => c.startsWith(`${FLASH_COOKIE}=`));
  if (!entry) return null;

  document.cookie = `${FLASH_COOKIE}=; path=/; max-age=0; samesite=lax`;
  try {
    return decodeURIComponent(entry.slice(FLASH_COOKIE.length + 1));
  } catch {
    return null;
  }
}

export function Toasts() {
  const pathname = usePathname();

  useEffect(() => {
    const message = takeFlash();
    if (message) toast.success(message, { id: `flash:${message}` });
  }, [pathname]);

  return <Toaster theme="system" position="bottom-right" richColors closeButton />;
}
