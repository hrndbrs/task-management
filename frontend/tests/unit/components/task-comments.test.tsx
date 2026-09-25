import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteComment, postComment } from "@/app/actions/comments";
import type { Comment, User } from "@/lib/types";

const echo = vi.hoisted(() => ({ configureEcho: vi.fn(), useEcho: vi.fn() }));

vi.mock("@laravel/echo-react", () => echo);
vi.mock("@/app/actions/comments", () => ({ postComment: vi.fn(), deleteComment: vi.fn() }));

const ada: User = { id: 1, name: "Ada", email: "ada@example.com", role: "member" };
const alan: User = { id: 2, name: "Alan", email: "alan@example.com", role: "member" };
const admin: User = { id: 3, name: "Grace", email: "grace@example.com", role: "admin" };

function comment(id: number, user: User, text = `Comment ${id}`): Comment {
  return { id, task_id: 7, comment: text, user, created_at: "2026-09-26T10:00:00Z" };
}

async function renderComments(comments: Comment[], currentUser = ada) {
  vi.resetModules();
  const { TaskComments } = await import("@/app/(dashboard)/tasks/[id]/task-comments");
  return render(<TaskComments taskId={7} initialComments={comments} currentUser={currentUser} />);
}

function broadcast(payload: unknown) {
  const callback = echo.useEcho.mock.calls.at(-1)?.[2] as (payload: unknown) => void;
  act(() => callback(payload));
}

const list = () => screen.getByRole("list", { name: "Comments" });

describe("TaskComments", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_REVERB_APP_KEY", "app-key"));
  afterEach(() => vi.unstubAllEnvs());

  it("lists comments with their authors", async () => {
    await renderComments([comment(1, ada, "First"), comment(2, alan, "Second")]);

    const items = within(list()).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Ada");
    expect(items[0]).toHaveTextContent("First");
    expect(items[1]).toHaveTextContent("Alan");
  });

  it("says when there are no comments", async () => {
    await renderComments([]);

    expect(screen.getByText("No comments yet.")).toBeInTheDocument();
  });

  it("lets members delete only their own comments", async () => {
    await renderComments([comment(1, ada), comment(2, alan)]);

    expect(screen.getByRole("button", { name: "Delete comment by Ada" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete comment by Alan" })).not.toBeInTheDocument();
  });

  it("lets admins delete any comment", async () => {
    await renderComments([comment(1, ada), comment(2, alan)], admin);

    expect(screen.getAllByRole("button", { name: /^Delete comment by/ })).toHaveLength(2);
  });

  it("listens on the task's private channel", async () => {
    await renderComments([]);

    expect(echo.useEcho).toHaveBeenCalledWith(
      "tasks.7",
      [".comment.posted", ".comment.deleted"],
      expect.any(Function),
    );
  });

  it("adds comments posted elsewhere, once", async () => {
    await renderComments([comment(1, ada)]);

    broadcast({ comment: comment(2, alan, "From Alan") });
    broadcast({ comment: comment(2, alan, "From Alan") });

    expect(within(list()).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list()).getByText("From Alan")).toBeInTheDocument();
  });

  it("removes comments deleted elsewhere", async () => {
    await renderComments([comment(1, ada), comment(2, alan, "Going away")]);

    broadcast({ id: 2 });

    expect(screen.queryByText("Going away")).not.toBeInTheDocument();
  });

  it("stays offline when realtime is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_REVERB_APP_KEY", "");
    await renderComments([]);

    expect(echo.useEcho).not.toHaveBeenCalled();
  });

  it("posts a comment and shows it once, even if its broadcast arrives too", async () => {
    vi.mocked(postComment).mockResolvedValue({ comment: comment(9, ada, "Ship it") });
    await renderComments([]);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Add a comment"), "  Ship it ");
    await user.click(screen.getByRole("button", { name: "Comment" }));

    expect(postComment).toHaveBeenCalledWith(7, "Ship it");
    expect(await within(list()).findByText("Ship it")).toBeInTheDocument();
    expect(screen.getByLabelText("Add a comment")).toHaveValue("");

    broadcast({ comment: comment(9, ada, "Ship it") });
    expect(within(list()).getAllByRole("listitem")).toHaveLength(1);
  });

  it("posts with Ctrl/⌘ + Enter", async () => {
    vi.mocked(postComment).mockResolvedValue({ comment: comment(9, ada) });
    await renderComments([]);

    await userEvent.setup().type(screen.getByLabelText("Add a comment"), "Hi{Control>}{Enter}{/Control}");

    expect(postComment).toHaveBeenCalledWith(7, "Hi");
  });

  it("won't post a blank comment", async () => {
    await renderComments([]);

    await userEvent.setup().type(screen.getByLabelText("Add a comment"), "   ");

    expect(screen.getByRole("button", { name: "Comment" })).toBeDisabled();
  });

  it("keeps the draft and explains a failure", async () => {
    vi.mocked(postComment).mockResolvedValue({ message: "You're commenting too fast. Wait a moment and try again." });
    await renderComments([]);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Add a comment"), "Hello");
    await user.click(screen.getByRole("button", { name: "Comment" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("commenting too fast");
    expect(screen.getByLabelText("Add a comment")).toHaveValue("Hello");
  });

  it("deletes a comment", async () => {
    vi.mocked(deleteComment).mockResolvedValue({});
    await renderComments([comment(1, ada, "Oops")]);

    await userEvent.setup().click(screen.getByRole("button", { name: "Delete comment by Ada" }));

    expect(deleteComment).toHaveBeenCalledWith(1);
    expect(await screen.findByText("No comments yet.")).toBeInTheDocument();
  });

  it("keeps a comment it couldn't delete", async () => {
    vi.mocked(deleteComment).mockResolvedValue({ message: "You can only delete your own comments." });
    await renderComments([comment(1, ada, "Stays")], ada);

    await userEvent.setup().click(screen.getByRole("button", { name: "Delete comment by Ada" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You can only delete your own comments.");
    expect(screen.getByText("Stays")).toBeInTheDocument();
  });
});
