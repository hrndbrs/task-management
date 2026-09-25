import Link from "next/link";
import { PriorityLabel, StatusBadge } from "@/components/task-badges";
import { formatDueDate, isOverdue } from "@/lib/task-labels";
import { getTasks } from "@/lib/tasks";

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const { data: tasks, meta } = await getTasks(currentPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {meta.total} {meta.total === 1 ? "task" : "tasks"}
          </p>
        </div>
        <Link
          href="/tasks/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New task
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">No tasks yet</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create one to get started.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`/tasks/${task.id}`}
                className="grid gap-2 px-4 py-3 transition-colors hover:bg-zinc-50 sm:grid-cols-[1fr_auto_5rem_9rem_7rem] sm:items-center sm:gap-4 dark:hover:bg-zinc-800/50"
              >
                <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                  {task.title}
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:contents">
                  <StatusBadge status={task.status} />
                  <PriorityLabel priority={task.priority} />
                  <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                    {task.assigned_user?.name ?? "Unassigned"}
                  </span>
                  <span
                    className={`text-sm whitespace-nowrap sm:text-right ${
                      isOverdue(task.due_date, task.status)
                        ? "font-medium text-red-600 dark:text-red-400"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {task.due_date ? formatDueDate(task.due_date) : "No due date"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {meta.last_page > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <PageLink page={meta.current_page - 1} disabled={meta.current_page <= 1}>
            Previous
          </PageLink>
          <span className="text-zinc-600 dark:text-zinc-400">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <PageLink page={meta.current_page + 1} disabled={meta.current_page >= meta.last_page}>
            Next
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  page,
  disabled,
  children,
}: {
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const className =
    "rounded-md border border-zinc-300 px-3 py-1.5 font-medium dark:border-zinc-700";

  if (disabled) {
    return (
      <span className={`${className} text-zinc-400 dark:text-zinc-600`} aria-disabled>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={page === 1 ? "/" : `/?page=${page}`}
      className={`${className} text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800`}
    >
      {children}
    </Link>
  );
}
