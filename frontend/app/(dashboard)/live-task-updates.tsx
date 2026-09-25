"use client";

import { useEcho } from "@laravel/echo-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { realtimeEnabled } from "@/lib/echo";

const REFRESH_DELAY_MS = 300;

export function LiveTaskUpdates() {
  return realtimeEnabled ? <TaskChangeListener /> : null;
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
