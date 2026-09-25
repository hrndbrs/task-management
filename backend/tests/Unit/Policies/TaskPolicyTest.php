<?php

use App\Enums\UserRole;
use App\Models\Task;
use App\Models\User;
use App\Policies\TaskPolicy;

const TASK_CREATOR_ID = 1;
const TASK_ASSIGNEE_ID = 2;
const OTHER_MEMBER_ID = 3;
const ADMIN_ID = 4;

function taskPolicyUser(int $id): User
{
    $role = $id === ADMIN_ID ? UserRole::Admin : UserRole::Member;

    return (new User(['role' => $role]))->forceFill(['id' => $id]);
}

function taskPolicyTask(): Task
{
    return new Task(['created_by' => TASK_CREATOR_ID, 'assigned_user_id' => TASK_ASSIGNEE_ID]);
}

test('any user can view and create tasks', function (int $userId) {
    $policy = new TaskPolicy;
    $user = taskPolicyUser($userId);

    expect($policy->viewAny($user))->toBeTrue()
        ->and($policy->view($user, taskPolicyTask()))->toBeTrue()
        ->and($policy->create($user))->toBeTrue();
})->with([
    'creator' => [TASK_CREATOR_ID],
    'assignee' => [TASK_ASSIGNEE_ID],
    'unrelated member' => [OTHER_MEMBER_ID],
    'admin' => [ADMIN_ID],
]);

test('a task can be updated by its creator, its assignee and admins only', function (int $userId, bool $allowed) {
    expect((new TaskPolicy)->update(taskPolicyUser($userId), taskPolicyTask()))->toBe($allowed);
})->with([
    'creator' => [TASK_CREATOR_ID, true],
    'assignee' => [TASK_ASSIGNEE_ID, true],
    'admin' => [ADMIN_ID, true],
    'unrelated member' => [OTHER_MEMBER_ID, false],
]);

test('a task can be deleted by its creator and admins only', function (int $userId, bool $allowed) {
    expect((new TaskPolicy)->delete(taskPolicyUser($userId), taskPolicyTask()))->toBe($allowed);
})->with([
    'creator' => [TASK_CREATOR_ID, true],
    'admin' => [ADMIN_ID, true],
    'assignee' => [TASK_ASSIGNEE_ID, false],
    'unrelated member' => [OTHER_MEMBER_ID, false],
]);

test('an unassigned task can only be updated by its creator and admins', function (int $userId, bool $allowed) {
    $task = new Task(['created_by' => TASK_CREATOR_ID, 'assigned_user_id' => null]);

    expect((new TaskPolicy)->update(taskPolicyUser($userId), $task))->toBe($allowed);
})->with([
    'creator' => [TASK_CREATOR_ID, true],
    'admin' => [ADMIN_ID, true],
    'unrelated member' => [OTHER_MEMBER_ID, false],
]);
