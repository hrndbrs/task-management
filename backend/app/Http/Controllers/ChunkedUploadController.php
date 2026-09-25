<?php

namespace App\Http\Controllers;

use App\Actions\CompleteChunkedUpload;
use App\Http\Requests\StoreChunkedUploadRequest;
use App\Http\Requests\StoreUploadChunkRequest;
use App\Http\Resources\ChunkedUploadResource;
use App\Http\Resources\TaskAttachmentResource;
use App\Models\ChunkedUpload;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;

class ChunkedUploadController extends Controller
{
    public function store(StoreChunkedUploadRequest $request, Task $task): JsonResponse
    {
        $fileSize = $request->integer('file_size');
        $chunkSize = config('attachments.chunked.chunk_size') * 1024;

        $upload = $task->chunkedUploads()->create([
            'user_id' => $request->user()->id,
            'file_name' => $request->string('file_name')->toString(),
            'file_size' => $fileSize,
            'chunk_size' => $chunkSize,
            'total_chunks' => (int) ceil($fileSize / $chunkSize),
        ]);

        return ChunkedUploadResource::make($upload)
            ->response()
            ->setStatusCode(201);
    }

    public function show(ChunkedUpload $upload): ChunkedUploadResource
    {
        Gate::authorize('view', $upload);

        return ChunkedUploadResource::make($upload);
    }

    public function storeChunk(StoreUploadChunkRequest $request, ChunkedUpload $upload, int $index): ChunkedUploadResource
    {
        $request->file('chunk')->storeAs($upload->chunkDirectory(), (string) $index, config('attachments.disk'));

        return ChunkedUploadResource::make($upload);
    }

    public function complete(ChunkedUpload $upload, CompleteChunkedUpload $complete): JsonResponse
    {
        Gate::authorize('update', $upload);

        $lock = Cache::lock("chunked-upload:{$upload->id}", 600);

        abort_unless($lock->get(), 409, 'This upload is already being completed.');

        try {
            $attachment = $complete->handle($upload);
        } finally {
            $lock->release();
        }

        return TaskAttachmentResource::make($attachment)
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(ChunkedUpload $upload): Response
    {
        Gate::authorize('delete', $upload);

        $upload->discard();

        return response()->noContent();
    }
}
