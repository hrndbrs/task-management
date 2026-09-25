import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/dal";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-semibold text-zinc-900 dark:text-zinc-50">
            Tasks
          </Link>
          <div className="flex min-w-0 items-center gap-3 text-sm">
            <span className="truncate text-zinc-600 dark:text-zinc-400">
              {user.name}
              {user.role === "admin" && (
                <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Admin
                </span>
              )}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium whitespace-nowrap text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
