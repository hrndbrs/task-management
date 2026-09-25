<?php

namespace App\Models;

use App\Enums\ScanStatus;
use Database\Factories\TaskAttachmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['task_id', 'file_name', 'file_path', 'thumbnail_path', 'file_size', 'mime_type', 'scan_status', 'scanned_at', 'uploaded_at'])]
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
