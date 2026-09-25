import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VideoPlayer } from "@/app/(dashboard)/tasks/[id]/video-player";

const hls = vi.hoisted(() => {
  type Handler = (event: string, data: unknown) => void;

  class FakeHls {
    static supported = true;
    static instances: FakeHls[] = [];
    static Events = { MANIFEST_PARSED: "hlsManifestParsed", ERROR: "hlsError" };
    static isSupported() {
      return FakeHls.supported;
    }

    handlers = new Map<string, Handler>();
    source?: string;
    media?: HTMLMediaElement;
    destroyed = false;
    currentLevel = -1;

    constructor() {
      FakeHls.instances.push(this);
    }
    on(event: string, handler: Handler) {
      this.handlers.set(event, handler);
    }
    loadSource(source: string) {
      this.source = source;
    }
    attachMedia(media: HTMLMediaElement) {
      this.media = media;
    }
    destroy() {
      this.destroyed = true;
    }
    emit(event: string, data: unknown) {
      act(() => this.handlers.get(event)?.(event, data));
    }
  }

  return FakeHls;
});

vi.mock("hls.js", () => ({ default: hls }));

const SRC = "/api/attachments/7/stream/master.m3u8";

async function renderPlayer() {
  const result = render(<VideoPlayer src={SRC} poster="/api/attachments/7/thumbnail" title="walkthrough.mp4" />);
  await act(async () => {});
  return result;
}

const player = () => hls.instances.at(-1)!;

describe("VideoPlayer", () => {
  beforeEach(() => {
    hls.supported = true;
    hls.instances = [];
  });

  it("streams the playlist through hls.js into a video with controls", async () => {
    await renderPlayer();

    const video = screen.getByLabelText("walkthrough.mp4");
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("poster", "/api/attachments/7/thumbnail");
    expect(player().source).toBe(SRC);
    expect(player().media).toBe(video);
  });

  it("offers each quality level, highest first, with automatic switching by default", async () => {
    await renderPlayer();

    player().emit("hlsManifestParsed", { levels: [{ height: 360 }, { height: 1080 }, { height: 720 }] });

    const picker = screen.getByLabelText("Quality");
    expect(picker).toHaveValue("-1");
    expect([...picker.querySelectorAll("option")].map((o) => o.textContent)).toEqual([
      "Auto",
      "1080p",
      "720p",
      "360p",
    ]);
  });

  it("switches to the chosen quality level", async () => {
    await renderPlayer();
    player().emit("hlsManifestParsed", { levels: [{ height: 360 }, { height: 720 }] });

    await userEvent.setup().selectOptions(screen.getByLabelText("Quality"), "360p");

    expect(player().currentLevel).toBe(0);
  });

  it("hides the quality picker when there is only one level", async () => {
    await renderPlayer();

    player().emit("hlsManifestParsed", { levels: [{ height: 240 }] });

    expect(screen.queryByLabelText("Quality")).not.toBeInTheDocument();
  });

  it("explains a video that fails to load", async () => {
    await renderPlayer();

    player().emit("hlsError", { fatal: true });

    expect(screen.getByRole("alert")).toHaveTextContent("The video couldn't be loaded. Try again later.");
  });

  it("ignores errors hls.js recovers from", async () => {
    await renderPlayer();

    player().emit("hlsError", { fatal: false });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("falls back to native HLS where hls.js isn't supported", async () => {
    hls.supported = false;
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("maybe");

    await renderPlayer();

    expect(hls.instances).toHaveLength(0);
    expect(screen.getByLabelText("walkthrough.mp4")).toHaveAttribute("src", SRC);
  });

  it("says so when the browser can't play HLS at all", async () => {
    hls.supported = false;
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");

    await renderPlayer();

    expect(screen.getByRole("alert")).toHaveTextContent("This browser can't play this video.");
  });

  it("releases the stream when closed", async () => {
    const { unmount } = await renderPlayer();

    unmount();

    expect(player().destroyed).toBe(true);
  });
});
