"use client";

import { AvatarStack } from "@/components/avatar-stack";
import { realtimeEnabled } from "@/lib/echo";
import { usePresence } from "@/lib/presence";

export function TaskViewers({ taskId, currentUserId }: { taskId: number; currentUserId: number }) {
  return realtimeEnabled ? <ViewerList taskId={taskId} currentUserId={currentUserId} /> : null;
}

function ViewerList({ taskId, currentUserId }: { taskId: number; currentUserId: number }) {
  const { members } = usePresence(`tasks.${taskId}.viewers`);
  const others = members.filter((member) => member.id !== currentUserId);
  if (others.length === 0) return null;

  return (
    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
      <AvatarStack members={others} label="Also viewing this task" />
      <span>{others.length === 1 ? `${others[0].name} is also here` : `${others.length} others are here`}</span>
    </div>
  );
}
