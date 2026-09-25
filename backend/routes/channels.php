<?php

use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

$member = fn (User $user) => ['id' => $user->id, 'name' => $user->name];

Broadcast::channel('online', $member, ['guards' => ['api']]);

Broadcast::channel('tasks', fn (User $user) => $user->can('viewAny', Task::class), ['guards' => ['api']]);

Broadcast::channel('tasks.{task}', fn (User $user, Task $task) => $user->can('view', $task), ['guards' => ['api']]);

Broadcast::channel(
    'tasks.{task}.viewers',
    fn (User $user, Task $task) => $user->can('view', $task) ? $member($user) : false,
    ['guards' => ['api']],
);
