<?php

namespace Database\Factories;

use App\Enums\ScanStatus;
use App\Models\Task;
use App\Models\TaskAttachment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaskAttachment>
 */
class TaskAttachmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $fileName = fake()->word().'.'.fake()->randomElement(['pdf', 'png', 'jpg', 'docx']);

        return [
            'task_id' => Task::factory(),
            'file_name' => $fileName,
            'file_path' => 'attachments/'.fake()->uuid().'/'.$fileName,
            'file_size' => fake()->numberBetween(1_024, 20 * 1_024 * 1_024),
            'mime_type' => fake()->randomElement(['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
            'scan_status' => ScanStatus::Clean,
            'scanned_at' => now(),
        ];
    }

    /**
     * Indicate that the attachment has not been scanned yet.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'scan_status' => ScanStatus::Pending,
            'scanned_at' => null,
        ]);
    }

    /**
     * Indicate that the attachment failed the virus scan.
     */
    public function infected(): static
    {
        return $this->state(fn (array $attributes) => [
            'scan_status' => ScanStatus::Infected,
        ]);
    }
}
