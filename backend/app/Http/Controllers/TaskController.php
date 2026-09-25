<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListTasksRequest;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\User;
use App\Notifications\TaskAssigned;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class TaskController extends Controller
{
    public function index(ListTasksRequest $request): AnonymousResourceCollection
    {
        $tasks = Task::query()
            ->with(['assignedUser', 'creator'])
            ->filtered($request->validated())
            ->paginate($request->integer('per_page', 15));

        return TaskResource::collection($tasks);
    }

    public function store(StoreTaskRequest $request): JsonResponse
    {
        $task = Task::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);

        $this->notifyAssignee($task, $request->user());

        return TaskResource::make($task->load(['assignedUser', 'creator']))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Task $task): TaskResource
    {
        Gate::authorize('view', $task);

        return TaskResource::make($task->load([
            'assignedUser',
            'creator',
            'attachments' => fn ($query) => $query->latestVersions()->oldest('uploaded_at'),
        ]));
    }

    public function update(UpdateTaskRequest $request, Task $task): TaskResource
    {
        $task->update($request->validated());

        if ($task->wasChanged('assigned_user_id')) {
            $this->notifyAssignee($task, $request->user());
        }

        return TaskResource::make($task->load(['assignedUser', 'creator']));
    }

    public function destroy(Task $task): Response
    {
        Gate::authorize('delete', $task);

        // Attachment and upload rows cascade in the DB, but their files must be removed explicitly.
        $paths = $task->attachments->flatMap->storedPaths()->all();
        $chunkDirectories = $task->chunkedUploads->map->chunkDirectory()->all();

        $task->delete();

        $disk = Storage::disk(config('attachments.disk'));
        $disk->delete($paths);
        foreach ($chunkDirectories as $directory) {
            $disk->deleteDirectory($directory);
        }

        return response()->noContent();
    }

    private function notifyAssignee(Task $task, User $assignedBy): void
    {
        if ($task->assigned_user_id === null || $task->assigned_user_id === $assignedBy->id) {
            return;
        }

        $task->assignedUser->notify(new TaskAssigned($task, $assignedBy));
    }
}
