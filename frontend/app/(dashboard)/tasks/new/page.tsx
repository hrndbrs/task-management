import type { Metadata } from "next";
import Link from "next/link";
import { createTask } from "@/app/actions/tasks";
import { getUsers } from "@/lib/tasks";
import { TaskForm } from "../task-form";

export const metadata: Metadata = {
  title: "New task",
};

export default async function NewTaskPage() {
  const users = await getUsers();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← All tasks
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          New task
        </h1>
      </div>
      <TaskForm
        action={createTask}
        users={users}
        submitLabel="Create task"
        pendingLabel="Creating…"
      />
    </div>
  );
}
