import { vi } from "vitest";

export class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}

type StoredCookie = { value: string; options?: Record<string, unknown> };

export const cookieJar = new Map<string, StoredCookie>();

export const nextHeaders = {
  cookies: async () => ({
    get: (name: string) => {
      const cookie = cookieJar.get(name);
      return cookie && { name, value: cookie.value };
    },
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      cookieJar.set(name, { value, options });
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
};

export const nextNavigation = {
  redirect: (url: string): never => {
    throw new RedirectError(url);
  },
  notFound: (): never => {
    throw new Error("NEXT_NOT_FOUND");
  },
};

export const nextCache = { refresh: vi.fn() };

export function json(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function mockFetch(...responses: (Response | Error)[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response);
    else fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function requestOf(fetchMock: ReturnType<typeof mockFetch>, call = 0) {
  const [url, init] = fetchMock.mock.calls[call];
  return {
    url: String(url),
    method: init?.method ?? "GET",
    headers: new Headers(init?.headers),
    body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
  };
}

export async function redirectOf(promise: Promise<unknown>): Promise<string> {
  const error = await promise.then(
    () => {
      throw new Error("Expected a redirect");
    },
    (e: unknown) => e,
  );
  if (!(error instanceof RedirectError)) throw error;
  return error.url;
}

type PresenceMember = { id: number; name: string };
type Handler = (data?: unknown, metadata?: unknown) => void;

export function fakePresenceChannel() {
  const handlers = new Map<string, Set<Handler>>();
  const on = (event: string, handler: Handler) => {
    handlers.set(event, (handlers.get(event) ?? new Set()).add(handler));
  };
  const off = (event: string, handler: Handler) => handlers.get(event)?.delete(handler);
  const emit = (event: string, data?: unknown, metadata?: unknown) =>
    handlers.get(event)?.forEach((handler) => handler(data, metadata));

  let members: PresenceMember[] = [];
  const subscription = {
    subscribed: false,
    members: { each: (callback: (member: { info: PresenceMember }) => void) => members.forEach((info) => callback({ info })) },
    bind: on,
    unbind: off,
  };

  return {
    subscription,
    whisper: vi.fn(),
    listenForWhisper: (event: string, handler: Handler) => on(`client-${event}`, handler),
    stopListeningForWhisper: (event: string, handler: Handler) => off(`client-${event}`, handler),
    join(list: PresenceMember[]) {
      members = list;
      subscription.subscribed = true;
      emit("pusher:subscription_succeeded");
    },
    add(member: PresenceMember) {
      members = [...members, member];
      emit("pusher:member_added");
    },
    remove(id: number) {
      members = members.filter((member) => member.id !== id);
      emit("pusher:member_removed");
    },
    whisperFrom(userId: number | null, event: string, data: unknown) {
      emit(`client-${event}`, data, userId === null ? {} : { user_id: String(userId) });
    },
  };
}

export type FakePresenceChannel = ReturnType<typeof fakePresenceChannel>;
