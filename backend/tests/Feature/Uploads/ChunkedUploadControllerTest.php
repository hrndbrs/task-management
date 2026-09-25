<?php

use App\Jobs\GenerateAttachmentThumbnail;
use App\Models\ChunkedUpload;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

const TEXT_CONTENT_LINE = "The quick brown fox jumps over the lazy dog.\n";

beforeEach(function () {
    Storage::fake('local');
    config(['attachments.chunked.chunk_size' => 1]);
});

function startChunkedUpload(User $user, Task $task, string $fileName, int $fileSize): ChunkedUpload
{
    test()->actingAs($user, 'api')
        ->postJson("/api/tasks/{$task->id}/attachments/uploads", ['file_name' => $fileName, 'file_size' => $fileSize])
        ->assertCreated();

    return ChunkedUpload::sole();
}

function sendChunk(User $user, ChunkedUpload $upload, int $index, string $content): TestResponse
{
    return test()->actingAs($user, 'api')->post(
        "/api/uploads/{$upload->id}/chunks/{$index}",
        ['chunk' => UploadedFile::fake()->createWithContent("chunk-{$index}", $content)],
        ['Accept' => 'application/json'],
    );
}

function sendAllChunks(User $user, ChunkedUpload $upload, string $content): void
{
    foreach (str_split($content, $upload->chunk_size) as $index => $bytes) {
        sendChunk($user, $upload, $index, $bytes)->assertOk();
    }
}

describe('start', function () {
    it('returns 401 without a token', function () {
        $task = Task::factory()->create();

        $this->postJson("/api/tasks/{$task->id}/attachments/uploads", ['file_name' => 'a.txt', 'file_size' => 10])
            ->assertStatus(401);
    });

    it('creates an upload session with the chunk layout', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);

        $response = $this->actingAs($user, 'api')->postJson("/api/tasks/{$task->id}/attachments/uploads", [
            'file_name' => 'notes.txt',
            'file_size' => 2700,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.file_name', 'notes.txt')
            ->assertJsonPath('data.chunk_size', 1024)
            ->assertJsonPath('data.total_chunks', 3)
            ->assertJsonPath('data.received_chunks', []);
    });

    it('returns 422 for a disallowed file extension', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);

        $this->actingAs($user, 'api')
            ->postJson("/api/tasks/{$task->id}/attachments/uploads", ['file_name' => 'setup.exe', 'file_size' => 2700])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file_name']);
    });

    it('returns 422 when the declared size exceeds the chunked limit', function () {
        config(['attachments.chunked.max_size' => 2]);
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);

        $this->actingAs($user, 'api')
            ->postJson("/api/tasks/{$task->id}/attachments/uploads", ['file_name' => 'notes.txt', 'file_size' => 2049])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file_size' => 'The file size field must not be greater than 2048.']);
    });

    it('forbids a user who cannot update the task', function () {
        $task = Task::factory()->create();

        $this->actingAs(User::factory()->create(), 'api')
            ->postJson("/api/tasks/{$task->id}/attachments/uploads", ['file_name' => 'notes.txt', 'file_size' => 2700])
            ->assertStatus(403);
    });
});

describe('chunks', function () {
    it('stores a chunk and reports it as received', function () {
        $user = User::factory()->create();
        $upload = startChunkedUpload($user, Task::factory()->create(['created_by' => $user->id]), 'notes.txt', 2700);

        sendChunk($user, $upload, 0, str_repeat('a', 1024))
            ->assertOk()
            ->assertJsonPath('data.received_chunks', [0]);

        Storage::disk('local')->assertExists($upload->chunkPath(0));
    });

    it('accepts a re-sent chunk without duplicating it', function () {
        $user = User::factory()->create();
        $upload = startChunkedUpload($user, Task::factory()->create(['created_by' => $user->id]), 'notes.txt', 2700);

        sendChunk($user, $upload, 0, str_repeat('a', 1024))->assertOk();
        sendChunk($user, $upload, 0, str_repeat('b', 1024))
            ->assertOk()
            ->assertJsonPath('data.received_chunks', [0]);

        expect(Storage::disk('local')->get($upload->chunkPath(0)))->toBe(str_repeat('b', 1024));
    });

    it('returns 422 when a chunk is not the expected size', function () {
        $user = User::factory()->create();
        $upload = startChunkedUpload($user, Task::factory()->create(['created_by' => $user->id]), 'notes.txt', 2700);

        sendChunk($user, $upload, 0, str_repeat('a', 1000))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['chunk' => 'The chunk must be exactly 1024 bytes.']);
    });

    it('accepts a shorter final chunk', function () {
        $user = User::factory()->create();
        $upload = startChunkedUpload($user, Task::factory()->create(['created_by' => $user->id]), 'notes.txt', 2700);

        sendChunk($user, $upload, 2, str_repeat('a', 652))->assertOk();
    });

    it('returns 422 for an index outside the upload', function () {
        $user = User::factory()->create();
        $upload = startChunkedUpload($user, Task::factory()->create(['created_by' => $user->id]), 'notes.txt', 2700);

        sendChunk($user, $upload, 3, str_repeat('a', 1024))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['index']);
    });

    it('forbids another user from sending chunks', function () {
        $user = User::factory()->create();
        $upload = startChunkedUpload($user, Task::factory()->create(['created_by' => $user->id]), 'notes.txt', 2700);

        sendChunk(User::factory()->admin()->create(), $upload, 0, str_repeat('a', 1024))->assertStatus(403);
    });
});

