<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChunkedUploadResource extends JsonResource
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
            'task_id' => $this->task_id,
            'file_name' => $this->file_name,
            'file_size' => $this->file_size,
            'chunk_size' => $this->chunk_size,
            'total_chunks' => $this->total_chunks,
            'received_chunks' => $this->receivedChunks(),
            'expires_at' => $this->created_at->addHours(config('attachments.chunked.expire_after_hours')),
        ];
    }
}
