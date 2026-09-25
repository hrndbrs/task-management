import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakePresenceChannel, fakePresenceChannel } from "../fakes";

const echo = vi.hoisted(() => ({ configureEcho: vi.fn(), usePresenceChannel: vi.fn() }));

vi.mock("@laravel/echo-react", () => echo);

let presence: FakePresenceChannel;

async function renderOnlineUsers() {
  vi.resetModules();
  const { OnlineUsers } = await import("@/components/online-users");
  return render(<OnlineUsers />);
}

describe("OnlineUsers", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_REVERB_APP_KEY", "app-key");
    presence = fakePresenceChannel();
    const api = { channel: () => presence };
    echo.usePresenceChannel.mockReturnValue(api);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("joins the online presence channel", async () => {
    await renderOnlineUsers();

    expect(echo.usePresenceChannel).toHaveBeenCalledWith("online");
  });

  it("shows nothing until the channel is joined", async () => {
    const { container } = await renderOnlineUsers();

    expect(container).toBeEmptyDOMElement();
  });

  it("lists who is online, sorted by name", async () => {
    await renderOnlineUsers();

    act(() => presence.join([{ id: 2, name: "Alan Turing" }, { id: 1, name: "Ada Lovelace" }]));

    expect(screen.getByText("2 online")).toBeInTheDocument();
    const avatars = within(screen.getByRole("list", { name: "Online users" })).getAllByRole("listitem");
    expect(avatars.map((avatar) => avatar.textContent)).toEqual(["ALAda Lovelace", "ATAlan Turing"]);
  });

  it("updates as people come and go", async () => {
    await renderOnlineUsers();
    act(() => presence.join([{ id: 1, name: "Ada" }]));

    act(() => presence.add({ id: 2, name: "Alan" }));
    expect(screen.getByText("2 online")).toBeInTheDocument();

    act(() => presence.remove(1));
    expect(screen.getByText("1 online")).toBeInTheDocument();
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
  });

  it("collapses a long list into a count", async () => {
    await renderOnlineUsers();

    act(() => presence.join(["Ada", "Alan", "Grace", "Linus", "Margaret", "Ken"].map((name, i) => ({ id: i + 1, name }))));

    expect(screen.getByText("and 2 more")).toBeInTheDocument();
    expect(screen.getByText("+2").closest("li")).toHaveAttribute("title", "Linus, Margaret");
  });

  it("stays inert when Reverb is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_REVERB_APP_KEY", "");

    const { container } = await renderOnlineUsers();

    expect(echo.usePresenceChannel).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
