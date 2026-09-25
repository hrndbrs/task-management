<?php

namespace Database\Factories;

use App\Models\ChunkedUpload;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChunkedUpload>
 */
class ChunkedUploadFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'task_id' => Task::factory(),
            'user_id' => User::factory(),
            'file_name' => fake()->word().'.txt',
            'file_size' => 3000,
            'chunk_size' => 1024,
            'total_chunks' => 3,
        ];
    }
}
