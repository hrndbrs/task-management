import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/session";

export async function POST(request: Request) {
  if (!(await getToken())) {
    return Response.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const params = new URLSearchParams(await request.text());
  const body = new URLSearchParams({
    socket_id: params.get("socket_id") ?? "",
    channel_name: params.get("channel_name") ?? "",
  });

  let res: Response;
  try {
    res = await apiFetch("/broadcasting/auth", { method: "POST", body });
  } catch {
    return Response.json({ message: "Can't reach the server." }, { status: 502 });
  }

  return new Response(await res.text(), {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
