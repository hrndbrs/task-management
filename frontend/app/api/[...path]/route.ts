import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/session";

const ALLOWED: Record<string, RegExp[]> = {
  GET: [
    /^attachments\/\d+\/(download|thumbnail)$/,
    /^attachments\/\d+\/stream\/(master\.m3u8|stream_\d+\/(index\.m3u8|seg_\d+\.ts))$/,
    /^exports\/\d+\/download$/,
  ],
  POST: [
    /^tasks\/\d+\/attachments(\/uploads)?$/,
    /^uploads\/[0-9a-f-]{36}\/(chunks\/\d+|complete)$/,
  ],
  DELETE: [/^uploads\/[0-9a-f-]{36}$/],
};

const FORWARDED_REQUEST_HEADERS = ["Content-Type", "Content-Length"];
const FORWARDED_RESPONSE_HEADERS = [
  "Content-Type",
  "Content-Length",
  "Content-Disposition",
  "Cache-Control",
];

async function forward(request: Request, ctx: RouteContext<"/api/[...path]">) {
  const path = (await ctx.params).path.join("/");

  if (!ALLOWED[request.method]?.some((pattern) => pattern.test(path))) {
    return Response.json({ message: "Not found." }, { status: 404 });
  }
  if (!(await getToken())) {
    return Response.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let res: Response;
  try {
    res = await apiFetch(`/${path}`, {
      method: request.method,
      headers,
      body: request.body,
      duplex: "half",
    } as RequestInit);
  } catch {
    return Response.json({ message: "Can't reach the server." }, { status: 502 });
  }

  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = res.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(res.body, { status: res.status, headers: responseHeaders });
}

export { forward as GET, forward as POST, forward as DELETE };
