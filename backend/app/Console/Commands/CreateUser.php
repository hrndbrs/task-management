<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\password;
use function Laravel\Prompts\select;
use function Laravel\Prompts\text;

#[Signature('user:create {--name= : Full name} {--email= : Sign-in email} {--role= : admin or member}')]
#[Description('Create a user who can sign in')]
class CreateUser extends Command
{
    public function handle(): int
    {
        $rules = $this->rules();

        $data = [
            'name' => $this->option('name') ?? text('Name', required: true, validate: ['name' => $rules['name']]),
            'email' => $this->option('email') ?? text('Email', required: true, validate: ['email' => $rules['email']]),
            'role' => $this->option('role') ?? select('Role', ['member' => 'Member', 'admin' => 'Admin'], default: 'member'),
        ];

        $data['password'] = password('Password', required: true, validate: ['password' => $rules['password']], hint: 'At least 8 characters');
        password('Confirm password', required: true, validate: fn (string $value) => $value === $data['password'] ? null : 'The passwords do not match.');

        $validator = Validator::make($data, $rules);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->components->error($error);
            }

            return self::FAILURE;
        }

        $user = User::create($validator->validated());

        $this->components->info("Created {$user->role->value} {$user->email}. They can sign in now.");

        return self::SUCCESS;
    }

    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'role' => ['required', Rule::enum(UserRole::class)],
            'password' => ['required', 'string', Password::min(8)],
        ];
    }
}
