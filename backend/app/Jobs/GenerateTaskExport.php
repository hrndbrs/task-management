<?php

namespace App\Jobs;

use App\Enums\ExportFormat;
use App\Enums\ExportStatus;
use App\Models\Export;
use App\Models\Task;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Throwable;

class GenerateTaskExport implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    // Must stay below the queue connection's retry_after (900s).
    public int $timeout = 75;

    public bool $deleteWhenMissingModels = true;

    private const CSV_HEADERS = [
        'ID', 'Title', 'Description', 'Status', 'Priority', 'Assignee', 'Assignee Email',
        'Creator', 'Due Date', 'Created At', 'Updated At',
    ];

    /**
     * Create a new job instance.
     */
    public function __construct(public Export $export) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $this->export->update(['status' => ExportStatus::Processing]);

        $query = Task::query()->with(['assignedUser', 'creator'])->filtered($this->export->filters);

        // Named after the export so a retry overwrites its own file instead of orphaning one.
        $path = "exports/{$this->export->user_id}/{$this->export->id}.{$this->export->format->value}";

        $rowCount = match ($this->export->format) {
            ExportFormat::Csv => $this->writeCsv($query, $path),
            ExportFormat::Pdf => $this->writePdf($query, $path),
        };

        $this->export->update([
            'status' => ExportStatus::Completed,
            'file_path' => $path,
            'row_count' => $rowCount,
            'completed_at' => now(),
        ]);
    }

    public function failed(?Throwable $exception): void
    {
        $this->export->update(['status' => ExportStatus::Failed]);
    }

    private function writeCsv(Builder $query, string $path): int
    {
        $stream = tmpfile();
        $rowCount = 0;

        try {
            fputcsv($stream, self::CSV_HEADERS, escape: '');

            foreach ($query->lazy(500) as $task) {
                fputcsv($stream, array_map($this->neutraliseFormula(...), [
                    $task->id,
                    $task->title,
                    $task->description,
                    $task->status->value,
                    $task->priority->value,
                    $task->assignedUser?->name,
                    $task->assignedUser?->email,
                    $task->creator->name,
                    $task->due_date?->toDateString(),
                    $task->created_at->toDateTimeString(),
                    $task->updated_at->toDateTimeString(),
                ]), escape: '');
                $rowCount++;
            }

            rewind($stream);
            Storage::disk(config('exports.disk'))->writeStream($path, $stream);
        } finally {
            fclose($stream);
        }

        return $rowCount;
    }

    private function writePdf(Builder $query, string $path): int
    {
        $tasks = $query->get();

        $pdf = Pdf::loadView('exports.tasks', [
            'tasks' => $tasks,
            'filters' => $this->export->filters,
            'generatedAt' => now(),
        ])->setPaper('a4', 'landscape')->setOption('isFontSubsettingEnabled', true);

        Storage::disk(config('exports.disk'))->put($path, $pdf->output());

        return $tasks->count();
    }

    /**
     * Stop spreadsheet apps from executing user-entered text as a formula (CSV injection).
     */
    private function neutraliseFormula(mixed $value): mixed
    {
        if (is_string($value) && $value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'".$value;
        }

        return $value;
    }
}
