<?php

namespace App\Models;

use Database\Factories\TaskAttachmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['task_id', 'file_name', 'file_path', 'thumbnail_path', 'file_size', 'mime_type', 'uploaded_at'])]
class TaskAttachment extends Model
{
    /** @use HasFactory<TaskAttachmentFactory> */
    use HasFactory;

    const CREATED_AT = 'uploaded_at';

    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
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
