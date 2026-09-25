<?php

use App\Enums\ScanStatus;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');
});

function uploadFirstVersion(User $user, Task $task, string $content): TaskAttachment
{
    test()->actingAs($user, 'api')->postJson("/api/tasks/{$task->id}/attachments", [
        'file' => UploadedFile::fake()->createWithContent('report.txt', $content),
    ])->assertCreated();

    return TaskAttachment::latest('id')->first();
}

function uploadNextVersion(User $user, TaskAttachment $attachment, string $content): TaskAttachment
{
    test()->actingAs($user, 'api')->postJson("/api/attachments/{$attachment->id}/versions", [
        'file' => UploadedFile::fake()->createWithContent('report.txt', $content),
    ])->assertCreated();

    return TaskAttachment::latest('id')->first();
}

describe('upload', function () {
    it('stores the file as the next version of the same attachment', function () {
        $user = User::factory()->create();
        $v1 = uploadFirstVersion($user, Task::factory()->create(['created_by' => $user->id]), 'version one');

        $response = $this->actingAs($user, 'api')->postJson("/api/attachments/{$v1->id}/versions", [
            'file' => UploadedFile::fake()->createWithContent('report.txt', 'version two'),
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.version', 2)
            ->assertJsonPath('data.task_id', $v1->task_id);

        $v2 = TaskAttachment::find($response->json('data.id'));
        expect($v2->version_group)->toBe($v1->version_group);
    });

    it('returns 422 for a disallowed file type', function () {
        $user = User::factory()->create();
        $v1 = uploadFirstVersion($user, Task::factory()->create(['created_by' => $user->id]), 'version one');

        $this->actingAs($user, 'api')
            ->postJson("/api/attachments/{$v1->id}/versions", [
                'file' => UploadedFile::fake()->create('setup.exe', 10, 'application/x-msdownload'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    });

    it('forbids a user who cannot update the task', function () {
        $attachment = TaskAttachment::factory()->create();

        $this->actingAs(User::factory()->create(), 'api')
            ->postJson("/api/attachments/{$attachment->id}/versions", [
                'file' => UploadedFile::fake()->createWithContent('report.txt', 'hijack'),
            ])
            ->assertStatus(403);
    });
});

describe('history', function () {
    it('shows only the latest version of each file on the task', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);
        $report = uploadFirstVersion($user, $task, 'version one');
        $latestReport = uploadNextVersion($user, $report, 'version two');
        $other = uploadFirstVersion($user, $task, 'another file');

        $response = $this->actingAs($user, 'api')->getJson("/api/tasks/{$task->id}");

        expect(collect($response->json('data.attachments'))->pluck('id')->all())
            ->toBe([$latestReport->id, $other->id]);
    });

    it('lists every version newest first', function () {
        $user = User::factory()->create();
        $v1 = uploadFirstVersion($user, Task::factory()->create(['created_by' => $user->id]), 'version one');
        uploadNextVersion($user, $v1, 'version two');

        $this->actingAs($user, 'api')
            ->getJson("/api/attachments/{$v1->id}/versions")
            ->assertOk()
            ->assertJsonPath('data.*.version', [2, 1]);
    });

    it('keeps older versions downloadable', function () {
        $user = User::factory()->create();
        $v1 = uploadFirstVersion($user, Task::factory()->create(['created_by' => $user->id]), 'version one');
        uploadNextVersion($user, $v1, 'version two');

        $response = $this->actingAs($user, 'api')->get("/api/attachments/{$v1->id}/download");

        $response->assertOk();
        expect($response->streamedContent())->toBe('version one');
    });
});

describe('restore', function () {
    it('makes an older version current by adding it as the newest version', function () {
        $user = User::factory()->create();
        $v1 = uploadFirstVersion($user, Task::factory()->create(['created_by' => $user->id]), 'version one');
        uploadNextVersion($user, $v1, 'version two');

        $response = $this->actingAs($user, 'api')->postJson("/api/attachments/{$v1->id}/restore");

        $response->assertCreated()
            ->assertJsonPath('data.version', 3)
            ->assertJsonPath('data.scan_status', 'clean');

        $restored = $this->actingAs($user, 'api')->get("/api/attachments/{$response->json('data.id')}/download");
        expect($restored->streamedContent())->toBe('version one');
    });

    it('returns 409 when restoring a version that failed the virus scan', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);
        $infected = TaskAttachment::factory()->infected()->create(['task_id' => $task->id]);

        $this->actingAs($user, 'api')
            ->postJson("/api/attachments/{$infected->id}/restore")
            ->assertStatus(409);

        expect($infected->versions()->count())->toBe(1);
    });

    it('forbids a user who cannot update the task', function () {
        $attachment = TaskAttachment::factory()->create(['scan_status' => ScanStatus::Clean]);

        $this->actingAs(User::factory()->create(), 'api')
            ->postJson("/api/attachments/{$attachment->id}/restore")
            ->assertStatus(403);
    });
});

describe('delete', function () {
    it('deletes every version of the file and leaves other files alone', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);
        $v1 = uploadFirstVersion($user, $task, 'version one');
        $v2 = uploadNextVersion($user, $v1, 'version two');
        $other = uploadFirstVersion($user, $task, 'another file');

        $this->actingAs($user, 'api')
            ->deleteJson("/api/attachments/{$v2->id}")
            ->assertNoContent();

        $this->assertModelMissing($v1);
        $this->assertModelMissing($v2);
        Storage::disk('local')->assertMissing([$v1->file_path, $v2->file_path]);
        $this->assertModelExists($other);
        Storage::disk('local')->assertExists($other->file_path);
    });
});
