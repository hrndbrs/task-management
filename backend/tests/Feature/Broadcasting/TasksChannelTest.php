<?php

use App\Models\User;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

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
});

function authorizeChannel(string $channel)
{
    return test()->postJson('/api/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => $channel,
    ]);
}

it('returns 401 without a token', function () {
    authorizeChannel('private-tasks')->assertStatus(401);
});

it('authorizes a signed-in user for the tasks channel', function () {
    $this->actingAs(User::factory()->create(), 'api');

    authorizeChannel('private-tasks')
        ->assertOk()
        ->assertJsonPath('auth', fn (string $auth) => str_starts_with($auth, 'test-key:'));
});

it('returns 403 for a channel that is not defined', function () {
    $this->actingAs(User::factory()->create(), 'api');

    authorizeChannel('private-secrets')->assertStatus(403);
});
