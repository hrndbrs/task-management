<?php

namespace App\Http\Resources;

use App\Enums\StreamStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskAttachmentResource extends JsonResource
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
            'version' => $this->version,
            'file_name' => $this->file_name,
            'file_size' => $this->file_size,
            'mime_type' => $this->mime_type,
            'scan_status' => $this->scan_status,
            'scanned_at' => $this->scanned_at,
            'uploaded_at' => $this->uploaded_at,
            'download_url' => route('attachments.download', $this),
            'versions_url' => route('attachments.versions.index', $this),
            'thumbnail_url' => $this->thumbnail_path ? route('attachments.thumbnail', $this) : null,
            'stream_status' => $this->stream_status,
            'stream_url' => $this->stream_status === StreamStatus::Ready ? route('attachments.stream', [$this->resource, 'master.m3u8']) : null,
            'duration' => $this->duration,
        ];
    }
}
