<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('serves the user list from the cache', function () {
    $user = User::factory()->create(['name' => 'Ada']);
    $this->actingAs($user, 'api')->getJson('/api/users')->assertJsonPath('data.0.name', 'Ada');

    DB::table('users')->where('id', $user->id)->update(['name' => 'Changed']);

    $this->getJson('/api/users')->assertJsonPath('data.0.name', 'Ada');
});

it('drops the cached user list when a user is added, changed or removed', function () {
    $user = User::factory()->create(['name' => 'Ada']);
    $this->actingAs($user, 'api')->getJson('/api/users')->assertJsonCount(1, 'data');

    $other = User::factory()->create(['name' => 'Bob']);
    $this->getJson('/api/users')->assertJsonCount(2, 'data');

    $other->update(['name' => 'Alan']);
    $this->getJson('/api/users')->assertJsonPath('data.*.name', ['Ada', 'Alan']);

    $other->delete();
    $this->getJson('/api/users')->assertJsonCount(1, 'data');
});
