<?php

namespace App\Models;

use App\Enums\ScanStatus;
use Database\Factories\TaskAttachmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['task_id', 'version_group', 'version', 'file_name', 'file_path', 'thumbnail_path', 'file_size', 'mime_type', 'scan_status', 'scanned_at', 'uploaded_at'])]
class TaskAttachment extends Model
{
    /** @use HasFactory<TaskAttachmentFactory> */
    use HasFactory;

    const CREATED_AT = 'uploaded_at';

    const UPDATED_AT = null;

    // Mirrors the DB default so a freshly created attachment reports "pending" in the upload response.
    protected $attributes = [
        'scan_status' => ScanStatus::Pending->value,
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'file_size' => 'integer',
            'scan_status' => ScanStatus::class,
            'scanned_at' => 'datetime',
            'uploaded_at' => 'datetime',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Every version of this file, including this one.
     */
    public function versions(): HasMany
    {
        return $this->hasMany(self::class, 'version_group', 'version_group');
    }

    #[Scope]
    protected function latestVersions(Builder $query): void
    {
        $query->whereNotExists(fn ($newer) => $newer
            ->from('task_attachments as newer')
            ->whereColumn('newer.version_group', 'task_attachments.version_group')
            ->whereColumn('newer.version', '>', 'task_attachments.version'));
    }

    public function isImage(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }

    /**
     * @return list<string>
     */
    public function storedPaths(): array
    {
        return array_values(array_filter([$this->file_path, $this->thumbnail_path]));
    }
}
