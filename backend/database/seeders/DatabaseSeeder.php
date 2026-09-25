<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::factory()->admin()->create([
            'name' => 'Test Admin',
            'email' => 'admin@example.com',
        ]);

        $users = User::factory()
            ->count(6)
            ->create()
            ->push($admin);

        $tasks = Task::factory()
            ->count(20)
            ->recycle($users)
            ->create();

        TaskComment::factory()
            ->count(35)
            ->recycle($tasks)
            ->recycle($users)
            ->create();

        TaskAttachment::factory()
            ->count(10)
            ->recycle($tasks)
            ->create();

        User::forgetCachedLists();
    }
}
