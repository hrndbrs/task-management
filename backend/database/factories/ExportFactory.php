<?php

namespace Database\Factories;

use App\Enums\ExportFormat;
use App\Enums\ExportStatus;
use App\Models\Export;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Export>
 */
class ExportFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'format' => ExportFormat::Csv,
            'filters' => [],
            'status' => ExportStatus::Pending,
        ];
    }

    /**
     * Indicate that the export file has been generated.
     */
    public function completed(string $filePath = 'exports/test.csv'): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ExportStatus::Completed,
            'file_path' => $filePath,
            'row_count' => 0,
            'completed_at' => now(),
        ]);
    }
}
