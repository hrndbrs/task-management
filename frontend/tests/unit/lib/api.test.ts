import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { cookieJar, json, mockFetch, requestOf } from "@/tests/unit/fakes";

vi.mock("next/headers", async () => (await import("@/tests/unit/fakes")).nextHeaders);

describe("apiFetch", () => {
  beforeEach(() => cookieJar.clear());

  it("sends the session token as a bearer token", async () => {
    cookieJar.set("token", { value: "jwt-123" });
    const fetchMock = mockFetch(json(200, {}));

    await apiFetch("/auth/me");

    const request = requestOf(fetchMock);
    expect(request.url).toBe("http://localhost:8000/api/auth/me");
    expect(request.headers.get("Authorization")).toBe("Bearer jwt-123");
    expect(request.headers.get("Accept")).toBe("application/json");
  });

  it("omits the authorization header when there is no session", async () => {
    const fetchMock = mockFetch(json(200, {}));

    await apiFetch("/auth/login", { method: "POST", body: "{}" });

    expect(requestOf(fetchMock).headers.has("Authorization")).toBe(false);
  });

  it("marks string bodies as JSON but leaves form and URL-encoded bodies alone", async () => {
    const fetchMock = mockFetch(json(200, {}), json(200, {}), json(200, {}));

    await apiFetch("/tasks", { method: "POST", body: "{}" });
    await apiFetch("/tasks/1/attachments", { method: "POST", body: new FormData() });
    await apiFetch("/broadcasting/auth", { method: "POST", body: new URLSearchParams({ a: "1" }) });

    expect(requestOf(fetchMock, 0).headers.get("Content-Type")).toBe("application/json");
    expect(requestOf(fetchMock, 1).headers.has("Content-Type")).toBe(false);
    expect(requestOf(fetchMock, 2).headers.has("Content-Type")).toBe(false);
  });

  it("never caches API responses", async () => {
    const fetchMock = mockFetch(json(200, {}));

    await apiFetch("/tasks");

    expect(fetchMock.mock.calls[0][1]?.cache).toBe("no-store");
  });
});
