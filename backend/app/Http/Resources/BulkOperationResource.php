<?php

namespace App\Http\Resources;

use Illuminate\Bus\Batch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Batch
 */
class BulkOperationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'status' => match (true) {
                $this->cancelled() => 'cancelled',
                $this->finished() => 'finished',
                default => 'processing',
            },
            'task_count' => $this->options['task_count'],
            'progress' => $this->progress(),
            'total_jobs' => $this->totalJobs,
            'processed_jobs' => $this->processedJobs(),
            'failed_jobs' => $this->failedJobs,
            'created_at' => $this->createdAt,
            'finished_at' => $this->finishedAt,
        ];
    }
}
