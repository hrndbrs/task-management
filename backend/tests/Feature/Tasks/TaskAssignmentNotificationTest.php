<?php

use App\Models\Task;
use App\Models\User;
use App\Notifications\TaskAssigned;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

beforeEach(function () {
    Notification::fake();
});

it('emails the assignee when a task is created for them', function () {
    $creator = User::factory()->create();
    $assignee = User::factory()->create();

    $this->actingAs($creator, 'api')->postJson('/api/tasks', [
        'title' => 'Prepare the demo',
        'assigned_user_id' => $assignee->id,
    ])->assertCreated();

    Notification::assertSentTo(
        $assignee,
        TaskAssigned::class,
        fn (TaskAssigned $notification) => $notification->task->title === 'Prepare the demo'
            && $notification->assignedBy->is($creator),
    );
    Notification::assertCount(1);
});

it('does not email anyone when a task is created without an assignee', function () {
    $this->actingAs(User::factory()->create(), 'api')
        ->postJson('/api/tasks', ['title' => 'Unassigned'])
        ->assertCreated();

    Notification::assertNothingSent();
});

it('does not email users who assign a task to themselves', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'api')
        ->postJson('/api/tasks', ['title' => 'Mine', 'assigned_user_id' => $user->id])
        ->assertCreated();

    Notification::assertNothingSent();
});

it('emails the new assignee when a task is reassigned', function () {
    $creator = User::factory()->create();
    $previous = User::factory()->create();
    $next = User::factory()->create();
    $task = Task::factory()->create(['created_by' => $creator->id, 'assigned_user_id' => $previous->id]);

    $this->actingAs($creator, 'api')
        ->putJson("/api/tasks/{$task->id}", ['assigned_user_id' => $next->id])
        ->assertOk();

    Notification::assertSentTo($next, TaskAssigned::class);
    Notification::assertNotSentTo($previous, TaskAssigned::class);
});

it('does not email the assignee when other fields change', function () {
    $creator = User::factory()->create();
    $task = Task::factory()->create(['created_by' => $creator->id, 'assigned_user_id' => User::factory()]);

    $this->actingAs($creator, 'api')
        ->putJson("/api/tasks/{$task->id}", ['title' => 'Renamed', 'assigned_user_id' => $task->assigned_user_id])
        ->assertOk();

    Notification::assertNothingSent();
});

it('does not email anyone when a task is unassigned', function () {
    $creator = User::factory()->create();
    $task = Task::factory()->create(['created_by' => $creator->id, 'assigned_user_id' => User::factory()]);

    $this->actingAs($creator, 'api')
        ->putJson("/api/tasks/{$task->id}", ['assigned_user_id' => null])
        ->assertOk();

    Notification::assertNothingSent();
});

test('the assignment email is queued', function () {
    expect(new TaskAssigned(Task::factory()->make(), User::factory()->make()))
        ->toBeInstanceOf(ShouldQueue::class);
});

it('describes the task and links to it in the frontend', function () {
    config(['app.frontend_url' => 'https://tasks.example.com']);
    $assignee = User::factory()->create(['name' => 'Dana']);
    $task = Task::factory()->create([
        'title' => 'Prepare the demo',
        'priority' => 'urgent',
        'due_date' => '2026-10-02',
    ]);

    $mail = (new TaskAssigned($task, User::factory()->create(['name' => 'Sam'])))->toMail($assignee);

    expect($mail->subject)->toBe("You've been assigned: Prepare the demo")
        ->and($mail->greeting)->toBe('Hi Dana,')
        ->and($mail->introLines)->toContain('Sam assigned you a task.', 'Priority: Urgent', 'Due: Fri, Oct 2, 2026')
        ->and($mail->actionUrl)->toBe("https://tasks.example.com/tasks/{$task->id}");
});
