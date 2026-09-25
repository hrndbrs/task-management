<?php

namespace App\Models;

use App\Enums\ExportFormat;
use App\Enums\ExportStatus;
use Database\Factories\ExportFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable(['user_id', 'format', 'filters', 'status', 'file_path', 'row_count', 'completed_at'])]
class Export extends Model
{
    /** @use HasFactory<ExportFactory> */
    use HasFactory, Prunable;

    // Mirrors the DB default so a freshly created export reports "pending" in the response.
    protected $attributes = [
        'status' => ExportStatus::Pending->value,
    ];

    protected function casts(): array
    {
        return [
            'format' => ExportFormat::class,
            'filters' => 'array',
            'status' => ExportStatus::class,
            'row_count' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function downloadName(): string
    {
        return "tasks-export-{$this->created_at->format('Y-m-d-His')}.{$this->format->value}";
    }

    public function prunable(): Builder
    {
        return static::where('created_at', '<=', now()->subDays(config('exports.keep_for_days')));
    }

    protected function pruning(): void
    {
        if ($this->file_path !== null) {
            Storage::disk(config('exports.disk'))->delete($this->file_path);
        }
    }
}
