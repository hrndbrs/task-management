export type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "member";
};

export const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type Task = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_user: User | null;
  creator: User | null;
  attachments?: Attachment[];
  created_at: string;
  updated_at: string;
  can: { update: boolean; delete: boolean };
};

export type ScanStatus = "pending" | "clean" | "infected";

export type Attachment = {
  id: number;
  task_id: number;
  version: number;
  file_name: string;
  file_size: number;
  mime_type: string;
  scan_status: ScanStatus;
  scanned_at: string | null;
  uploaded_at: string;
  thumbnail_url: string | null;
};

export type Paginated<T> = {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
};
