import { act, fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getExport, requestExport } from "@/app/actions/exports";
import { EXPORT_POLL_INTERVAL_MS, EXPORT_TIMEOUT_MS, ExportButton } from "@/app/(dashboard)/export-button";
import { parseTaskFilters } from "@/lib/task-filters";
import type { TaskExport } from "@/lib/types";

vi.mock("@/app/actions/exports", () => ({ requestExport: vi.fn(), getExport: vi.fn() }));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { loading: vi.fn(() => "toast-1"), success: vi.fn(), error: vi.fn() }),
}));

const filters = parseTaskFilters({ status: "pending", sort: "due_date", direction: "asc" });

function exportIn(status: TaskExport["status"], row_count: number | null = null): TaskExport {
  return { id: 9, format: "pdf", status, row_count };
}

async function choose(format: "CSV" | "PDF") {
  fireEvent.click(screen.getByRole("button", { name: "Export" }));
  fireEvent.click(screen.getByRole("menuitem", { name: format }));
  await act(async () => {});
}

async function poll(times = 1) {
  for (let i = 0; i < times; i++) {
    await act(() => vi.advanceTimersByTimeAsync(EXPORT_POLL_INTERVAL_MS));
  }
}

describe("ExportButton", () => {
  let clicked: string[];

  beforeEach(() => {
    vi.useFakeTimers();
    clicked = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.getAttribute("href")!);
    });
  });
  afterEach(() => vi.useRealTimers());

  it("offers CSV and PDF", () => {
    render(<ExportButton filters={filters} />);

    const button = screen.getByRole("button", { name: "Export" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["CSV", "PDF"]);
  });

  it("closes the menu on Escape or a click elsewhere", () => {
    render(<ExportButton filters={filters} />);

    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("exports the current filters, waits for the file and downloads it", async () => {
    vi.mocked(requestExport).mockResolvedValue({ export: exportIn("pending") });
    vi.mocked(getExport)
      .mockResolvedValueOnce({ export: exportIn("processing") })
      .mockResolvedValueOnce({ export: exportIn("completed", 12) });
    render(<ExportButton filters={filters} />);

    await choose("PDF");

    expect(requestExport).toHaveBeenCalledWith("pdf", filters);
    expect(toast.loading).toHaveBeenCalledWith("Preparing PDF export…");
    expect(screen.getByRole("button", { name: "Exporting…" })).toBeDisabled();

    await poll();
    expect(clicked).toEqual([]);

    await poll();
    expect(getExport).toHaveBeenCalledWith(9);
    expect(clicked).toEqual(["/api/exports/9/download"]);
    expect(toast.success).toHaveBeenCalledWith("PDF export ready: 12 tasks", { id: "toast-1" });
    expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();
  });

  it("says 1 task, not 1 tasks", async () => {
    vi.mocked(requestExport).mockResolvedValue({ export: exportIn("pending") });
    vi.mocked(getExport).mockResolvedValue({ export: exportIn("completed", 1) });
    render(<ExportButton filters={filters} />);

    await choose("CSV");
    await poll();

    expect(toast.success).toHaveBeenCalledWith("CSV export ready: 1 task", { id: "toast-1" });
  });

  it("shows why the export could not start", async () => {
    const message = "PDF exports are limited to 2000 tasks, but these filters match 2500. Use CSV or narrow the filters.";
    vi.mocked(requestExport).mockResolvedValue({ message });
    render(<ExportButton filters={filters} />);

    await choose("PDF");

    expect(toast.error).toHaveBeenCalledWith(message, { id: "toast-1" });
    expect(getExport).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();
  });

  it("reports an export that failed in the background", async () => {
    vi.mocked(requestExport).mockResolvedValue({ export: exportIn("pending") });
    vi.mocked(getExport).mockResolvedValue({ export: exportIn("failed") });
    render(<ExportButton filters={filters} />);

    await choose("CSV");
    await poll();

    expect(toast.error).toHaveBeenCalledWith("The export failed. Try again.", { id: "toast-1" });
    expect(clicked).toEqual([]);
  });

  it("gives up if the export is never ready", async () => {
    vi.mocked(requestExport).mockResolvedValue({ export: exportIn("pending") });
    vi.mocked(getExport).mockResolvedValue({ export: exportIn("processing") });
    render(<ExportButton filters={filters} />);

    await choose("CSV");
    await act(() => vi.advanceTimersByTimeAsync(EXPORT_TIMEOUT_MS + EXPORT_POLL_INTERVAL_MS));

    expect(toast.error).toHaveBeenCalledWith("The export is taking too long. Try again later.", { id: "toast-1" });
    expect(clicked).toEqual([]);
  });

  it("stops checking once the page is left", async () => {
    vi.mocked(requestExport).mockResolvedValue({ export: exportIn("pending") });
    vi.mocked(getExport).mockResolvedValue({ export: exportIn("processing") });
    const { unmount } = render(<ExportButton filters={filters} />);

    await choose("CSV");
    await poll();
    unmount();
    await poll(3);

    expect(getExport).toHaveBeenCalledTimes(1);
    expect(clicked).toEqual([]);
  });
});