describe('status', function () {
    it('lists the received chunks so a client can resume', function () {
        $user = User::factory()->create();
        $upload = startChunkedUpload($user, Task::factory()->create(['created_by' => $user->id]), 'notes.txt', 2700);
        sendChunk($user, $upload, 2, str_repeat('a', 652));
        sendChunk($user, $upload, 0, str_repeat('a', 1024));

        $this->actingAs($user, 'api')
            ->getJson("/api/uploads/{$upload->id}")
            ->assertOk()
            ->assertJsonPath('data.received_chunks', [0, 2]);
    });

    it('forbids another user from viewing the upload', function () {
        $upload = ChunkedUpload::factory()->create();

        $this->actingAs(User::factory()->create(), 'api')
            ->getJson("/api/uploads/{$upload->id}")
            ->assertStatus(403);
    });
});

describe('complete', function () {
    it('assembles the chunks into an attachment and removes the session', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);
        $content = str_repeat(TEXT_CONTENT_LINE, 60);
        $upload = startChunkedUpload($user, $task, 'notes.txt', strlen($content));
        sendAllChunks($user, $upload, $content);

        $response = $this->actingAs($user, 'api')->postJson("/api/uploads/{$upload->id}/complete");

        $response->assertCreated()
            ->assertJsonPath('data.task_id', $task->id)
            ->assertJsonPath('data.file_name', 'notes.txt')
            ->assertJsonPath('data.file_size', strlen($content))
            ->assertJsonPath('data.mime_type', 'text/plain');

        $attachment = TaskAttachment::sole();
        expect(Storage::disk('local')->get($attachment->file_path))->toBe($content);
        $this->assertModelMissing($upload);
        Storage::disk('local')->assertMissing($upload->chunkDirectory());
    });

    it('returns 422 listing missing chunks and keeps the session', function () {
        $user = User::factory()->create();
        $upload = startChunkedUpload($user, Task::factory()->create(['created_by' => $user->id]), 'notes.txt', 2700);
        sendChunk($user, $upload, 0, str_repeat('a', 1024));
        sendChunk($user, $upload, 2, str_repeat('a', 652));

        $this->actingAs($user, 'api')
            ->postJson("/api/uploads/{$upload->id}/complete")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['chunks' => 'Missing chunks: 1.']);

        $this->assertModelExists($upload);
        expect(TaskAttachment::count())->toBe(0);
    });

    it('rejects content whose detected type is not allowed and discards the session', function () {
        $user = User::factory()->create();
        $content = "<?php system(\$_GET['cmd']); ?>\n";
        $upload = startChunkedUpload($user, Task::factory()->create(['created_by' => $user->id]), 'notes.txt', strlen($content));
        sendAllChunks($user, $upload, $content);

        $this->actingAs($user, 'api')
            ->postJson("/api/uploads/{$upload->id}/complete")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);

        expect(TaskAttachment::count())->toBe(0);
        $this->assertModelMissing($upload);
        Storage::disk('local')->assertMissing($upload->chunkDirectory());
    });

    it('queues a thumbnail when the assembled file is an image', function () {
        Queue::fake();
        $user = User::factory()->create();
        $fakeImage = UploadedFile::fake()->image('photo.png', 40, 40);
        $image = file_get_contents($fakeImage->getPathname());
        $upload = startChunkedUpload($user, Task::factory()->create(['created_by' => $user->id]), 'photo.png', strlen($image));
        sendAllChunks($user, $upload, $image);

        $this->actingAs($user, 'api')->postJson("/api/uploads/{$upload->id}/complete")->assertCreated();

        Queue::assertPushed(GenerateAttachmentThumbnail::class);
    });

    it('returns 409 while the same upload is already being completed', function () {
        $user = User::factory()->create();
        $upload = startChunkedUpload($user, Task::factory()->create(['created_by' => $user->id]), 'notes.txt', 2700);
        Cache::lock("chunked-upload:{$upload->id}", 60)->get();

        $this->actingAs($user, 'api')
            ->postJson("/api/uploads/{$upload->id}/complete")
            ->assertStatus(409);
    });
});

describe('cancel', function () {
    it('deletes the session and its chunks', function () {
        $user = User::factory()->create();
        $upload = startChunkedUpload($user, Task::factory()->create(['created_by' => $user->id]), 'notes.txt', 2700);
        sendChunk($user, $upload, 0, str_repeat('a', 1024));

        $this->actingAs($user, 'api')
            ->deleteJson("/api/uploads/{$upload->id}")
            ->assertNoContent();

        $this->assertModelMissing($upload);
        Storage::disk('local')->assertMissing($upload->chunkDirectory());
    });

    it('removes in-progress chunks when the task is deleted', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);
        $upload = startChunkedUpload($user, $task, 'notes.txt', 2700);
        sendChunk($user, $upload, 0, str_repeat('a', 1024));

        $this->actingAs($user, 'api')->deleteJson("/api/tasks/{$task->id}")->assertNoContent();

        Storage::disk('local')->assertMissing($upload->chunkDirectory());
    });
});

describe('expiry', function () {
    it('prunes expired sessions and their chunks but keeps active ones', function () {
        $expired = ChunkedUpload::factory()->create(['created_at' => now()->subHours(25)]);
        $active = ChunkedUpload::factory()->create();
        Storage::disk('local')->put($expired->chunkPath(0), 'x');
        Storage::disk('local')->put($active->chunkPath(0), 'x');

        $this->artisan('model:prune', ['--model' => [ChunkedUpload::class]])->assertSuccessful();

        $this->assertModelMissing($expired);
        Storage::disk('local')->assertMissing($expired->chunkDirectory());
        $this->assertModelExists($active);
        Storage::disk('local')->assertExists($active->chunkPath(0));
    });
});
