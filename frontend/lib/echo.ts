import { configureEcho } from "@laravel/echo-react";

const reverbKey = process.env.NEXT_PUBLIC_REVERB_APP_KEY;

export const realtimeEnabled = Boolean(reverbKey);

if (reverbKey) {
  const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8081);
  configureEcho({
    broadcaster: "reverb",
    key: reverbKey,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? "localhost",
    wsPort: port,
    wssPort: port,
    forceTLS: process.env.NEXT_PUBLIC_REVERB_SCHEME === "https",
    enabledTransports: ["ws", "wss"],
    authEndpoint: "/api/broadcasting/auth",
  });
}
