<?php

namespace App\Http\Controllers;

use App\Enums\TaskStatus;
use App\Http\Requests\BulkUpdateTaskStatusRequest;
use App\Http\Resources\BulkOperationResource;
use App\Jobs\UpdateTaskStatuses;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;

class BulkTaskStatusController extends Controller
{
    public function store(BulkUpdateTaskStatusRequest $request): JsonResponse
    {
        $taskIds = $request->taskIds();
        $status = $request->enum('status', TaskStatus::class);

        $forbidden = Task::whereKey($taskIds)->get()
            ->reject(fn (Task $task) => $request->user()->can('update', $task))
            ->modelKeys();

        abort_if($forbidden, 403, 'You are not allowed to update these tasks: '.implode(', ', $forbidden).'.');

        $jobs = collect($taskIds)
            ->chunk(UpdateTaskStatuses::CHUNK_SIZE)
            ->map(fn ($chunk) => new UpdateTaskStatuses($chunk->values()->all(), $status));

        $batch = Bus::batch($jobs->all())
            ->name('Set '.count($taskIds)." tasks to {$status->value}")
            ->withOption('user_id', $request->user()->id)
            ->withOption('task_count', count($taskIds))
            ->dispatch();

        return BulkOperationResource::make($batch)
            ->response()
            ->setStatusCode(202);
    }

    public function show(Request $request, string $batchId): BulkOperationResource
    {
        $batch = Bus::findBatch($batchId);

        // 404 rather than 403 so other users' batch ids reveal nothing.
        abort_if($batch === null || ($batch->options['user_id'] ?? null) !== $request->user()->id, 404);

        return BulkOperationResource::make($batch);
    }
}
