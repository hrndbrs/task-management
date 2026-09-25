import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTask } from "@/app/actions/tasks";
import { PriorityLabel, StatusBadge } from "@/components/task-badges";
import { formatDueDate } from "@/lib/task-labels";
import { hasProcessingFiles } from "@/lib/attachments";
import { requireUser } from "@/lib/dal";
import { getComments, getTask, getUsers } from "@/lib/tasks";
import type { Task } from "@/lib/types";
import { TaskForm } from "../task-form";
import { AttachmentList } from "./attachment-list";
import { AttachmentUploader } from "./attachment-uploader";
import { DeleteTaskButton } from "./delete-task-button";
import { ScanStatusRefresher } from "./scan-status-refresher";
import { TaskComments } from "./task-comments";
import { TaskViewers } from "./task-viewers";

async function loadTask(id: string) {
  const taskId = Number(id);
  if (!Number.isInteger(taskId) || taskId < 1) notFound();

  const task = await getTask(taskId);
  if (!task) notFound();

  return task;
}

export async function generateMetadata({
  params,
}: PageProps<"/tasks/[id]">): Promise<Metadata> {
  const task = await loadTask((await params).id);
  return { title: task.title };
}

export default async function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  const task = await loadTask((await params).id);
  const [users, comments, currentUser] = await Promise.all([
    task.can.update ? getUsers() : [],
    getComments(task.id),
    requireUser(),
  ]);
  const attachments = task.attachments ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/"
          className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          ← All tasks
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight wrap-break-word text-zinc-900 dark:text-zinc-50">
          {task.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Created by {task.creator?.name ?? "unknown"}
        </p>
        <TaskViewers taskId={task.id} currentUserId={currentUser.id} />
      </div>

      {task.can.update ? (
        <TaskForm
          action={updateTask.bind(null, task.id)}
          users={users}
          task={task}
          submitLabel="Save changes"
          pendingLabel="Saving…"
        />
      ) : (
        <TaskDetails task={task} />
      )}

      <section aria-labelledby="attachments-heading" className="space-y-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 id="attachments-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Files
        </h2>
        <AttachmentList attachments={attachments} canDelete={task.can.update} />
        {task.can.update && <AttachmentUploader taskId={task.id} />}
        <ScanStatusRefresher pending={hasProcessingFiles(attachments)} />
      </section>

      <section aria-labelledby="comments-heading" className="space-y-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 id="comments-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Comments
        </h2>
        <TaskComments taskId={task.id} initialComments={comments} currentUser={currentUser} />
      </section>

      {task.can.delete && (
        <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <DeleteTaskButton taskId={task.id} />
        </div>
      )}
    </div>
  );
}

function TaskDetails({ task }: { task: Task }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Only the creator, the assignee, or an admin can edit this task.
      </p>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Detail label="Status">
          <StatusBadge status={task.status} />
        </Detail>
        <Detail label="Priority">
          <PriorityLabel priority={task.priority} />
        </Detail>
        <Detail label="Assignee">
          {task.assigned_user?.name ?? "Unassigned"}
        </Detail>
        <Detail label="Due date">
          {task.due_date ? formatDueDate(task.due_date) : "No due date"}
        </Detail>
      </dl>
      <Detail label="Description">
        <p className="whitespace-pre-wrap">
          {task.description || "No description."}
        </p>
      </Detail>
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
        {children}
      </dd>
    </div>
  );
}
