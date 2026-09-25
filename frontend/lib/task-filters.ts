import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from "@/lib/types";

export const SORT_OPTIONS = {
  "created_at:desc": "Newest first",
  "created_at:asc": "Oldest first",
  "due_date:asc": "Due date",
  "priority:desc": "Priority",
  "status:asc": "Status",
  "title:asc": "Title A–Z",
} as const;

export type SortOption = keyof typeof SORT_OPTIONS;

export const DEFAULT_SORT: SortOption = "created_at:desc";

export type TaskFilters = {
  search: string;
  status: TaskStatus | "";
  priority: TaskPriority | "";
  assigned_user_id: string;
  sort: SortOption;
  page: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | "" {
  return (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

export function parseTaskFilters(params: SearchParams): TaskFilters {
  const sort = `${first(params.sort)}:${first(params.direction)}`;
  const assignee = first(params.assigned_user_id);

  return {
    search: first(params.search).slice(0, 255),
    status: oneOf(first(params.status), TASK_STATUSES),
    priority: oneOf(first(params.priority), TASK_PRIORITIES),
    assigned_user_id: /^[1-9]\d*$/.test(assignee) ? assignee : "",
    sort: sort in SORT_OPTIONS ? (sort as SortOption) : DEFAULT_SORT,
    page: Math.max(1, Math.floor(Number(first(params.page))) || 1),
  };
}

export function hasActiveFilters(filters: TaskFilters): boolean {
  return Boolean(filters.search || filters.status || filters.priority || filters.assigned_user_id);
}

export function filterParams(filters: TaskFilters): URLSearchParams {
  const params = new URLSearchParams();
  const [sort, direction] = filters.sort.split(":");

  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.assigned_user_id) params.set("assigned_user_id", filters.assigned_user_id);
  if (filters.sort !== DEFAULT_SORT) {
    params.set("sort", sort);
    params.set("direction", direction);
  }
  if (filters.page > 1) params.set("page", String(filters.page));

  return params;
}

export function dashboardHref(filters: TaskFilters): string {
  const query = filterParams(filters).toString();
  return query ? `/?${query}` : "/";
}
