<?php

use App\Events\TasksChanged;
use App\Models\Task;
use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    Event::fake([TasksChanged::class]);
});

it('broadcasts when a task is created', function () {
    $user = User::factory()->create();

    $id = $this->actingAs($user, 'api')
        ->postJson('/api/tasks', ['title' => 'New task'])
        ->assertCreated()
        ->json('data.id');

    Event::assertDispatched(TasksChanged::class, fn (TasksChanged $event) => $event->taskIds === [$id] && $event->action === 'created');
});

it('broadcasts when a task is updated', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create(['created_by' => $user->id]);

    $this->actingAs($user, 'api')->putJson("/api/tasks/{$task->id}", ['title' => 'Renamed'])->assertOk();

    Event::assertDispatched(TasksChanged::class, fn (TasksChanged $event) => $event->taskIds === [$task->id] && $event->action === 'updated');
});

it('does not broadcast an update that changes nothing', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create(['created_by' => $user->id, 'title' => 'Same']);

    $this->actingAs($user, 'api')->putJson("/api/tasks/{$task->id}", ['title' => 'Same'])->assertOk();

    Event::assertNotDispatched(TasksChanged::class, fn (TasksChanged $event) => $event->action === 'updated');
});

it('broadcasts when a task is deleted', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create(['created_by' => $user->id]);

    $this->actingAs($user, 'api')->deleteJson("/api/tasks/{$task->id}")->assertNoContent();

    Event::assertDispatched(TasksChanged::class, fn (TasksChanged $event) => $event->taskIds === [$task->id] && $event->action === 'deleted');
});

test('the event is broadcast as tasks.changed on the private tasks channel', function () {
    $event = new TasksChanged([1, 2], 'updated');

    expect($event->broadcastOn())->toEqual([new PrivateChannel('tasks')])
        ->and($event->broadcastAs())->toBe('tasks.changed');
});
