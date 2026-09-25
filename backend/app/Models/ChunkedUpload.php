<?php

namespace App\Models;

use Database\Factories\ChunkedUploadFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable(['task_id', 'user_id', 'version_group', 'file_name', 'file_size', 'chunk_size', 'total_chunks'])]
class ChunkedUpload extends Model
{
    /** @use HasFactory<ChunkedUploadFactory> */
    use HasFactory, HasUuids, Prunable;

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'chunk_size' => 'integer',
            'total_chunks' => 'integer',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function chunkDirectory(): string
    {
        return "chunks/{$this->id}";
    }

    public function chunkPath(int $index): string
    {
        return "{$this->chunkDirectory()}/{$index}";
    }

    public function expectedChunkSize(int $index): int
    {
        return $index === $this->total_chunks - 1
            ? $this->file_size - $this->chunk_size * ($this->total_chunks - 1)
            : $this->chunk_size;
    }

    /**
     * @return list<int>
     */
    public function receivedChunks(): array
    {
        $indexes = array_map(
            fn (string $path) => (int) basename($path),
            Storage::disk(config('attachments.disk'))->files($this->chunkDirectory()),
        );

        sort($indexes);

        return $indexes;
    }

    /**
     * @return list<int>
     */
    public function missingChunks(): array
    {
        return array_values(array_diff(range(0, $this->total_chunks - 1), $this->receivedChunks()));
    }

    public function discard(): void
    {
        Storage::disk(config('attachments.disk'))->deleteDirectory($this->chunkDirectory());

        $this->delete();
    }

    public function prunable(): Builder
    {
        return static::where('created_at', '<=', now()->subHours(config('attachments.chunked.expire_after_hours')));
    }

    protected function pruning(): void
    {
        Storage::disk(config('attachments.disk'))->deleteDirectory($this->chunkDirectory());
    }
}
