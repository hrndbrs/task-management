<?php

use App\Enums\TaskStatus;
use App\Events\TasksChanged;
use App\Jobs\UpdateTaskStatuses;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

it('updates the statuses and broadcasts one change for the whole chunk', function () {
    $ids = Task::factory()->count(3)->create(['status' => TaskStatus::Pending])->modelKeys();
    Event::fake([TasksChanged::class]);

    (new UpdateTaskStatuses($ids, TaskStatus::Completed))->handle();

    expect(Task::whereKey($ids)->pluck('status')->unique()->all())->toBe([TaskStatus::Completed]);
    Event::assertDispatchedTimes(TasksChanged::class, 1);
    Event::assertDispatched(TasksChanged::class, fn (TasksChanged $event) => $event->taskIds === $ids && $event->action === 'updated');
});
