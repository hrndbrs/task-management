import type { TaskPriority, TaskStatus } from "@/lib/types";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  in_progress: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled: "bg-zinc-100 text-zinc-500 line-through dark:bg-zinc-800 dark:text-zinc-500",
};

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "text-zinc-500 dark:text-zinc-400",
  medium: "text-sky-700 dark:text-sky-400",
  high: "text-amber-700 dark:text-amber-400",
  urgent: "text-red-700 dark:text-red-400",
};

export function formatDueDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isOverdue(date: string | null, status: TaskStatus): boolean {
  if (!date || status === "completed" || status === "cancelled") return false;
  return date < new Date().toLocaleDateString("en-CA");
}
