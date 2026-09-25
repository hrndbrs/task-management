<?php

use App\Enums\UserRole;
use App\Models\TaskComment;
use App\Models\User;
use App\Policies\TaskCommentPolicy;

test('a comment can be deleted by its author and admins only', function (UserRole $role, int $userId, bool $allowed) {
    $user = (new User(['role' => $role]))->forceFill(['id' => $userId]);
    $comment = new TaskComment(['user_id' => 1]);

    expect((new TaskCommentPolicy)->delete($user, $comment))->toBe($allowed);
})->with([
    'author' => [UserRole::Member, 1, true],
    'admin' => [UserRole::Admin, 2, true],
    'another member' => [UserRole::Member, 2, false],
]);
