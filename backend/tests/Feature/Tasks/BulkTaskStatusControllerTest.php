<?php

use App\Enums\TaskStatus;
use App\Jobs\UpdateTaskStatuses;
use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\PendingBatch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;

uses(RefreshDatabase::class);

describe('start', function () {
    it('returns 401 without a token', function () {
        $this->postJson('/api/tasks/bulk-status', ['task_ids' => [1], 'status' => 'completed'])->assertStatus(401);
    });

    it('updates every task and reports the finished batch', function () {
        $user = User::factory()->create();
        $tasks = Task::factory()->count(3)->recycle($user)->create(['created_by' => $user->id, 'status' => TaskStatus::Pending]);

        $response = $this->actingAs($user, 'api')->postJson('/api/tasks/bulk-status', [
            'task_ids' => $tasks->modelKeys(),
            'status' => 'completed',
        ]);

        $response->assertAccepted()
            ->assertJsonPath('data.task_count', 3)
            ->assertJsonPath('data.name', 'Set 3 tasks to completed');

        $tasks->each(fn (Task $task) => expect($task->refresh()->status)->toBe(TaskStatus::Completed));

        $this->actingAs($user, 'api')
            ->getJson("/api/tasks/bulk-status/{$response->json('data.id')}")
            ->assertOk()
            ->assertJsonPath('data.status', 'finished')
            ->assertJsonPath('data.progress', 100)
            ->assertJsonPath('data.failed_jobs', 0);
    });

    it('splits large updates into queued jobs of 100 tasks', function () {
        Bus::fake();
        $admin = User::factory()->admin()->create();
        $taskIds = Task::factory()->count(250)->recycle($admin)->create()->modelKeys();

        $this->actingAs($admin, 'api')
            ->postJson('/api/tasks/bulk-status', ['task_ids' => $taskIds, 'status' => 'in_progress'])
            ->assertAccepted();

        Bus::assertBatched(fn (PendingBatch $batch) => $batch->jobs->count() === 3
            && $batch->jobs->every(fn (UpdateTaskStatuses $job) => $job->status === TaskStatus::InProgress)
            && $batch->jobs->flatMap->taskIds->all() === $taskIds);
    });

    it('lets an assignee update tasks assigned to them', function () {
        $assignee = User::factory()->create();
        $task = Task::factory()->create(['assigned_user_id' => $assignee->id]);

        $this->actingAs($assignee, 'api')
            ->postJson('/api/tasks/bulk-status', ['task_ids' => [$task->id], 'status' => 'completed'])
            ->assertAccepted();

        expect($task->refresh()->status)->toBe(TaskStatus::Completed);
    });

    it('returns 403 naming the tasks the user cannot update and changes nothing', function () {
        $user = User::factory()->create();
        $own = Task::factory()->create(['created_by' => $user->id, 'status' => TaskStatus::Pending]);
        $foreign = Task::factory()->create(['status' => TaskStatus::Pending]);

        $this->actingAs($user, 'api')
            ->postJson('/api/tasks/bulk-status', ['task_ids' => [$own->id, $foreign->id], 'status' => 'completed'])
            ->assertStatus(403)
            ->assertJsonPath('message', "You are not allowed to update these tasks: {$foreign->id}.");

        expect($own->refresh()->status)->toBe(TaskStatus::Pending);
    });

    it('returns 422 naming tasks that do not exist', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);

        $this->actingAs($user, 'api')
            ->postJson('/api/tasks/bulk-status', ['task_ids' => [$task->id, 99999], 'status' => 'completed'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['task_ids' => 'These tasks do not exist: 99999.']);
    });

    it('returns 422 for an invalid payload', function (array $payload, string $field) {
        $this->actingAs(User::factory()->create(), 'api')
            ->postJson('/api/tasks/bulk-status', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors([$field]);
    })->with([
        'missing task ids' => [['status' => 'completed'], 'task_ids'],
        'empty task ids' => [['task_ids' => [], 'status' => 'completed'], 'task_ids'],
        'duplicate task ids' => [['task_ids' => [1, 1], 'status' => 'completed'], 'task_ids.0'],
        'too many task ids' => [['task_ids' => range(1, 1001), 'status' => 'completed'], 'task_ids'],
        'unknown status' => [['task_ids' => [1], 'status' => 'archived'], 'status'],
    ]);
});

describe('status', function () {
    it('returns 404 for a batch started by another user', function () {
        $owner = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $owner->id]);
        $batchId = $this->actingAs($owner, 'api')
            ->postJson('/api/tasks/bulk-status', ['task_ids' => [$task->id], 'status' => 'completed'])
            ->json('data.id');

        $this->actingAs(User::factory()->admin()->create(), 'api')
            ->getJson("/api/tasks/bulk-status/{$batchId}")
            ->assertNotFound();
    });

    it('returns 404 for an unknown batch', function () {
        $this->actingAs(User::factory()->create(), 'api')
            ->getJson('/api/tasks/bulk-status/9f0c7a1e-3b1d-4c2a-9a7e-5f1d2c3b4a5e')
            ->assertNotFound();
    });
});
