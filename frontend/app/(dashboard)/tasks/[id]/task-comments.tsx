"use client";

import { useEcho } from "@laravel/echo-react";
import { useRef, useState, useTransition } from "react";
import { deleteComment, postComment } from "@/app/actions/comments";
import { realtimeEnabled } from "@/lib/echo";
import type { Comment, User } from "@/lib/types";

const MAX_LENGTH = 5000;

const timeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type CommentEvent = { comment: Comment } | { id: number };

export function TaskComments({
  taskId,
  initialComments,
  currentUser,
}: {
  taskId: number;
  initialComments: Comment[];
  currentUser: User;
}) {
  const [comments, setComments] = useState(initialComments);

  const add = (comment: Comment) =>
    setComments((current) =>
      current.some((c) => c.id === comment.id) ? current : [...current, comment],
    );
  const remove = (id: number) => setComments((current) => current.filter((c) => c.id !== id));

  return (
    <div className="space-y-4">
      {realtimeEnabled && <CommentListener taskId={taskId} onPosted={add} onDeleted={remove} />}

      {comments.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No comments yet.</p>
      ) : (
        <ol aria-label="Comments" aria-live="polite" className="space-y-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canDelete={currentUser.role === "admin" || currentUser.id === comment.user.id}
              onDeleted={() => remove(comment.id)}
            />
          ))}
        </ol>
      )}

      <CommentForm taskId={taskId} onPosted={add} />
    </div>
  );
}

function CommentListener({
  taskId,
  onPosted,
  onDeleted,
}: {
  taskId: number;
  onPosted: (comment: Comment) => void;
  onDeleted: (id: number) => void;
}) {
  useEcho<CommentEvent>(`tasks.${taskId}`, [".comment.posted", ".comment.deleted"], (payload) => {
    if ("comment" in payload) onPosted(payload.comment);
    else onDeleted(payload.id);
  });

  return null;
}

function CommentItem({
  comment,
  canDelete,
  onDeleted,
}: {
  comment: Comment;
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      setError(undefined);
      const result = await deleteComment(comment.id);
      if (result.message) setError(result.message);
      else onDeleted();
    });

  return (
    <li className="rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 text-sm">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{comment.user.name}</span>{" "}
          <time
            dateTime={comment.created_at}
            suppressHydrationWarning
            className="text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400"
          >
            {timeFormat.format(new Date(comment.created_at))}
          </time>
        </p>
        {canDelete && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label={`Delete comment by ${comment.user.name}`}
            className="-my-1 shrink-0 rounded px-2 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-red-700 disabled:opacity-60 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm whitespace-pre-wrap text-zinc-800 wrap-break-word dark:text-zinc-200">
        {comment.comment}
      </p>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </li>
  );
}

function CommentForm({ taskId, onPosted }: { taskId: number; onPosted: (comment: Comment) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const blank = text.trim() === "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (blank || pending) return;

    startTransition(async () => {
      setError(undefined);
      const result = await postComment(taskId, text.trim());
      if (result.comment) {
        onPosted(result.comment);
        setText("");
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <form ref={form} onSubmit={submit} className="space-y-2">
      <label htmlFor="new-comment" className="sr-only">
        Add a comment
      </label>
      <textarea
        id="new-comment"
        rows={3}
        value={text}
        maxLength={MAX_LENGTH}
        placeholder="Add a comment…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) form.current?.requestSubmit();
        }}
        aria-invalid={!!error}
        aria-describedby={error ? "new-comment-error" : "new-comment-hint"}
        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 aria-invalid:border-red-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-300"
      />
      {error && (
        <p id="new-comment-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p id="new-comment-hint" className="text-xs text-zinc-500 dark:text-zinc-400">
          <span className="hidden sm:inline">Ctrl/⌘ + Enter to post</span>
        </p>
        <button
          type="submit"
          disabled={blank || pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Posting…" : "Comment"}
        </button>
      </div>
    </form>
  );
}
