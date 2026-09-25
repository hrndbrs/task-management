<?php

use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

function queriesFor(Closure $request): int
{
    Cache::flush();
    DB::flushQueryLog();
    DB::enableQueryLog();
    $request();
    DB::disableQueryLog();

    return count(DB::getQueryLog());
}

it('guards against lazy loading outside production', function () {
    expect(Model::preventsLazyLoading())->toBeTrue();
});

it('lists tasks with the same number of queries however many there are', function () {
    $user = User::factory()->create();
    $this->actingAs($user, 'api');
    Task::factory()->count(2)->create();

    $few = queriesFor(fn () => $this->getJson('/api/tasks')->assertOk());

    Task::factory()->count(12)->create(['assigned_user_id' => User::factory()]);

    expect(queriesFor(fn () => $this->getJson('/api/tasks')->assertOk()))->toBe($few);
});

it('lists comments with the same number of queries however many there are', function () {
    $user = User::factory()->create();
    $this->actingAs($user, 'api');
    $task = Task::factory()->create();
    TaskComment::factory()->count(2)->for($task)->create();

    $few = queriesFor(fn () => $this->getJson("/api/tasks/{$task->id}/comments")->assertOk());

    TaskComment::factory()->count(10)->for($task)->create();

    expect(queriesFor(fn () => $this->getJson("/api/tasks/{$task->id}/comments")->assertOk()))->toBe($few);
});

it('indexes the columns the task list and comments are sorted and filtered by', function (string $table, array $columns) {
    $indexes = collect(Schema::getIndexes($table))->pluck('columns');

    expect($indexes)->toContain($columns);
})->with([
    'default sort' => ['tasks', ['created_at']],
    'status filter' => ['tasks', ['status', 'created_at']],
    'assignee filter' => ['tasks', ['assigned_user_id', 'created_at']],
    'comment thread' => ['task_comments', ['task_id', 'created_at']],
]);
