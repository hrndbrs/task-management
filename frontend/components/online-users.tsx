"use client";

import { AvatarStack } from "@/components/avatar-stack";
import { realtimeEnabled } from "@/lib/echo";
import { usePresence } from "@/lib/presence";

export function OnlineUsers() {
  return realtimeEnabled ? <OnlineUsersList /> : null;
}

function OnlineUsersList() {
  const { members } = usePresence("online");
  if (members.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <AvatarStack members={members} label="Online users" className="hidden sm:flex" />
      <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-zinc-600 dark:text-zinc-400">
        <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
        {members.length} online
      </span>
    </div>
  );
}
