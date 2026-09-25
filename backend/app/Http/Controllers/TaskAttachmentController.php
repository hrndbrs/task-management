<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTaskAttachmentRequest;
use App\Http\Resources\TaskAttachmentResource;
use App\Jobs\GenerateAttachmentThumbnail;
use App\Models\Task;
use App\Models\TaskAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TaskAttachmentController extends Controller
{
    public function store(StoreTaskAttachmentRequest $request, Task $task): JsonResponse
    {
        $file = $request->file('file');

        $attachment = $task->attachments()->create([
            'file_name' => Str::limit($file->getClientOriginalName(), 255, ''),
            'file_path' => $file->store("attachments/{$task->id}", config('attachments.disk')),
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ]);

        if ($attachment->isImage()) {
            GenerateAttachmentThumbnail::dispatch($attachment);
        }

        return TaskAttachmentResource::make($attachment)
            ->response()
            ->setStatusCode(201);
    }

    public function download(TaskAttachment $attachment): StreamedResponse
    {
        Gate::authorize('view', $attachment->task);

        return Storage::disk(config('attachments.disk'))
            ->download($attachment->file_path, $attachment->file_name);
    }

    public function thumbnail(TaskAttachment $attachment): StreamedResponse
    {
        Gate::authorize('view', $attachment->task);

        abort_if($attachment->thumbnail_path === null, 404);

        return Storage::disk(config('attachments.disk'))->response($attachment->thumbnail_path);
    }

    public function destroy(TaskAttachment $attachment): Response
    {
        Gate::authorize('update', $attachment->task);

        $attachment->delete();
        Storage::disk(config('attachments.disk'))->delete($attachment->storedPaths());

        return response()->noContent();
    }
}
