import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScanStatusRefresher } from "@/app/(dashboard)/tasks/[id]/scan-status-refresher";

const router = { refresh: vi.fn() };

vi.mock("next/navigation", () => ({ useRouter: () => router }));

describe("ScanStatusRefresher", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("refreshes the page every 3 seconds while a scan is pending", () => {
    render(<ScanStatusRefresher pending />);

    vi.advanceTimersByTime(2999);
    expect(router.refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(router.refresh).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(3000);
    expect(router.refresh).toHaveBeenCalledTimes(2);
  });

  it("does nothing when no scan is pending", () => {
    render(<ScanStatusRefresher pending={false} />);

    vi.advanceTimersByTime(10_000);

    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("stops once the scans finish", () => {
    const { rerender } = render(<ScanStatusRefresher pending />);

    rerender(<ScanStatusRefresher pending={false} />);
    vi.advanceTimersByTime(10_000);

    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("stops when the page is left", () => {
    const { unmount } = render(<ScanStatusRefresher pending />);

    unmount();
    vi.advanceTimersByTime(10_000);

    expect(router.refresh).not.toHaveBeenCalled();
  });
});
