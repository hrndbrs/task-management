<?php

namespace App\Http\Controllers;

use App\Actions\StoreAttachment;
use App\Enums\ScanStatus;
use App\Enums\StreamStatus;
use App\Http\Requests\StoreTaskAttachmentRequest;
use App\Http\Resources\TaskAttachmentResource;
use App\Models\Task;
use App\Models\TaskAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TaskAttachmentController extends Controller
{
    public function store(StoreTaskAttachmentRequest $request, Task $task, StoreAttachment $storeAttachment): JsonResponse
    {
        $file = $request->file('file');

        $attachment = $storeAttachment->handle($task, [
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $file->store("attachments/{$task->id}", config('attachments.disk')),
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ]);

        return TaskAttachmentResource::make($attachment)
            ->response()
            ->setStatusCode(201);
    }

    public function download(TaskAttachment $attachment): StreamedResponse
    {
        Gate::authorize('view', $attachment->task);

        abort_if($attachment->scan_status === ScanStatus::Pending, 409, 'This file is still being scanned for viruses.');
        abort_if($attachment->scan_status === ScanStatus::Infected, 410, 'This file was removed because it failed the virus scan.');

        return Storage::disk(config('attachments.disk'))
            ->download($attachment->file_path, $attachment->file_name);
    }

    public function thumbnail(TaskAttachment $attachment): StreamedResponse
    {
        Gate::authorize('view', $attachment->task);

        abort_if($attachment->thumbnail_path === null, 404);

        return Storage::disk(config('attachments.disk'))->response($attachment->thumbnail_path);
    }

    public function stream(TaskAttachment $attachment, string $path): StreamedResponse
    {
        Gate::authorize('view', $attachment->task);

        abort_unless($attachment->stream_status === StreamStatus::Ready, 404);

        $disk = Storage::disk(config('attachments.disk'));
        $file = "{$attachment->stream_path}/{$path}";

        abort_unless($disk->exists($file), 404);

        return $disk->response($file, null, [
            'Content-Type' => str_ends_with($path, '.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * Delete the file together with every one of its versions.
     */
    public function destroy(TaskAttachment $attachment): Response
    {
        Gate::authorize('update', $attachment->task);

        $versions = $attachment->versions()->get();

        $attachment->versions()->delete();
        $disk = Storage::disk(config('attachments.disk'));
        $disk->delete($versions->flatMap->storedPaths()->unique()->values()->all());
        foreach ($versions->flatMap->storedDirectories()->unique() as $directory) {
            $disk->deleteDirectory($directory);
        }

        return response()->noContent();
    }
}
