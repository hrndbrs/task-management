<?php

namespace App\Jobs;

use App\Contracts\VirusScanner;
use App\Enums\ScanStatus;
use App\Enums\StreamStatus;
use App\Models\TaskAttachment;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ScanAttachmentForViruses implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [5, 30];

    public bool $deleteWhenMissingModels = true;

    /**
     * Create a new job instance.
     */
    public function __construct(public TaskAttachment $attachment) {}

    /**
     * Execute the job.
     */
    public function handle(VirusScanner $scanner): void
    {
        $disk = Storage::disk(config('attachments.disk'));
        $stream = $disk->readStream($this->attachment->file_path);

        try {
            $infected = $scanner->isInfected($stream);
        } finally {
            fclose($stream);
        }

        if ($infected) {
            $disk->delete($this->attachment->storedPaths());
            $this->attachment->update(['scan_status' => ScanStatus::Infected, 'scanned_at' => now()]);

            Log::warning('Infected attachment quarantined', [
                'attachment_id' => $this->attachment->id,
                'task_id' => $this->attachment->task_id,
            ]);

            return;
        }

        $this->attachment->update(['scan_status' => ScanStatus::Clean, 'scanned_at' => now()]);

        if ($this->attachment->isImage()) {
            GenerateAttachmentThumbnail::dispatch($this->attachment);
        } elseif ($this->attachment->isVideo()) {
            $this->attachment->update(['stream_status' => StreamStatus::Pending]);
            ProcessVideoAttachment::dispatch($this->attachment);
        }
    }
}
