<?php

use App\Enums\ScanStatus;
use App\Jobs\GenerateAttachmentThumbnail;
use App\Jobs\ScanAttachmentForViruses;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\User;
use App\Services\EicarVirusScanner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');
});

describe('store', function () {
    it('returns 401 without a token', function () {
        $task = Task::factory()->create();

        $this->postJson("/api/tasks/{$task->id}/attachments")->assertStatus(401);
    });

    it('stores the file and records its metadata', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);

        $response = $this->actingAs($user, 'api')->postJson("/api/tasks/{$task->id}/attachments", [
            'file' => UploadedFile::fake()->create('report.pdf', 120, 'application/pdf'),
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.task_id', $task->id)
            ->assertJsonPath('data.file_name', 'report.pdf')
            ->assertJsonPath('data.mime_type', 'application/pdf')
            ->assertJsonMissingPath('data.file_path');

        $attachment = TaskAttachment::sole();
        expect($attachment->file_size)->toBe(120 * 1024);
        Storage::disk('local')->assertExists($attachment->file_path);
    });

    it('returns 422 when no file is sent', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);

        $this->actingAs($user, 'api')
            ->postJson("/api/tasks/{$task->id}/attachments", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file' => 'The file field is required.']);
    });

    it('returns 422 for a disallowed file type', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);

        $this->actingAs($user, 'api')
            ->postJson("/api/tasks/{$task->id}/attachments", [
                'file' => UploadedFile::fake()->create('malware.exe', 10, 'application/x-msdownload'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);

        expect(TaskAttachment::count())->toBe(0);
    });

    it('returns 422 when the file exceeds the size limit', function () {
        config(['attachments.max_size' => 100]);
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);

        $this->actingAs($user, 'api')
            ->postJson("/api/tasks/{$task->id}/attachments", [
                'file' => UploadedFile::fake()->create('big.pdf', 101, 'application/pdf'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file' => 'The file field must not be greater than 100 kilobytes.']);
    });

    it('forbids a user who cannot update the task', function () {
        $stranger = User::factory()->create();
        $task = Task::factory()->create();

        $this->actingAs($stranger, 'api')
            ->postJson("/api/tasks/{$task->id}/attachments", [
                'file' => UploadedFile::fake()->create('report.pdf', 10, 'application/pdf'),
            ])
            ->assertStatus(403);

        expect(TaskAttachment::count())->toBe(0);
    });
});

describe('download', function () {
    it('returns the file under its original name', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);
        $this->actingAs($user, 'api')->postJson("/api/tasks/{$task->id}/attachments", [
            'file' => UploadedFile::fake()->create('report.pdf', 10, 'application/pdf'),
        ]);
        $attachment = TaskAttachment::sole();

        $this->actingAs(User::factory()->create(), 'api')
            ->get("/api/attachments/{$attachment->id}/download")
            ->assertOk()
            ->assertDownload('report.pdf');
    });

    it('returns 401 without a token', function () {
        $attachment = TaskAttachment::factory()->create();

        $this->getJson("/api/attachments/{$attachment->id}/download")->assertStatus(401);
    });
});

