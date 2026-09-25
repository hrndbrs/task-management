<?php

namespace App\Http\Controllers;

use App\Actions\StoreAttachment;
use App\Enums\ScanStatus;
use App\Enums\StreamStatus;
use App\Http\Requests\StoreAttachmentVersionRequest;
use App\Http\Resources\TaskAttachmentResource;
use App\Jobs\GenerateAttachmentThumbnail;
use App\Jobs\ProcessVideoAttachment;
use App\Models\TaskAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class AttachmentVersionController extends Controller
{
    public function index(TaskAttachment $attachment): AnonymousResourceCollection
    {
        Gate::authorize('view', $attachment->task);

        return TaskAttachmentResource::collection(
            $attachment->versions()->orderByDesc('version')->get(),
        );
    }

    public function store(StoreAttachmentVersionRequest $request, TaskAttachment $attachment, StoreAttachment $storeAttachment): JsonResponse
    {
        $file = $request->file('file');

        $version = $storeAttachment->handle($attachment->task, [
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $file->store("attachments/{$attachment->task_id}", config('attachments.disk')),
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ], $attachment->version_group);

        return TaskAttachmentResource::make($version)
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Make an older version current again by adding it back as the newest version.
     */
    public function restore(TaskAttachment $attachment, StoreAttachment $storeAttachment): JsonResponse
    {
        Gate::authorize('update', $attachment->task);

        abort_unless($attachment->scan_status === ScanStatus::Clean, 409, 'Only a version that passed the virus scan can be restored.');

        // The stored file is shared rather than copied: versions are only ever deleted together.
        $version = $storeAttachment->createVersion($attachment->task, $attachment->only([
            'file_name', 'file_path', 'thumbnail_path', 'file_size', 'mime_type', 'scan_status', 'scanned_at',
            'stream_status', 'stream_path', 'duration',
        ]), $attachment->version_group);

        if ($version->isImage() && $version->thumbnail_path === null) {
            GenerateAttachmentThumbnail::dispatch($version);
        } elseif ($version->isVideo() && $version->stream_status !== StreamStatus::Ready) {
            $version->update(['stream_status' => StreamStatus::Pending]);
            ProcessVideoAttachment::dispatch($version);
        }

        return TaskAttachmentResource::make($version)
            ->response()
            ->setStatusCode(201);
    }
}
