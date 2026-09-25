<?php

namespace App\Models;

use App\Events\TaskCommentDeleted;
use App\Events\TaskCommentPosted;
use Database\Factories\TaskCommentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['task_id', 'user_id', 'comment'])]
class TaskComment extends Model
{
    /** @use HasFactory<TaskCommentFactory> */
    use HasFactory;

    const UPDATED_AT = null;

    protected static function booted(): void
    {
        static::created(fn (TaskComment $comment) => TaskCommentPosted::dispatch($comment));
        static::deleted(fn (TaskComment $comment) => TaskCommentDeleted::dispatch($comment->task_id, $comment->id));
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