describe('destroy', function () {
    it('deletes the record and the stored file', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);
        $this->actingAs($user, 'api')->postJson("/api/tasks/{$task->id}/attachments", [
            'file' => UploadedFile::fake()->create('report.pdf', 10, 'application/pdf'),
        ]);
        $attachment = TaskAttachment::sole();

        $this->actingAs($user, 'api')
            ->deleteJson("/api/attachments/{$attachment->id}")
            ->assertNoContent();

        $this->assertModelMissing($attachment);
        Storage::disk('local')->assertMissing($attachment->file_path);
    });

    it('forbids a user who cannot update the task', function () {
        $attachment = TaskAttachment::factory()->create();

        $this->actingAs(User::factory()->create(), 'api')
            ->deleteJson("/api/attachments/{$attachment->id}")
            ->assertStatus(403);

        $this->assertModelExists($attachment);
    });

    it('removes the thumbnail along with the attachment', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);
        $this->actingAs($user, 'api')->postJson("/api/tasks/{$task->id}/attachments", [
            'file' => UploadedFile::fake()->image('photo.jpg', 800, 600),
        ]);
        $attachment = TaskAttachment::sole();
        Storage::disk('local')->assertExists([$attachment->file_path, $attachment->thumbnail_path]);

        $this->actingAs($user, 'api')
            ->deleteJson("/api/attachments/{$attachment->id}")
            ->assertNoContent();

        Storage::disk('local')->assertMissing([$attachment->file_path, $attachment->thumbnail_path]);
    });

    it('removes attachment files and thumbnails when the task is deleted', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);
        $this->actingAs($user, 'api')->postJson("/api/tasks/{$task->id}/attachments", [
            'file' => UploadedFile::fake()->image('photo.jpg', 800, 600),
        ]);
        $attachment = TaskAttachment::sole();
        Storage::disk('local')->assertExists([$attachment->file_path, $attachment->thumbnail_path]);

        $this->actingAs($user, 'api')
            ->deleteJson("/api/tasks/{$task->id}")
            ->assertNoContent();

        Storage::disk('local')->assertMissing([$attachment->file_path, $attachment->thumbnail_path]);
    });
});

describe('virus scanning', function () {
    it('queues a virus scan before any thumbnail and reports the upload as pending', function () {
        Queue::fake();
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);

        $this->actingAs($user, 'api')->postJson("/api/tasks/{$task->id}/attachments", [
            'file' => UploadedFile::fake()->image('photo.png', 640, 480),
        ])->assertCreated()->assertJsonPath('data.scan_status', 'pending');

        Queue::assertPushed(
            ScanAttachmentForViruses::class,
            fn (ScanAttachmentForViruses $job) => $job->attachment->is(TaskAttachment::sole()),
        );
        Queue::assertNotPushed(GenerateAttachmentThumbnail::class);
    });

    it('returns 409 when downloading a file that is still being scanned', function () {
        $attachment = TaskAttachment::factory()->pending()->create();

        $this->actingAs(User::factory()->create(), 'api')
            ->getJson("/api/attachments/{$attachment->id}/download")
            ->assertStatus(409)
            ->assertJsonPath('message', 'This file is still being scanned for viruses.');
    });

    it('returns 410 when downloading a file that failed the scan', function () {
        $attachment = TaskAttachment::factory()->infected()->create();

        $this->actingAs(User::factory()->create(), 'api')
            ->getJson("/api/attachments/{$attachment->id}/download")
            ->assertStatus(410)
            ->assertJsonPath('message', 'This file was removed because it failed the virus scan.');
    });

    it('quarantines an uploaded file containing the EICAR test signature', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);

        $this->actingAs($user, 'api')->postJson("/api/tasks/{$task->id}/attachments", [
            'file' => UploadedFile::fake()->createWithContent('eicar.txt', EicarVirusScanner::signature()),
        ])->assertCreated();

        $attachment = TaskAttachment::sole();
        expect($attachment->scan_status)->toBe(ScanStatus::Infected);
        Storage::disk('local')->assertMissing($attachment->file_path);
    });
});

describe('thumbnails', function () {
    it('serves the generated thumbnail', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);
        $this->actingAs($user, 'api')->postJson("/api/tasks/{$task->id}/attachments", [
            'file' => UploadedFile::fake()->image('photo.jpg', 800, 600),
        ]);
        $attachment = TaskAttachment::sole();

        $this->actingAs($user, 'api')
            ->getJson("/api/tasks/{$task->id}")
            ->assertJsonPath('data.attachments.0.thumbnail_url', route('attachments.thumbnail', $attachment));

        $this->actingAs($user, 'api')
            ->get("/api/attachments/{$attachment->id}/thumbnail")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/webp');
    });

    it('returns 404 when the attachment has no thumbnail', function () {
        $attachment = TaskAttachment::factory()->create(['thumbnail_path' => null]);

        $this->actingAs(User::factory()->create(), 'api')
            ->getJson("/api/attachments/{$attachment->id}/thumbnail")
            ->assertNotFound();
    });
});
