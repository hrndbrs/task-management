import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAttachment } from "@/app/actions/attachments";
import { cookieJar, json, mockFetch, nextCache, redirectOf, requestOf } from "@/tests/unit/fakes";

vi.mock("next/headers", async () => (await import("@/tests/unit/fakes")).nextHeaders);
vi.mock("next/navigation", async () => (await import("@/tests/unit/fakes")).nextNavigation);
vi.mock("next/cache", async () => (await import("@/tests/unit/fakes")).nextCache);

describe("deleteAttachment", () => {
  beforeEach(() => cookieJar.set("token", { value: "jwt" }));

  it("deletes the file and refreshes the page", async () => {
    const fetchMock = mockFetch(new Response(null, { status: 204 }));

    expect(await deleteAttachment(12)).toEqual({});
    expect(requestOf(fetchMock)).toMatchObject({ method: "DELETE", url: "http://localhost:8000/api/attachments/12" });
    expect(nextCache.refresh).toHaveBeenCalledOnce();
  });

  it("treats a file that's already gone as deleted", async () => {
    mockFetch(json(404, { message: "Not found" }));

    expect(await deleteAttachment(12)).toEqual({});
    expect(nextCache.refresh).toHaveBeenCalledOnce();
  });

  it.each([
    [json(403, {}), "You don't have permission to delete this file."],
    [json(500, {}), "Couldn't delete the file. Try again."],
    [new TypeError("fetch failed"), "Can't reach the server. Try again shortly."],
  ])("reports a failure", async (response, message) => {
    mockFetch(response);

    expect(await deleteAttachment(12)).toEqual({ message });
    expect(nextCache.refresh).not.toHaveBeenCalled();
  });

  it("sends an expired session to the login page", async () => {
    mockFetch(json(401, {}));

    expect(await redirectOf(deleteAttachment(12))).toBe("/login");
  });
});
