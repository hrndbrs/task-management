<?php

namespace App\Http\Resources;

use App\Enums\ExportStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExportResource extends JsonResource
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
            'format' => $this->format,
            'status' => $this->status,
            'filters' => $this->filters,
            'row_count' => $this->row_count,
            'download_url' => $this->status === ExportStatus::Completed ? route('exports.download', $this) : null,
            'created_at' => $this->created_at,
            'completed_at' => $this->completed_at,
        ];
    }
}
