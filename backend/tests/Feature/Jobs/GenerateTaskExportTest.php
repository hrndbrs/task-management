<?php

use App\Enums\ExportFormat;
use App\Enums\ExportStatus;
use App\Enums\TaskStatus;
use App\Jobs\GenerateTaskExport;
use App\Models\Export;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');
});

/**
 * @return list<list<string>>
 */
function exportedCsvRows(Export $export): array
{
    $lines = array_filter(explode("\n", Storage::disk('local')->get($export->file_path)));

    return array_values(array_map(str_getcsv(...), $lines));
}

it('writes a CSV of the tasks matching the filters in the requested order', function () {
    $assignee = User::factory()->create(['name' => 'Dana', 'email' => 'dana@example.com']);
    foreach (['Charlie', 'Alpha', 'Bravo'] as $title) {
        Task::factory()->create(['title' => $title, 'status' => TaskStatus::Pending, 'assigned_user_id' => $assignee->id]);
    }
    Task::factory()->create(['title' => 'Done already', 'status' => TaskStatus::Completed]);
    $export = Export::factory()->create([
        'format' => ExportFormat::Csv,
        'filters' => ['status' => 'pending', 'sort' => 'title', 'direction' => 'asc'],
    ]);

    (new GenerateTaskExport($export))->handle();

    $export->refresh();
    expect($export->status)->toBe(ExportStatus::Completed)
        ->and($export->row_count)->toBe(3)
        ->and($export->completed_at)->not->toBeNull();

    $rows = exportedCsvRows($export);
    expect($rows[0])->toBe(['ID', 'Title', 'Description', 'Status', 'Priority', 'Assignee', 'Assignee Email', 'Creator', 'Due Date', 'Created At', 'Updated At'])
        ->and(array_column(array_slice($rows, 1), 1))->toBe(['Alpha', 'Bravo', 'Charlie'])
        ->and($rows[1][3])->toBe('pending')
        ->and([$rows[1][5], $rows[1][6]])->toBe(['Dana', 'dana@example.com']);
});

it('neutralises cells that a spreadsheet would run as formulas', function () {
    Task::factory()->create(['title' => '=HYPERLINK("https://evil.example","click")', 'description' => '@SUM(A1)']);
    $export = Export::factory()->create(['format' => ExportFormat::Csv]);

    (new GenerateTaskExport($export))->handle();

    $row = exportedCsvRows($export->refresh())[1];
    expect($row[1])->toBe('\'=HYPERLINK("https://evil.example","click")')
        ->and($row[2])->toBe("'@SUM(A1)");
});

it('writes a PDF of the matching tasks', function () {
    Task::factory()->count(3)->create(['status' => TaskStatus::InProgress]);
    Task::factory()->create(['status' => TaskStatus::Cancelled]);
    $export = Export::factory()->create([
        'format' => ExportFormat::Pdf,
        'filters' => ['status' => 'in_progress'],
    ]);

    (new GenerateTaskExport($export))->handle();

    $export->refresh();
    expect($export->status)->toBe(ExportStatus::Completed)
        ->and($export->row_count)->toBe(3)
        ->and($export->file_path)->toEndWith('.pdf')
        ->and(Storage::disk('local')->get($export->file_path))->toStartWith('%PDF-');
});

it('marks the export as failed when the job gives up', function () {
    $export = Export::factory()->create();

    (new GenerateTaskExport($export))->failed(new RuntimeException('disk full'));

    expect($export->refresh()->status)->toBe(ExportStatus::Failed);
});
