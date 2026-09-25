"use client";

import type Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

type Level = { index: number; height: number };

export function VideoPlayer({ src, poster, title }: { src: string; poster?: string; title: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const hls = useRef<Hls | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [level, setLevel] = useState(-1);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let cancelled = false;

    import("hls.js").then(({ default: HlsPlayer }) => {
      if (cancelled) return;

      if (!HlsPlayer.isSupported()) {
        if (element.canPlayType("application/vnd.apple.mpegurl")) element.src = src;
        else setError("This browser can't play this video.");
        return;
      }

      const player = new HlsPlayer();
      hls.current = player;
      player.on(HlsPlayer.Events.MANIFEST_PARSED, (_event, data) => {
        setLevels(
          data.levels
            .map((entry, index) => ({ index, height: entry.height }))
            .sort((a, b) => b.height - a.height),
        );
      });
      player.on(HlsPlayer.Events.ERROR, (_event, data) => {
        if (data.fatal) setError("The video couldn't be loaded. Try again later.");
      });
      player.loadSource(src);
      player.attachMedia(element);
    });

    return () => {
      cancelled = true;
      hls.current?.destroy();
      hls.current = null;
    };
  }, [src]);

  const chooseLevel = (value: number) => {
    setLevel(value);
    if (hls.current) hls.current.currentLevel = value;
  };

  return (
    <div className="space-y-2">
      <video
        ref={video}
        controls
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={title}
        className="aspect-video w-full rounded-md bg-black"
      />
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        levels.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            Quality
            <select
              value={level}
              onChange={(e) => chooseLevel(Number(e.target.value))}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-base text-zinc-900 sm:text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value={-1}>Auto</option>
              {levels.map(({ index, height }) => (
                <option key={index} value={index}>
                  {height}p
                </option>
              ))}
            </select>
          </label>
        )
      )}
    </div>
  );
}
