<?php

namespace App\Jobs;

use App\Enums\StreamStatus;
use App\Models\TaskAttachment;
use App\Services\VideoRenditions;
use App\Services\VideoTranscoder;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Throwable;

class ProcessVideoAttachment implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 840;

    public array $backoff = [30];

    public bool $deleteWhenMissingModels = true;

    public function __construct(public TaskAttachment $attachment) {}

    public function handle(VideoTranscoder $transcoder): void
    {
        $disk = Storage::disk(config('attachments.disk'));
        $workspace = storage_path('app/video-work/'.Str::uuid());
        File::ensureDirectoryExists("{$workspace}/hls");

        try {
            $source = "{$workspace}/source";
            $stream = $disk->readStream($this->attachment->file_path);
            File::put($source, $stream);
            fclose($stream);

            $video = $transcoder->probe($source);

            $transcoder->poster($source, "{$workspace}/poster.jpg", min(1.0, $video['duration'] / 2));
            $thumbnailPath = dirname($this->attachment->file_path).'/thumbnails/'.pathinfo($this->attachment->file_path, PATHINFO_FILENAME).'.webp';
            $disk->put($thumbnailPath, (string) ImageManager::gd()
                ->read("{$workspace}/poster.jpg")
                ->scaleDown(GenerateAttachmentThumbnail::MAX_DIMENSION, GenerateAttachmentThumbnail::MAX_DIMENSION)
                ->toWebp(quality: 80));

            $transcoder->hls(
                $source,
                "{$workspace}/hls",
                VideoRenditions::for($video['height'], config('attachments.video.renditions')),
                $video['has_audio'],
                $this->timeout - 30,
            );

            $streamPath = $this->attachment->streamDirectory();
            $disk->deleteDirectory($streamPath);
            foreach (File::allFiles("{$workspace}/hls") as $file) {
                $contents = fopen($file->getPathname(), 'r');
                $disk->writeStream("{$streamPath}/{$file->getRelativePathname()}", $contents);
                fclose($contents);
            }

            $this->attachment->update([
                'thumbnail_path' => $thumbnailPath,
                'stream_path' => $streamPath,
                'stream_status' => StreamStatus::Ready,
                'duration' => round($video['duration'], 3),
            ]);
        } finally {
            File::deleteDirectory($workspace);
        }
    }

    public function failed(?Throwable $exception): void
    {
        $this->attachment->update(['stream_status' => StreamStatus::Failed]);
    }
}
