import { beforeEach, describe, expect, it, vi } from "vitest";
import { login, logout } from "@/app/actions/auth";
import { cookieJar, json, mockFetch, redirectOf, requestOf } from "@/tests/unit/fakes";

vi.mock("next/headers", async () => (await import("@/tests/unit/fakes")).nextHeaders);
vi.mock("next/navigation", async () => (await import("@/tests/unit/fakes")).nextNavigation);

function credentials(extra: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("email", "ada@example.com");
  formData.set("password", "secret");
  for (const [key, value] of Object.entries(extra)) formData.set(key, value);
  return formData;
}

const tokenResponse = { access_token: "jwt-new", token_type: "bearer", expires_in: 3600 };

describe("login", () => {
  beforeEach(() => cookieJar.clear());

  it("stores the token in an httpOnly cookie and redirects home", async () => {
    const fetchMock = mockFetch(json(200, tokenResponse));

    expect(await redirectOf(login(undefined, credentials()))).toBe("/");

    expect(requestOf(fetchMock).body).toEqual({ email: "ada@example.com", password: "secret" });
    expect(cookieJar.get("token")).toEqual({
      value: "jwt-new",
      options: expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 }),
    });
  });

  it("redirects back to the page the user came from", async () => {
    mockFetch(json(200, tokenResponse));

    expect(await redirectOf(login(undefined, credentials({ from: "/tasks/7?tab=files" })))).toBe(
      "/tasks/7?tab=files",
    );
  });

  it.each(["//evil.example", "https://evil.example", "tasks"])(
    "ignores the unsafe redirect target %s",
    async (from) => {
      mockFetch(json(200, tokenResponse));

      expect(await redirectOf(login(undefined, credentials({ from })))).toBe("/");
    },
  );

  it("returns field errors and keeps the email on 422", async () => {
    mockFetch(json(422, { message: "Invalid.", errors: { email: ["The email field must be a valid email address."] } }));

    const state = await login(undefined, credentials());

    expect(state).toEqual({
      email: "ada@example.com",
      message: "Invalid.",
      errors: { email: ["The email field must be a valid email address."] },
    });
    expect(cookieJar.has("token")).toBe(false);
  });

  it("shows the API message for wrong credentials", async () => {
    mockFetch(json(401, { message: "The provided credentials are incorrect." }));

    expect((await login(undefined, credentials()))?.message).toBe("The provided credentials are incorrect.");
  });

  it("explains rate limiting on 429", async () => {
    mockFetch(json(429, {}));

    expect((await login(undefined, credentials()))?.message).toMatch(/Too many login attempts/);
  });

  it("reports an unreachable API", async () => {
    mockFetch(new TypeError("fetch failed"));

    expect((await login(undefined, credentials()))?.message).toMatch(/Can't reach the server/);
  });
});

describe("logout", () => {
  beforeEach(() => {
    cookieJar.clear();
    cookieJar.set("token", { value: "jwt-old" });
  });

  it("invalidates the token on the API, clears the cookie and redirects to login", async () => {
    const fetchMock = mockFetch(json(200, { message: "Logged out successfully." }));

    expect(await redirectOf(logout())).toBe("/login");

    const request = requestOf(fetchMock);
    expect(request.url).toBe("http://localhost:8000/api/auth/logout");
    expect(request.headers.get("Authorization")).toBe("Bearer jwt-old");
    expect(cookieJar.has("token")).toBe(false);
    expect(cookieJar.get("flash")).toEqual({
      value: "You've been signed out",
      options: { sameSite: "lax", path: "/", maxAge: 60 },
    });
  });

  it("still clears the cookie when the API is unreachable", async () => {
    mockFetch(new TypeError("fetch failed"));

    expect(await redirectOf(logout())).toBe("/login");
    expect(cookieJar.has("token")).toBe(false);
  });
});
