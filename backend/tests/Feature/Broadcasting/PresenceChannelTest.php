<?php

use App\Events\TasksChanged;
use App\Models\Task;
use App\Models\User;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-key',
        'broadcasting.connections.reverb.secret' => 'test-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app',
    ]);
    app(BroadcastManager::class)->purge('reverb');
    require base_path('routes/channels.php');
    Event::fake([TasksChanged::class]);
});

function joinPresence(string $channel)
{
    return test()->postJson('/api/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => $channel,
    ]);
}

function presenceMember($response): array
{
    return json_decode($response->json('channel_data'), true);
}

it('returns 401 for the online channel without a token', function () {
    joinPresence('presence-online')->assertStatus(401);
});

it('joins the online channel with the user\'s id and name only', function () {
    $user = User::factory()->create(['name' => 'Ada Lovelace']);
    $this->actingAs($user, 'api');

    $response = joinPresence('presence-online')->assertOk();

    expect(presenceMember($response))->toBe([
        'user_id' => (string) $user->id,
        'user_info' => ['id' => $user->id, 'name' => 'Ada Lovelace'],
    ]);
});

it('joins a task\'s viewers channel', function () {
    $user = User::factory()->create();
    $this->actingAs($user, 'api');
    $task = Task::factory()->create();

    $response = joinPresence("presence-tasks.{$task->id}.viewers")->assertOk();

    expect(presenceMember($response)['user_info'])->toBe(['id' => $user->id, 'name' => $user->name]);
});

it('refuses the viewers channel of a task that does not exist', function () {
    $this->actingAs(User::factory()->create(), 'api');

    joinPresence('presence-tasks.999.viewers')->assertStatus(403);
});
