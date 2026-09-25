<?php

use App\Enums\ScanStatus;
use App\Enums\StreamStatus;
use App\Jobs\GenerateAttachmentThumbnail;
use App\Jobs\ScanAttachmentForViruses;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\User;
use App\Services\EicarVirusScanner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Process;
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

describe('video streaming', function () {
    function streamedVideo(): TaskAttachment
    {
        $attachment = TaskAttachment::factory()->streamReady()->create();
        Storage::disk('local')->put("{$attachment->stream_path}/master.m3u8", "#EXTM3U\nstream_0/index.m3u8\n");
        Storage::disk('local')->put("{$attachment->stream_path}/stream_0/index.m3u8", "#EXTM3U\nseg_000.ts\n");
        Storage::disk('local')->put("{$attachment->stream_path}/stream_0/seg_000.ts", 'segment-bytes');

        return $attachment;
    }

    it('returns 401 without a token', function () {
        $attachment = streamedVideo();

        $this->getJson("/api/attachments/{$attachment->id}/stream/master.m3u8")->assertUnauthorized();
    });

    it('serves the master playlist, quality playlists and segments with HLS content types', function (string $path, string $type, string $body) {
        $attachment = streamedVideo();

        $response = $this->actingAs(User::factory()->create(), 'api')
            ->get("/api/attachments/{$attachment->id}/stream/{$path}");

        $response->assertOk()
            ->assertHeader('Content-Type', $type)
            ->assertHeader('Cache-Control', 'max-age=3600, private');
        expect($response->streamedContent())->toBe($body);
    })->with([
        'master playlist' => ['master.m3u8', 'application/vnd.apple.mpegurl', "#EXTM3U\nstream_0/index.m3u8\n"],
        'quality playlist' => ['stream_0/index.m3u8', 'application/vnd.apple.mpegurl', "#EXTM3U\nseg_000.ts\n"],
        'segment' => ['stream_0/seg_000.ts', 'video/mp2t', 'segment-bytes'],
    ]);

    it('returns 404 while the video is still being processed', function () {
        $attachment = TaskAttachment::factory()->video()->create(['stream_status' => 'pending']);

        $this->actingAs(User::factory()->create(), 'api')
            ->getJson("/api/attachments/{$attachment->id}/stream/master.m3u8")
            ->assertNotFound();
    });

    it('returns 404 for a segment that does not exist', function () {
        $attachment = streamedVideo();

        $this->actingAs(User::factory()->create(), 'api')
            ->getJson("/api/attachments/{$attachment->id}/stream/stream_0/seg_999.ts")
            ->assertNotFound();
    });

    it('returns 404 for any path that is not a playlist or segment', function (string $path) {
        $attachment = streamedVideo();
        Storage::disk('local')->put("{$attachment->stream_path}/secret.txt", 'secret');

        $this->actingAs(User::factory()->create(), 'api')
            ->get("/api/attachments/{$attachment->id}/stream/{$path}")
            ->assertNotFound();
    })->with([
        'other file in the stream' => ['secret.txt'],
        'escape upwards' => ['stream_0/../../secret.txt'],
        'encoded escape' => ['stream_0%2F..%2F..%2Fsecret.txt'],
    ]);

    it('exposes the stream url only once the stream is ready', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);
        $ready = TaskAttachment::factory()->streamReady()->for($task)->create();
        TaskAttachment::factory()->video()->for($task)->create(['stream_status' => 'pending']);

        $this->actingAs($user, 'api')
            ->getJson("/api/tasks/{$task->id}")
            ->assertJsonPath('data.attachments.0.stream_status', 'ready')
            ->assertJsonPath('data.attachments.0.stream_url', route('attachments.stream', [$ready, 'master.m3u8']))
            ->assertJsonPath('data.attachments.0.duration', 12.5)
            ->assertJsonPath('data.attachments.1.stream_status', 'pending')
            ->assertJsonPath('data.attachments.1.stream_url', null);
    });

    it('deletes the stream with the attachment', function () {
        $attachment = streamedVideo();
        $user = User::factory()->create();
        $attachment->task->update(['created_by' => $user->id]);

        $this->actingAs($user, 'api')
            ->deleteJson("/api/attachments/{$attachment->id}")
            ->assertNoContent();

        Storage::disk('local')->assertMissing("{$attachment->stream_path}/master.m3u8");
        Storage::disk('local')->assertMissing("{$attachment->stream_path}/stream_0/seg_000.ts");
    });

    it('deletes the stream when the task is deleted', function () {
        $attachment = streamedVideo();
        $user = User::factory()->create();
        $attachment->task->update(['created_by' => $user->id]);

        $this->actingAs($user, 'api')
            ->deleteJson("/api/tasks/{$attachment->task_id}")
            ->assertNoContent();

        Storage::disk('local')->assertMissing("{$attachment->stream_path}/master.m3u8");
    });
});

describe('video uploads', function () {
    function recordClip(string $name, array $codecs): string
    {
        $path = sys_get_temp_dir().'/'.uniqid('clip-').'-'.$name;

        Process::run([
            'ffmpeg', '-v', 'error', '-y',
            '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25',
            '-f', 'lavfi', '-i', 'sine=frequency=440',
            '-t', '2', ...$codecs, '-shortest', $path,
        ])->throw();

        return $path;
    }

    it('accepts a real video, scans it and turns it into a playable stream', function (string $name, array $codecs, string $mimeType) {
        if (! Process::run(['ffmpeg', '-version'])->successful()) {
            $this->markTestSkipped('ffmpeg is not installed.');
        }
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);
        $clip = recordClip($name, $codecs);

        $response = $this->actingAs($user, 'api')->postJson("/api/tasks/{$task->id}/attachments", [
            'file' => new UploadedFile($clip, $name, null, null, true),
        ]);

        $response->assertCreated()->assertJsonPath('data.mime_type', $mimeType);
        $attachment = TaskAttachment::findOrFail($response->json('data.id'));
        expect($attachment->scan_status)->toBe(ScanStatus::Clean)
            ->and($attachment->stream_status)->toBe(StreamStatus::Ready)
            ->and($attachment->duration)->toEqualWithDelta(2.0, 0.1);
        Storage::disk('local')->assertExists($attachment->thumbnail_path);
        expect(Storage::disk('local')->get("{$attachment->stream_path}/master.m3u8"))->toContain('RESOLUTION=640x360');

        $this->actingAs($user, 'api')
            ->get("/api/attachments/{$attachment->id}/stream/stream_0/seg_000.ts")
            ->assertOk()
            ->assertHeader('Content-Type', 'video/mp2t');

        unlink($clip);
    })->with([
        'MP4 (H.264, AAC)' => ['clip.mp4', ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac'], 'video/mp4'],
        'WebM (VP9, Opus)' => ['clip.webm', ['-c:v', 'libvpx-vp9', '-b:v', '300k', '-c:a', 'libopus'], 'video/webm'],
        'MOV (H.264, AAC)' => ['clip.mov', ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac'], 'video/quicktime'],
    ]);

    it('rejects a file named like a video whose content is not an allowed type with 422', function (string $content) {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);
        $path = tempnam(sys_get_temp_dir(), 'fake');
        file_put_contents($path, $content);

        $this->actingAs($user, 'api')
            ->postJson("/api/tasks/{$task->id}/attachments", [
                'file' => new UploadedFile($path, 'clip.mp4', null, null, true),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        expect(TaskAttachment::count())->toBe(0);
        unlink($path);
    })->with([
        'random bytes' => [random_bytes(4096)],
        'a PHP script' => ['<?php echo "not a video";'],
    ]);
});
