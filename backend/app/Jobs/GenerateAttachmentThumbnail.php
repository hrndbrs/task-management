<?php

namespace App\Jobs;

use App\Models\TaskAttachment;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;

class GenerateAttachmentThumbnail implements ShouldQueue
{
    use Queueable;

    public const MAX_DIMENSION = 300;

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
    public function handle(): void
    {
        $disk = Storage::disk(config('attachments.disk'));
        $source = $this->attachment->file_path;

        $thumbnail = ImageManager::gd()
            ->read($disk->get($source))
            ->scaleDown(self::MAX_DIMENSION, self::MAX_DIMENSION)
            ->toWebp(quality: 80);

        $thumbnailPath = dirname($source).'/thumbnails/'.pathinfo($source, PATHINFO_FILENAME).'.webp';

        $disk->put($thumbnailPath, (string) $thumbnail);

        $this->attachment->update(['thumbnail_path' => $thumbnailPath]);
    }
}
