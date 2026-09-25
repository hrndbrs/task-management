<?php

use App\Events\TaskCommentDeleted;
use App\Events\TaskCommentPosted;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a posted comment is broadcast with its author on the task channel', function () {
    $comment = TaskComment::factory()->for(User::factory()->create(['name' => 'Ada']))->create();
    $event = new TaskCommentPosted($comment->fresh());

    expect($event->broadcastOn())->toEqual([new PrivateChannel("tasks.{$comment->task_id}")])
        ->and($event->broadcastAs())->toBe('comment.posted')
        ->and($event->broadcastWith()['comment'])->toMatchArray([
            'id' => $comment->id,
            'task_id' => $comment->task_id,
            'comment' => $comment->comment,
        ])
        ->and($event->broadcastWith()['comment']['user']->resolve())->toMatchArray(['name' => 'Ada']);
});

test('a deleted comment is broadcast by id on the task channel', function () {
    $event = new TaskCommentDeleted(7, 42);

    expect($event->broadcastOn())->toEqual([new PrivateChannel('tasks.7')])
        ->and($event->broadcastAs())->toBe('comment.deleted')
        ->and($event->broadcastWith())->toBe(['id' => 42]);
});
