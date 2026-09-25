import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteComment, postComment } from "@/app/actions/comments";
import { cookieJar, json, mockFetch, redirectOf, requestOf } from "@/tests/unit/fakes";

vi.mock("next/headers", async () => (await import("@/tests/unit/fakes")).nextHeaders);
vi.mock("next/navigation", async () => (await import("@/tests/unit/fakes")).nextNavigation);

const comment = { id: 5, task_id: 3, comment: "Hi", user: { id: 1 }, created_at: "2026-09-26T10:00:00Z" };

describe("postComment", () => {
  beforeEach(() => cookieJar.set("token", { value: "jwt" }));

  it("posts the comment and returns it", async () => {
    const fetchMock = mockFetch(json(201, { data: comment }));

    expect(await postComment(3, "Hi")).toEqual({ comment });
    expect(requestOf(fetchMock)).toMatchObject({
      url: "http://localhost:8000/api/tasks/3/comments",
      method: "POST",
      body: { comment: "Hi" },
    });
  });

  it.each([
    [json(422, { message: "Invalid", errors: { comment: ["The comment field is required."] } }), "The comment field is required."],
    [json(404, {}), "This task no longer exists."],
    [json(429, {}), "You're commenting too fast. Wait a moment and try again."],
    [json(500, {}), "Couldn't post your comment. Try again."],
    [new TypeError("fetch failed"), "Can't reach the server. Try again shortly."],
  ])("explains a failure", async (response, message) => {
    mockFetch(response);

    expect(await postComment(3, "Hi")).toEqual({ message });
  });

  it("sends an expired session to the login page", async () => {
    mockFetch(json(401, {}));

    expect(await redirectOf(postComment(3, "Hi"))).toBe("/login");
  });
});

describe("deleteComment", () => {
  beforeEach(() => cookieJar.set("token", { value: "jwt" }));

  it("deletes the comment", async () => {
    const fetchMock = mockFetch(new Response(null, { status: 204 }));

    expect(await deleteComment(5)).toEqual({});
    expect(requestOf(fetchMock)).toMatchObject({ url: "http://localhost:8000/api/comments/5", method: "DELETE" });
  });

  it("treats a comment that's already gone as deleted", async () => {
    mockFetch(json(404, {}));

    expect(await deleteComment(5)).toEqual({});
  });

  it("refuses someone else's comment", async () => {
    mockFetch(json(403, {}));

    expect(await deleteComment(5)).toEqual({ message: "You can only delete your own comments." });
  });
});
