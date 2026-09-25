"use client";

import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import {
  SORT_OPTIONS,
  type SortOption,
  type TaskFilters,
  dashboardHref,
  hasActiveFilters,
  parseTaskFilters,
} from "@/lib/task-filters";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/task-labels";
import { TASK_PRIORITIES, TASK_STATUSES, type User } from "@/lib/types";

const SEARCH_DELAY_MS = 300;

const controlClass =
  "block h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-900 shadow-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-300";
const labelClass = "text-xs font-medium text-zinc-600 dark:text-zinc-400";

export function TaskFilterBar({ filters: current, users }: { filters: TaskFilters; users: User[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useOptimistic(current);
  const [search, setSearch] = useState(current.search);
  const submittedSearch = useRef(current.search);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (current.search !== submittedSearch.current && document.activeElement !== searchInput.current) {
      submittedSearch.current = current.search;
      setSearch(current.search);
    }
  }, [current.search]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const apply = (changes: Partial<TaskFilters>) => {
    clearTimeout(timer.current);
    const next = { ...filters, search: search.trim(), ...changes, page: 1 };
    submittedSearch.current = next.search;
    startTransition(() => {
      setFilters(next);
      router.replace(dashboardHref(next), { scroll: false });
    });
  };

  const onSearch = (value: string) => {
    setSearch(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ search: value.trim() }), SEARCH_DELAY_MS);
  };

  const clear = () => {
    setSearch("");
    apply({ ...parseTaskFilters({}), sort: filters.sort });
  };

  return (
    <div
      role="search"
      aria-label="Filter tasks"
      className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] lg:items-end"
    >
      <div className="col-span-2 lg:col-span-1">
        <label htmlFor="filter-search" className={labelClass}>
          Search
        </label>
        <input
          ref={searchInput}
          id="filter-search"
          type="search"
          placeholder="Search by title"
          value={search}
          maxLength={255}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply({ search: search.trim() });
          }}
          className={`mt-1 ${controlClass}`}
        />
      </div>

      <FilterSelect
        id="filter-status"
        label="Status"
        value={filters.status}
        onChange={(status) => apply({ status: status as TaskFilters["status"] })}
      >
        <option value="">All statuses</option>
        {TASK_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        id="filter-priority"
        label="Priority"
        value={filters.priority}
        onChange={(priority) => apply({ priority: priority as TaskFilters["priority"] })}
      >
        <option value="">All priorities</option>
        {TASK_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_LABELS[priority]}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        id="filter-assignee"
        label="Assignee"
        value={filters.assigned_user_id}
        onChange={(assigned_user_id) => apply({ assigned_user_id })}
      >
        <option value="">Anyone</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        id="filter-sort"
        label="Sort by"
        value={filters.sort}
        onChange={(sort) => apply({ sort: sort as SortOption })}
      >
        {Object.entries(SORT_OPTIONS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FilterSelect>

      <div className="flex min-h-5 items-center gap-3 text-sm col-span-2 lg:col-span-5">
        {hasActiveFilters({ ...filters, search }) && (
          <button
            type="button"
            onClick={clear}
            className="-mx-2 rounded px-2 py-1 font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Clear filters
          </button>
        )}
        {pending && (
          <span role="status" className="text-zinc-500 dark:text-zinc-400">
            Updating…
          </span>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`mt-1 ${controlClass}`}>
        {children}
      </select>
    </div>
  );
}
