import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTask, deleteTask, updateTask } from "@/app/actions/tasks";
import { cookieJar, json, mockFetch, nextCache, redirectOf, requestOf } from "@/tests/unit/fakes";

vi.mock("next/headers", async () => (await import("@/tests/unit/fakes")).nextHeaders);
vi.mock("next/navigation", async () => (await import("@/tests/unit/fakes")).nextNavigation);
vi.mock("next/cache", async () => (await import("@/tests/unit/fakes")).nextCache);

function taskForm(fields: Record<string, string>) {
  const formData = new FormData();
  const defaults = { title: "", description: "", status: "pending", priority: "medium", assigned_user_id: "", due_date: "" };
  for (const [key, value] of Object.entries({ ...defaults, ...fields })) formData.set(key, value);
  return formData;
}

describe("task actions", () => {
  beforeEach(() => cookieJar.set("token", { value: "jwt" }));

  describe("createTask", () => {
    it("posts a normalized payload and opens the new task", async () => {
      const fetchMock = mockFetch(json(201, { data: { id: 42 } }));
      const form = taskForm({ title: "  Ship it  ", assigned_user_id: "3", priority: "high" });

      expect(await redirectOf(createTask(undefined, form))).toBe("/tasks/42");

      const request = requestOf(fetchMock);
      expect(request.method).toBe("POST");
      expect(request.url).toBe("http://localhost:8000/api/tasks");
      expect(request.body).toEqual({
        title: "Ship it",
        description: null,
        status: "pending",
        priority: "high",
        assigned_user_id: 3,
        due_date: null,
      });
    });

    it("returns validation errors with the submitted values on 422", async () => {
      mockFetch(json(422, { message: "The title field is required.", errors: { title: ["The title field is required."] } }));
      const form = taskForm({ description: "Keep me", priority: "urgent" });

      const state = await createTask(undefined, form);

      expect(state?.errors).toEqual({ title: ["The title field is required."] });
      expect(state?.values).toMatchObject({ title: "", description: "Keep me", priority: "urgent" });
    });

    it("keeps the submitted values when the API is unreachable", async () => {
      mockFetch(new TypeError("fetch failed"));

      const state = await createTask(undefined, taskForm({ title: "Draft" }));

      expect(state?.message).toMatch(/Can't reach the server/);
      expect(state?.values?.title).toBe("Draft");
    });

    it("sends the user to login when the session has expired", async () => {
      mockFetch(json(401, { message: "Unauthenticated." }));

      expect(await redirectOf(createTask(undefined, taskForm({ title: "x" })))).toBe("/login");
    });
  });

  describe("updateTask", () => {
    it("puts the changes, refreshes the page and reports success", async () => {
      const fetchMock = mockFetch(json(200, { data: { id: 7 } }));

      const state = await updateTask(7, undefined, taskForm({ title: "Renamed", status: "completed" }));

      expect(state).toEqual({ saved: true });
      expect(nextCache.refresh).toHaveBeenCalledOnce();
      const request = requestOf(fetchMock);
      expect(request.method).toBe("PUT");
      expect(request.url).toBe("http://localhost:8000/api/tasks/7");
      expect(request.body).toMatchObject({ title: "Renamed", status: "completed" });
    });

    it("explains a permission failure on 403", async () => {
      mockFetch(json(403, { message: "This action is unauthorized." }));

      const state = await updateTask(7, undefined, taskForm({ title: "Nope" }));

      expect(state?.message).toBe("You don't have permission to change this task.");
      expect(nextCache.refresh).not.toHaveBeenCalled();
    });
  });

  describe("deleteTask", () => {
    it("deletes the task and returns to the dashboard", async () => {
      const fetchMock = mockFetch(new Response(null, { status: 204 }));

      expect(await redirectOf(deleteTask(7))).toBe("/");
      expect(requestOf(fetchMock)).toMatchObject({ method: "DELETE", url: "http://localhost:8000/api/tasks/7" });
    });

    it("reports a task that was already deleted", async () => {
      mockFetch(json(404, { message: "Not found" }));

      expect((await deleteTask(7))?.message).toBe("This task no longer exists.");
    });
  });
});
