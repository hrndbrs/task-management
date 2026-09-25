<?php

use App\Enums\TaskStatus;
use App\Jobs\UpdateTaskStatuses;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function renameTaskBehindTheCache(Task $task, string $title): void
{
    DB::table('tasks')->where('id', $task->id)->update(['title' => $title]);
}

it('serves a repeated list request from the cache', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create(['title' => 'Original']);
    $this->actingAs($user, 'api')->getJson('/api/tasks')->assertJsonPath('data.0.title', 'Original');

    renameTaskBehindTheCache($task, 'Changed');
    DB::enableQueryLog();

    $this->getJson('/api/tasks')->assertOk()->assertJsonPath('data.0.title', 'Original');
    expect(collect(DB::getQueryLog())->pluck('query')->filter(fn ($sql) => str_contains($sql, 'from `tasks`')))->toBeEmpty();
});

it('keeps the same response shape when served from the cache', function () {
    $user = User::factory()->create();
    Task::factory()->count(3)->create(['created_by' => $user->id]);

    $fresh = $this->actingAs($user, 'api')->getJson('/api/tasks?per_page=2')->json();
    $cached = $this->getJson('/api/tasks?per_page=2')->json();

    expect($cached)->toBe($fresh)
        ->and($cached)->toHaveKeys(['data', 'links', 'meta'])
        ->and($cached['meta']['total'])->toBe(3);
});

it('caches each page and filter combination separately', function () {
    $user = User::factory()->create();
    Task::factory()->count(3)->create(['status' => TaskStatus::Pending]);
    Task::factory()->create(['status' => TaskStatus::Completed]);
    $this->actingAs($user, 'api')->getJson('/api/tasks?per_page=2')->assertJsonCount(2, 'data');

    $this->getJson('/api/tasks?per_page=2&page=2')->assertJsonCount(2, 'data');
    $this->getJson('/api/tasks?status=completed')->assertJsonCount(1, 'data');
});

it('ignores query parameters that are not filters', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create(['title' => 'Original']);
    $this->actingAs($user, 'api')->getJson('/api/tasks')->assertOk();

    renameTaskBehindTheCache($task, 'Changed');

    $this->getJson('/api/tasks?utm_source=mail')->assertJsonPath('data.0.title', 'Original');
});

it('caches per user, so permissions are never shared', function () {
    $creator = User::factory()->create();
    $other = User::factory()->create();
    Task::factory()->create(['created_by' => $creator->id]);

    $this->actingAs($creator, 'api')->getJson('/api/tasks')->assertJsonPath('data.0.can.update', true);
    $this->actingAs($other, 'api')->getJson('/api/tasks')->assertJsonPath('data.0.can.update', false);
});

it('drops cached lists when a task is created, updated or deleted', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create(['title' => 'Original', 'created_by' => $user->id]);
    $this->actingAs($user, 'api')->getJson('/api/tasks')->assertJsonCount(1, 'data');

    $this->putJson("/api/tasks/{$task->id}", ['title' => 'Renamed'])->assertOk();
    $this->getJson('/api/tasks')->assertJsonPath('data.0.title', 'Renamed');

    $this->postJson('/api/tasks', ['title' => 'Another'])->assertCreated();
    $this->getJson('/api/tasks')->assertJsonCount(2, 'data');

    $this->deleteJson("/api/tasks/{$task->id}")->assertNoContent();
    $this->getJson('/api/tasks')->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'Another');
});

it('drops cached lists after a bulk status update', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create(['status' => TaskStatus::Pending]);
    $this->actingAs($user, 'api')->getJson('/api/tasks')->assertJsonPath('data.0.status', 'pending');

    (new UpdateTaskStatuses([$task->id], TaskStatus::Completed))->handle();

    $this->getJson('/api/tasks')->assertJsonPath('data.0.status', 'completed');
});

it('drops cached lists when a user changes, since tasks show user names', function () {
    $user = User::factory()->create();
    $assignee = User::factory()->create(['name' => 'Before']);
    Task::factory()->create(['assigned_user_id' => $assignee->id]);
    $this->actingAs($user, 'api')->getJson('/api/tasks')->assertJsonPath('data.0.assigned_user.name', 'Before');

    $assignee->update(['name' => 'After']);

    $this->getJson('/api/tasks')->assertJsonPath('data.0.assigned_user.name', 'After');
});
