<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns 401 without a token', function () {
    $this->getJson('/api/users')->assertStatus(401);
});

it('lists every user ordered by name without sensitive fields', function () {
    $user = User::factory()->create(['name' => 'Charlie']);
    User::factory()->create(['name' => 'Alice']);
    User::factory()->admin()->create(['name' => 'Bob']);

    $response = $this->actingAs($user, 'api')->getJson('/api/users');

    $response->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.*.name', ['Alice', 'Bob', 'Charlie'])
        ->assertJsonPath('data.1.role', 'admin')
        ->assertJsonMissingPath('data.0.password')
        ->assertJsonMissingPath('data.0.remember_token');
});
