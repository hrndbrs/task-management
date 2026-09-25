import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/broadcasting/auth/route";
import { cookieJar, json, mockFetch, requestOf } from "@/tests/unit/fakes";

vi.mock("next/headers", async () => (await import("@/tests/unit/fakes")).nextHeaders);

function authRequest(body: string) {
  return new Request("http://localhost:3000/api/broadcasting/auth", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

describe("POST /api/broadcasting/auth", () => {
  beforeEach(() => cookieJar.clear());

  it("returns 401 without a session and never calls the API", async () => {
    const fetchMock = mockFetch();

    const response = await POST(authRequest("socket_id=1.2&channel_name=private-tasks"));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards only the socket and channel with the session token", async () => {
    cookieJar.set("token", { value: "jwt-abc" });
    const fetchMock = mockFetch(json(200, { auth: "key:signature" }));

    const response = await POST(authRequest("socket_id=1.2&channel_name=private-tasks&extra=ignored"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ auth: "key:signature" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/broadcasting/auth");
    expect(requestOf(fetchMock).headers.get("Authorization")).toBe("Bearer jwt-abc");
    expect(Object.fromEntries(init?.body as URLSearchParams)).toEqual({
      socket_id: "1.2",
      channel_name: "private-tasks",
    });
  });

  it("passes a refusal from the API through", async () => {
    cookieJar.set("token", { value: "jwt-abc" });
    mockFetch(json(403, { message: "Forbidden" }));

    const response = await POST(authRequest("socket_id=1.2&channel_name=private-secrets"));

    expect(response.status).toBe(403);
  });

  it("returns 502 when the API is unreachable", async () => {
    cookieJar.set("token", { value: "jwt-abc" });
    mockFetch(new TypeError("fetch failed"));

    const response = await POST(authRequest("socket_id=1.2&channel_name=private-tasks"));

    expect(response.status).toBe(502);
  });
});
