<?php

namespace App\Events;

use App\Http\Resources\TaskCommentResource;
use App\Models\TaskComment;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskCommentPosted implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, SerializesModels;

    public function __construct(public TaskComment $comment) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("tasks.{$this->comment->task_id}")];
    }

    public function broadcastAs(): string
    {
        return 'comment.posted';
    }

    public function broadcastWith(): array
    {
        return [
            'comment' => TaskCommentResource::make($this->comment->loadMissing('user'))->resolve(),
        ];
    }
}
