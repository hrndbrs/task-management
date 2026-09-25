<?php

use App\Events\TaskCommentDeleted;
use App\Events\TaskCommentPosted;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    Event::fake([TaskCommentPosted::class, TaskCommentDeleted::class]);
});

describe('index', function () {
    it('returns 401 without a token', function () {
        $task = Task::factory()->create();

        $this->getJson("/api/tasks/{$task->id}/comments")->assertStatus(401);
    });

    it('lists a task\'s comments oldest first with their authors', function () {
        $task = Task::factory()->create();
        $author = User::factory()->create(['name' => 'Ada']);
        $first = TaskComment::factory()->for($task)->for($author)->create(['created_at' => now()->subHour()]);
        $second = TaskComment::factory()->for($task)->create(['created_at' => now()]);
        TaskComment::factory()->create();

        $this->actingAs(User::factory()->create(), 'api')
            ->getJson("/api/tasks/{$task->id}/comments")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $first->id)
            ->assertJsonPath('data.0.comment', $first->comment)
            ->assertJsonPath('data.0.user.name', 'Ada')
            ->assertJsonPath('data.1.id', $second->id);
    });

    it('returns 404 for a missing task', function () {
        $this->actingAs(User::factory()->create(), 'api')
            ->getJson('/api/tasks/999/comments')
            ->assertNotFound();
    });
});

describe('store', function () {
    it('lets any signed-in user comment on a task', function () {
        $task = Task::factory()->create();
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'api')
            ->postJson("/api/tasks/{$task->id}/comments", ['comment' => "  Looks good to me  \n"]);

        $response->assertCreated()
            ->assertJsonPath('data.comment', 'Looks good to me')
            ->assertJsonPath('data.task_id', $task->id)
            ->assertJsonPath('data.user.id', $user->id);
        $this->assertDatabaseHas('task_comments', [
            'task_id' => $task->id,
            'user_id' => $user->id,
            'comment' => 'Looks good to me',
        ]);
    });

    it('broadcasts the new comment', function () {
        $task = Task::factory()->create();

        $id = $this->actingAs(User::factory()->create(), 'api')
            ->postJson("/api/tasks/{$task->id}/comments", ['comment' => 'Hi'])
            ->json('data.id');

        Event::assertDispatched(TaskCommentPosted::class, fn (TaskCommentPosted $event) => $event->comment->id === $id);
    });

    it('rejects a missing, blank or oversized comment', function (mixed $comment) {
        $task = Task::factory()->create();

        $this->actingAs(User::factory()->create(), 'api')
            ->postJson("/api/tasks/{$task->id}/comments", ['comment' => $comment])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('comment');

        Event::assertNotDispatched(TaskCommentPosted::class);
    })->with([
        'missing' => [null],
        'blank' => ['   '],
        'too long' => [str_repeat('a', 5001)],
        'not a string' => [['a']],
    ]);
});

describe('destroy', function () {
    it('lets the author delete their comment', function () {
        $comment = TaskComment::factory()->create();

        $this->actingAs($comment->user, 'api')
            ->deleteJson("/api/comments/{$comment->id}")
            ->assertNoContent();

        $this->assertModelMissing($comment);
        Event::assertDispatched(
            TaskCommentDeleted::class,
            fn (TaskCommentDeleted $event) => $event->taskId === $comment->task_id && $event->commentId === $comment->id,
        );
    });

    it('lets an admin delete any comment', function () {
        $comment = TaskComment::factory()->create();

        $this->actingAs(User::factory()->admin()->create(), 'api')
            ->deleteJson("/api/comments/{$comment->id}")
            ->assertNoContent();

        $this->assertModelMissing($comment);
    });

    it('forbids other members from deleting a comment', function () {
        $comment = TaskComment::factory()->create();

        $this->actingAs(User::factory()->create(), 'api')
            ->deleteJson("/api/comments/{$comment->id}")
            ->assertForbidden();

        $this->assertModelExists($comment);
        Event::assertNotDispatched(TaskCommentDeleted::class);
    });
});
