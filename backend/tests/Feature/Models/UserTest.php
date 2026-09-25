<?php

use App\Models\ChunkedUpload;
use App\Models\Export;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('refuses to delete a user who created tasks, so task history is kept', function () {
    $creator = User::factory()->create();
    $task = Task::factory()->for($creator, 'creator')->create();

    expect(fn () => $creator->delete())->toThrow(QueryException::class);

    $this->assertModelExists($creator);
    $this->assertModelExists($task);
});

it('unassigns tasks when their assignee is deleted', function () {
    $assignee = User::factory()->create();
    $task = Task::factory()->for($assignee, 'assignedUser')->create();

    $assignee->delete();

    expect($task->fresh()->assigned_user_id)->toBeNull();
});

it('deletes the user\'s comments, unfinished uploads and exports', function () {
    $user = User::factory()->create();
    $comment = TaskComment::factory()->for($user)->create();
    $upload = ChunkedUpload::factory()->for($user)->create();
    $export = Export::factory()->for($user)->create();

    $user->delete();

    $this->assertModelMissing($comment);
    $this->assertModelMissing($upload);
    $this->assertModelMissing($export);
});
