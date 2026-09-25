"use client";

import { configureEcho, useEcho } from "@laravel/echo-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const REFRESH_DELAY_MS = 300;

const reverbKey = process.env.NEXT_PUBLIC_REVERB_APP_KEY;

if (reverbKey) {
  const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8081);
  configureEcho({
    broadcaster: "reverb",
    key: reverbKey,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? "localhost",
    wsPort: port,
    wssPort: port,
    forceTLS: process.env.NEXT_PUBLIC_REVERB_SCHEME === "https",
    enabledTransports: ["ws", "wss"],
    authEndpoint: "/api/broadcasting/auth",
  });
}

export function LiveTaskUpdates() {
  return reverbKey ? <TaskChangeListener /> : null;
}

function TaskChangeListener() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEcho("tasks", ".tasks.changed", () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
  });

  return null;
}
