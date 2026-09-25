<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('creates an admin from prompts', function () {
    $this->artisan('user:create')
        ->expectsQuestion('Name', 'Ada Lovelace')
        ->expectsQuestion('Email', 'ada@example.com')
        ->expectsChoice('Role', 'admin', ['member' => 'Member', 'admin' => 'Admin'])
        ->expectsQuestion('Password', 'correct-horse')
        ->expectsQuestion('Confirm password', 'correct-horse')
        ->expectsOutputToContain('Created admin ada@example.com')
        ->assertSuccessful();

    $user = User::sole();
    expect($user->name)->toBe('Ada Lovelace')
        ->and($user->role)->toBe(UserRole::Admin)
        ->and(Hash::check('correct-horse', $user->password))->toBeTrue();
});

it('takes the name, email and role as options and only prompts for the password', function () {
    $this->artisan('user:create', ['--name' => 'Alan Turing', '--email' => 'alan@example.com', '--role' => 'member'])
        ->expectsQuestion('Password', 'correct-horse')
        ->expectsQuestion('Confirm password', 'correct-horse')
        ->assertSuccessful();

    expect(User::sole())->email->toBe('alan@example.com')->role->toBe(UserRole::Member);
});

it('lets the new user sign in', function () {
    $this->artisan('user:create', ['--name' => 'Ada', '--email' => 'ada@example.com', '--role' => 'admin'])
        ->expectsQuestion('Password', 'correct-horse')
        ->expectsQuestion('Confirm password', 'correct-horse')
        ->assertSuccessful();

    $this->postJson('/api/auth/login', ['email' => 'ada@example.com', 'password' => 'correct-horse'])
        ->assertOk()
        ->assertJsonStructure(['access_token']);
});

it('refuses an email that is already taken', function () {
    User::factory()->create(['email' => 'ada@example.com']);

    $this->artisan('user:create', ['--name' => 'Ada', '--email' => 'ada@example.com', '--role' => 'admin'])
        ->expectsQuestion('Password', 'correct-horse')
        ->expectsQuestion('Confirm password', 'correct-horse')
        ->expectsOutputToContain('The email has already been taken.')
        ->assertFailed();

    expect(User::count())->toBe(1);
});

it('refuses an unknown role', function () {
    $this->artisan('user:create', ['--name' => 'Ada', '--email' => 'ada@example.com', '--role' => 'owner'])
        ->expectsQuestion('Password', 'correct-horse')
        ->expectsQuestion('Confirm password', 'correct-horse')
        ->expectsOutputToContain('The selected role is invalid.')
        ->assertFailed();

    expect(User::count())->toBe(0);
});
