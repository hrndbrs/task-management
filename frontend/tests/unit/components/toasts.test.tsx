import { render } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toasts } from "@/components/toasts";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
vi.mock("sonner", () => ({
  Toaster: () => <div data-testid="toaster" />,
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

function clearCookies() {
  for (const cookie of document.cookie.split("; ").filter(Boolean)) {
    document.cookie = `${cookie.split("=")[0]}=; path=/; max-age=0`;
  }
}

describe("Toasts", () => {
  afterEach(() => {
    clearCookies();
    navigation.pathname = "/";
  });

  it("renders the toaster", () => {
    const { getByTestId } = render(<Toasts />);

    expect(getByTestId("toaster")).toBeInTheDocument();
  });

  it("shows a flash message once and clears it", () => {
    document.cookie = `flash=${encodeURIComponent("Task created")}; path=/`;

    const { rerender } = render(<Toasts />);
    rerender(<Toasts />);

    expect(toast.success).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith("Task created", { id: "flash:Task created" });
    expect(document.cookie).not.toContain("flash=");
  });

  it("picks up a flash message set during a navigation", () => {
    const { rerender } = render(<Toasts />);
    expect(toast.success).not.toHaveBeenCalled();

    document.cookie = `flash=${encodeURIComponent("Task deleted")}; path=/`;
    navigation.pathname = "/tasks/4";
    rerender(<Toasts />);

    expect(toast.success).toHaveBeenCalledWith("Task deleted", { id: "flash:Task deleted" });
  });

  it("ignores other cookies", () => {
    document.cookie = "flashy=nope; path=/";

    render(<Toasts />);

    expect(toast.success).not.toHaveBeenCalled();
  });
});
