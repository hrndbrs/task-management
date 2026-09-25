import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "@/app/api/[...path]/route";
import { cookieJar, json, mockFetch, requestOf } from "@/tests/unit/fakes";

vi.mock("next/headers", async () => (await import("@/tests/unit/fakes")).nextHeaders);

const UPLOAD_ID = "01a0d9a5-e614-7308-bfbd-f05723a058b6";

function call(handler: typeof GET, method: string, path: string, init: RequestInit = {}) {
  const request = new Request(`http://localhost:3000/api/${path}`, { method, ...init });
  return handler(request, { params: Promise.resolve({ path: path.split("/") }) });
}

describe("/api/[...path] proxy", () => {
  beforeEach(() => {
    cookieJar.clear();
    cookieJar.set("token", { value: "jwt-abc" });
  });

  it.each([
    ["GET", GET, "tasks/1"],
    ["GET", GET, "attachments/1/versions"],
    ["POST", POST, "auth/login"],
    ["POST", POST, "tasks/1"],
    ["DELETE", DELETE, "tasks/1"],
    ["DELETE", DELETE, "attachments/1"],
    ["GET", GET, "attachments/../users/download"],
    ["GET", GET, "attachments/3/stream/secret.txt"],
    ["GET", GET, "attachments/3/stream/stream_1/../../secret.ts"],
    ["GET", GET, "exports"],
    ["GET", GET, "exports/4"],
    ["POST", POST, "exports"],
  ])("refuses %s %s", async (method, handler, path) => {
    const fetchMock = mockFetch();

    const response = await call(handler, method, path);

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 401 without a session and never calls the API", async () => {
    cookieJar.clear();
    const fetchMock = mockFetch();

    const response = await call(GET, "GET", "attachments/3/download");

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("streams an upload through with the session token", async () => {
    const fetchMock = mockFetch(json(201, { data: { id: 9 } }));
    const form = new FormData();
    form.append("file", new File(["hello"], "note.txt", { type: "text/plain" }));
    const upload = new Request("http://localhost/", { method: "POST", body: form });

    const response = await call(POST, "POST", "tasks/4/attachments", {
      headers: { "Content-Type": upload.headers.get("Content-Type")!, Cookie: "token=leak" },
      body: upload.body,
      duplex: "half",
    } as RequestInit);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { id: 9 } });
    const request = requestOf(fetchMock);
    expect(request.url).toBe("http://localhost:8000/api/tasks/4/attachments");
    expect(request.method).toBe("POST");
    expect(request.headers.get("Authorization")).toBe("Bearer jwt-abc");
    expect(request.headers.get("Content-Type")).toMatch(/^multipart\/form-data; boundary=/);
    expect(request.headers.get("Cookie")).toBeNull();
    expect(fetchMock.mock.calls[0][1]?.body).toBeInstanceOf(ReadableStream);
  });

  it.each([
    ["POST", POST, "tasks/4/attachments/uploads"],
    ["POST", POST, `uploads/${UPLOAD_ID}/chunks/3`],
    ["POST", POST, `uploads/${UPLOAD_ID}/complete`],
    ["DELETE", DELETE, `uploads/${UPLOAD_ID}`],
    ["GET", GET, "attachments/3/thumbnail"],
    ["GET", GET, "exports/4/download"],
    ["GET", GET, "attachments/3/stream/master.m3u8"],
    ["GET", GET, "attachments/3/stream/stream_1/index.m3u8"],
    ["GET", GET, "attachments/3/stream/stream_1/seg_012.ts"],
  ])("forwards %s %s", async (method, handler, path) => {
    const fetchMock = mockFetch(json(200, {}));

    await call(handler, method, path);

    expect(requestOf(fetchMock)).toMatchObject({
      url: `http://localhost:8000/api/${path}`,
      method,
    });
  });

  it("passes a download's file headers back", async () => {
    mockFetch(
      new Response("hello world", {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": "attachment; filename=note.txt",
          "Set-Cookie": "laravel_session=x",
        },
      }),
    );

    const response = await call(GET, "GET", "attachments/3/download");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("hello world");
    expect(response.headers.get("Content-Disposition")).toBe("attachment; filename=note.txt");
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });

  it("passes an API error through", async () => {
    mockFetch(json(409, { message: "This file is still being scanned for viruses." }));

    const response = await call(GET, "GET", "attachments/3/download");

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: "This file is still being scanned for viruses." });
  });

  it("returns 502 when the API is unreachable", async () => {
    mockFetch(new TypeError("fetch failed"));

    const response = await call(GET, "GET", "attachments/3/download");

    expect(response.status).toBe(502);
  });
});
