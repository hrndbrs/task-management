<?php

use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('tasks', fn (User $user) => $user->can('viewAny', Task::class), ['guards' => ['api']]);
