import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const echo = vi.hoisted(() => ({
  configureEcho: vi.fn(),
  useEcho: vi.fn(),
}));

vi.mock("@laravel/echo-react", () => echo);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

async function renderListener() {
  vi.resetModules();
  const { LiveTaskUpdates } = await import("@/app/(dashboard)/live-task-updates");
  return render(<LiveTaskUpdates />);
}

function taskChanged() {
  const callback = echo.useEcho.mock.calls.at(-1)?.[2] as () => void;
  act(() => callback());
}

describe("LiveTaskUpdates", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  describe("with Reverb configured", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_REVERB_APP_KEY", "app-key");
      vi.stubEnv("NEXT_PUBLIC_REVERB_HOST", "ws.example.test");
      vi.stubEnv("NEXT_PUBLIC_REVERB_PORT", "9000");
      vi.stubEnv("NEXT_PUBLIC_REVERB_SCHEME", "https");
    });

    it("authorizes channels through the Next proxy", async () => {
      await renderListener();

      expect(echo.configureEcho).toHaveBeenCalledWith(
        expect.objectContaining({
          broadcaster: "reverb",
          key: "app-key",
          wsHost: "ws.example.test",
          wsPort: 9000,
          forceTLS: true,
          authEndpoint: "/api/broadcasting/auth",
        }),
      );
    });

    it("listens for task changes on the private tasks channel", async () => {
      await renderListener();

      expect(echo.useEcho).toHaveBeenCalledWith("tasks", ".tasks.changed", expect.any(Function));
    });

    it("refreshes the page once for a burst of changes", async () => {
      await renderListener();

      taskChanged();
      taskChanged();
      taskChanged();
      expect(refresh).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(300));
      expect(refresh).toHaveBeenCalledOnce();
    });

    it("does not refresh after leaving the dashboard", async () => {
      const { unmount } = await renderListener();

      taskChanged();
      unmount();
      act(() => vi.advanceTimersByTime(300));

      expect(refresh).not.toHaveBeenCalled();
    });
  });

  it("stays inert when Reverb is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_REVERB_APP_KEY", "");

    await renderListener();

    expect(echo.configureEcho).not.toHaveBeenCalled();
    expect(echo.useEcho).not.toHaveBeenCalled();
  });
});
