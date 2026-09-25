<?php

use App\Enums\ExportStatus;
use App\Jobs\GenerateTaskExport;
use App\Models\Export;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');
});

describe('request', function () {
    it('returns 401 without a token', function () {
        $this->postJson('/api/exports', ['format' => 'csv'])->assertStatus(401);
    });

    it('queues the export with the task list filters', function () {
        Queue::fake();
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'api')->postJson('/api/exports', [
            'format' => 'csv',
            'status' => 'pending',
            'sort' => 'due_date',
            'direction' => 'asc',
        ]);

        $response->assertAccepted()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.format', 'csv')
            ->assertJsonPath('data.filters', ['status' => 'pending', 'sort' => 'due_date', 'direction' => 'asc'])
            ->assertJsonPath('data.download_url', null);

        Queue::assertPushed(
            GenerateTaskExport::class,
            fn (GenerateTaskExport $job) => $job->export->is(Export::sole()) && $job->export->user_id === $user->id,
        );
    });

    it('produces a downloadable file once the job has run', function () {
        $user = User::factory()->create();
        Task::factory()->count(2)->create();

        $exportId = $this->actingAs($user, 'api')->postJson('/api/exports', ['format' => 'csv'])->json('data.id');

        $this->actingAs($user, 'api')
            ->getJson("/api/exports/{$exportId}")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.row_count', 2)
            ->assertJsonPath('data.download_url', route('exports.download', $exportId));

        $download = $this->actingAs($user, 'api')->get("/api/exports/{$exportId}/download");
        $download->assertOk();
        expect($download->headers->get('content-disposition'))->toContain('tasks-export-')->toContain('.csv');
    });

    it('returns 422 for an invalid payload', function (array $payload, string $field) {
        $this->actingAs(User::factory()->create(), 'api')
            ->postJson('/api/exports', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors([$field]);
    })->with([
        'missing format' => [[], 'format'],
        'unknown format' => [['format' => 'xlsx'], 'format'],
        'unknown status filter' => [['format' => 'csv', 'status' => 'archived'], 'status'],
        'unsupported sort column' => [['format' => 'csv', 'sort' => 'password'], 'sort'],
    ]);

    it('returns 422 when a PDF would exceed the row limit', function () {
        config(['exports.pdf_max_rows' => 2]);
        Task::factory()->count(3)->create();

        $this->actingAs(User::factory()->create(), 'api')
            ->postJson('/api/exports', ['format' => 'pdf'])
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'format' => 'PDF exports are limited to 2 tasks, but these filters match 3. Use CSV or narrow the filters.',
            ]);
    });

    it('allows the same filters as CSV when a PDF would be too large', function () {
        Queue::fake();
        config(['exports.pdf_max_rows' => 2]);
        Task::factory()->count(3)->create();

        $this->actingAs(User::factory()->create(), 'api')
            ->postJson('/api/exports', ['format' => 'csv'])
            ->assertAccepted();
    });
});

describe('listing and status', function () {
    it('lists only the requester\'s exports, newest first', function () {
        $user = User::factory()->create();
        $older = Export::factory()->for($user)->create(['created_at' => now()->subHour()]);
        $newer = Export::factory()->for($user)->create();
        Export::factory()->create();

        $this->actingAs($user, 'api')
            ->getJson('/api/exports')
            ->assertOk()
            ->assertJsonPath('data.*.id', [$newer->id, $older->id]);
    });

    it('returns 404 for another user\'s export', function () {
        $export = Export::factory()->completed()->create();

        $this->actingAs(User::factory()->admin()->create(), 'api')
            ->getJson("/api/exports/{$export->id}")
            ->assertNotFound();
    });
});

describe('download', function () {
    it('returns 409 while the export is still being generated', function () {
        $export = Export::factory()->create(['status' => ExportStatus::Processing]);

        $this->actingAs($export->user, 'api')
            ->getJson("/api/exports/{$export->id}/download")
            ->assertStatus(409);
    });

    it('returns 410 for a failed export', function () {
        $export = Export::factory()->create(['status' => ExportStatus::Failed]);

        $this->actingAs($export->user, 'api')
            ->getJson("/api/exports/{$export->id}/download")
            ->assertStatus(410);
    });

    it('returns 404 when downloading another user\'s export', function () {
        $export = Export::factory()->completed()->create();
        Storage::disk('local')->put($export->file_path, 'secret');

        $this->actingAs(User::factory()->create(), 'api')
            ->get("/api/exports/{$export->id}/download")
            ->assertNotFound();
    });
});

it('prunes old exports together with their files', function () {
    $old = Export::factory()->completed('exports/1/old.csv')->create(['created_at' => now()->subDays(8)]);
    $recent = Export::factory()->completed('exports/1/recent.csv')->create();
    Storage::disk('local')->put('exports/1/old.csv', 'x');
    Storage::disk('local')->put('exports/1/recent.csv', 'x');

    $this->artisan('model:prune', ['--model' => [Export::class]])->assertSuccessful();

    $this->assertModelMissing($old);
    Storage::disk('local')->assertMissing('exports/1/old.csv');
    $this->assertModelExists($recent);
    Storage::disk('local')->assertExists('exports/1/recent.csv');
});
