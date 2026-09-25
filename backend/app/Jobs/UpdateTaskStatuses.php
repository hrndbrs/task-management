<?php

namespace App\Jobs;

use App\Enums\TaskStatus;
use App\Events\TasksChanged;
use App\Models\Task;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class UpdateTaskStatuses implements ShouldQueue
{
    use Batchable, Queueable;

    public const CHUNK_SIZE = 100;

    public int $tries = 3;

    /**
     * @param  list<int>  $taskIds
     */
    public function __construct(public array $taskIds, public TaskStatus $status) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        Task::whereKey($this->taskIds)->update(['status' => $this->status]);

        TasksChanged::dispatch($this->taskIds, 'updated');
    }
}
