<?php

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function actingAsToken(User $user): string
{
    return auth('api')->login($user);
}

describe('index', function () {
    it('returns 401 without a token', function () {
        $this->getJson('/api/tasks')->assertStatus(401);
    });

    it('paginates tasks', function () {
        $user = User::factory()->create();
        $token = actingAsToken($user);
        Task::factory()->count(20)->create(['created_by' => $user->id]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/tasks?per_page=5');

        $response->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta.per_page', 5)
            ->assertJsonPath('meta.total', 20);
    });

    it('filters tasks by status', function () {
        $user = User::factory()->create();
        $token = actingAsToken($user);
        Task::factory()->count(3)->create(['status' => TaskStatus::Completed, 'created_by' => $user->id]);
        Task::factory()->count(2)->create(['status' => TaskStatus::Pending, 'created_by' => $user->id]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/tasks?status=completed');

        $response->assertOk()->assertJsonCount(3, 'data');
    });

    it('sorts tasks by the given column and direction', function () {
        $user = User::factory()->create();
        $token = actingAsToken($user);
        $low = Task::factory()->create(['title' => 'A task', 'priority' => TaskPriority::Low, 'created_by' => $user->id]);
        $high = Task::factory()->create(['title' => 'B task', 'priority' => TaskPriority::Urgent, 'created_by' => $user->id]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/tasks?sort=title&direction=desc');

        $response->assertOk();
        expect($response->json('data.0.id'))->toBe($high->id);
    });

    it('rejects an unsupported sort column', function () {
        $user = User::factory()->create();
        $token = actingAsToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/tasks?sort=password')
            ->assertStatus(422);
    });
});

describe('store', function () {
    it('creates a task owned by the requester', function () {
        $user = User::factory()->create();
        $token = actingAsToken($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/tasks', [
            'title' => 'Ship the feature',
            'description' => 'Details here',
            'priority' => 'high',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.title', 'Ship the feature')
            ->assertJsonPath('data.priority', 'high')
            ->assertJsonPath('data.creator.id', $user->id);

        $this->assertDatabaseHas('tasks', [
            'title' => 'Ship the feature',
            'created_by' => $user->id,
        ]);
    });

    it('returns 422 when title is missing', function () {
        $user = User::factory()->create();
        $token = actingAsToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/tasks', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    });

    it('reports the default status and priority when they are omitted', function () {
        $token = actingAsToken(User::factory()->create());

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/tasks', ['title' => 'Defaults'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.priority', 'medium');
    });

    it('returns 422 when status or priority is explicitly null', function () {
        $token = actingAsToken(User::factory()->create());

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/tasks', ['title' => 'Nulls', 'status' => null, 'priority' => null])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status', 'priority']);
    });
});

describe('update', function () {
    it('allows the creator to update the task', function () {
        $user = User::factory()->create();
        $token = actingAsToken($user);
        $task = Task::factory()->create(['created_by' => $user->id, 'title' => 'Old title']);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/tasks/{$task->id}", ['title' => 'New title']);

        $response->assertOk()->assertJsonPath('data.title', 'New title');
    });

    it('allows an admin to update any task', function () {
        $admin = User::factory()->admin()->create();
        $token = actingAsToken($admin);
        $task = Task::factory()->create();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/tasks/{$task->id}", ['title' => 'Updated by admin'])
            ->assertOk();
    });

    it('forbids an unrelated member from updating the task', function () {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $token = actingAsToken($stranger);
        $task = Task::factory()->create(['created_by' => $owner->id]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/tasks/{$task->id}", ['title' => 'Hijacked'])
            ->assertStatus(403);
    });
});

describe('destroy', function () {
    it('allows the creator to delete the task', function () {
        $user = User::factory()->create();
        $token = actingAsToken($user);
        $task = Task::factory()->create(['created_by' => $user->id]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/tasks/{$task->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    });

    it('forbids the assignee from deleting the task', function () {
        $owner = User::factory()->create();
        $assignee = User::factory()->create();
        $token = actingAsToken($assignee);
        $task = Task::factory()->create(['created_by' => $owner->id, 'assigned_user_id' => $assignee->id]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/tasks/{$task->id}")
            ->assertStatus(403);
    });
});
