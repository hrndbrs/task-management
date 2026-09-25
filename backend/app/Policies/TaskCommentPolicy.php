<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\TaskComment;
use App\Models\User;

class TaskCommentPolicy
{
    public function delete(User $user, TaskComment $comment): bool
    {
        return $user->role === UserRole::Admin || $user->id === $comment->user_id;
    }
}
