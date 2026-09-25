<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns a token and the user on valid credentials', function () {
    $user = User::factory()->create(['email' => 'jane@example.com', 'password' => 'secret123']);

    $response = $this->postJson('/api/auth/login', [
        'email' => 'jane@example.com',
        'password' => 'secret123',
    ]);

    $response->assertOk()
        ->assertJsonStructure(['access_token', 'token_type', 'expires_in', 'user' => ['id', 'email']])
        ->assertJsonPath('user.id', $user->id)
        ->assertJsonMissingPath('user.password');
});

it('returns 401 for incorrect password', function () {
    User::factory()->create(['email' => 'jane@example.com', 'password' => 'secret123']);

    $response = $this->postJson('/api/auth/login', [
        'email' => 'jane@example.com',
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(401);
});

it('returns 422 when email and password are missing', function () {
    $response = $this->postJson('/api/auth/login', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['email', 'password']);
});

it('returns the authenticated user from me', function () {
    $user = User::factory()->create();
    $token = auth('api')->login($user);

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/auth/me');

    $response->assertOk()
        ->assertJsonPath('id', $user->id)
        ->assertJsonPath('email', $user->email);
});

it('returns 401 from me without a token', function () {
    $response = $this->getJson('/api/auth/me');

    $response->assertStatus(401);
});

it('invalidates the token on logout', function () {
    $user = User::factory()->create();
    $token = auth('api')->login($user);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/auth/logout')
        ->assertOk();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/auth/me')
        ->assertStatus(401);
});
