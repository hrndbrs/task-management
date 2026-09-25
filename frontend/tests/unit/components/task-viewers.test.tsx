import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakePresenceChannel, fakePresenceChannel } from "../fakes";

const echo = vi.hoisted(() => ({ configureEcho: vi.fn(), usePresenceChannel: vi.fn() }));

vi.mock("@laravel/echo-react", () => echo);

const ada = { id: 1, name: "Ada" };
const alan = { id: 2, name: "Alan" };
const grace = { id: 3, name: "Grace" };

let presence: FakePresenceChannel;

async function renderViewers() {
  vi.resetModules();
  const { TaskViewers } = await import("@/app/(dashboard)/tasks/[id]/task-viewers");
  return render(<TaskViewers taskId={7} currentUserId={ada.id} />);
}

describe("TaskViewers", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_REVERB_APP_KEY", "app-key");
    presence = fakePresenceChannel();
    const api = { channel: () => presence };
    echo.usePresenceChannel.mockReturnValue(api);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("joins the task's viewers channel", async () => {
    await renderViewers();

    expect(echo.usePresenceChannel).toHaveBeenCalledWith("tasks.7.viewers");
  });

  it("shows nothing while you're the only viewer", async () => {
    const { container } = await renderViewers();

    act(() => presence.join([ada]));

    expect(container).toBeEmptyDOMElement();
  });

  it("names the one other viewer", async () => {
    await renderViewers();

    act(() => presence.join([ada, alan]));

    expect(screen.getByText("Alan is also here")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Also viewing this task" })).not.toHaveTextContent("Ada");
  });

  it("counts several other viewers and drops those who leave", async () => {
    const { container } = await renderViewers();
    act(() => presence.join([ada, alan, grace]));

    expect(screen.getByText("2 others are here")).toBeInTheDocument();

    act(() => {
      presence.remove(alan.id);
      presence.remove(grace.id);
    });
    expect(container).toBeEmptyDOMElement();
  });
});
