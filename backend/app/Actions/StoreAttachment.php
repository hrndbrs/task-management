<?php

namespace App\Actions;

use App\Jobs\ScanAttachmentForViruses;
use App\Models\Task;
use App\Models\TaskAttachment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StoreAttachment
{
    /**
     * Store a newly uploaded file, as a new version of $versionGroup when given, and queue its virus scan.
     *
     * @param  array{file_name: string, file_path: string, file_size: int, mime_type: string}  $file
     */
    public function handle(Task $task, array $file, ?string $versionGroup = null): TaskAttachment
    {
        $attachment = $this->createVersion($task, $file, $versionGroup);

        ScanAttachmentForViruses::dispatch($attachment);

        return $attachment;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createVersion(Task $task, array $attributes, ?string $versionGroup): TaskAttachment
    {
        return DB::transaction(function () use ($task, $attributes, $versionGroup) {
            $latestVersion = $versionGroup === null
                ? 0
                : (int) TaskAttachment::where('version_group', $versionGroup)->lockForUpdate()->max('version');

            return $task->attachments()->create([
                ...$attributes,
                'file_name' => Str::limit($attributes['file_name'], 255, ''),
                'version_group' => $versionGroup ?? (string) Str::uuid(),
                'version' => $latestVersion + 1,
            ]);
        });
    }
}
