"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { TaskFormState } from "@/app/actions/tasks";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/task-labels";
import { TASK_PRIORITIES, TASK_STATUSES, type Task, type User } from "@/lib/types";

const inputClass =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm sm:text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-300";
const labelClass = "text-sm font-medium text-zinc-800 dark:text-zinc-200";

type Props = {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  users: User[];
  task?: Task;
  submitLabel: string;
  pendingLabel: string;
};

export function TaskForm({ action, users, task, submitLabel, pendingLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  const values = state?.values ?? {
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "pending",
    priority: task?.priority ?? "medium",
    assigned_user_id: task?.assigned_user ? String(task.assigned_user.id) : "",
    due_date: task?.due_date ?? "",
  };
  const errors = state?.errors ?? {};
  const hasFieldErrors = Object.keys(errors).length > 0;

  const fieldProps = (name: keyof typeof values) => ({
    id: name,
    name,
    defaultValue: values[name],
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    className: inputClass,
  });

  const fieldError = (name: keyof typeof values) =>
    errors[name] && (
      <p id={`${name}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
        {errors[name][0]}
      </p>
    );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.message && !hasFieldErrors && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input type="text" required maxLength={255} {...fieldProps("title")} />
        {fieldError("title")}
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea rows={5} {...fieldProps("description")} />
        {fieldError("description")}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select key={values.status} {...fieldProps("status")}>
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {fieldError("status")}
        </div>

        <div>
          <label htmlFor="priority" className={labelClass}>
            Priority
          </label>
          <select key={values.priority} {...fieldProps("priority")}>
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
          {fieldError("priority")}
        </div>

        <div>
          <label htmlFor="assigned_user_id" className={labelClass}>
            Assignee
          </label>
          <select key={values.assigned_user_id} {...fieldProps("assigned_user_id")}>
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          {fieldError("assigned_user_id")}
        </div>

        <div>
          <label htmlFor="due_date" className={labelClass}>
            Due date <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input type="date" {...fieldProps("due_date")} />
          {fieldError("due_date")}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        {!task && (
          <Link
            href="/"
            className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        )}
        {state?.saved && !pending && (
          <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
            Saved
          </p>
        )}
      </div>
    </form>
  );
}
