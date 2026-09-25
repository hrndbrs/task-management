<?php

namespace App\Actions;

use App\Jobs\GenerateAttachmentThumbnail;
use App\Models\ChunkedUpload;
use App\Models\TaskAttachment;
use Illuminate\Http\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CompleteChunkedUpload
{
    /**
     * @throws ValidationException
     */
    public function handle(ChunkedUpload $upload): TaskAttachment
    {
        if ($missing = $upload->missingChunks()) {
            throw ValidationException::withMessages([
                'chunks' => 'Missing chunks: '.implode(', ', $missing).'.',
            ]);
        }

        $disk = Storage::disk(config('attachments.disk'));
        $assembled = tmpfile();

        try {
            foreach (range(0, $upload->total_chunks - 1) as $index) {
                $chunk = $disk->readStream($upload->chunkPath($index));
                stream_copy_to_stream($chunk, $assembled);
                fclose($chunk);
            }

            fflush($assembled);
            $file = new File(stream_get_meta_data($assembled)['uri']);

            $this->validateContent($file, $upload);

            $path = "attachments/{$upload->task_id}/".Str::random(40).'.'.$file->guessExtension();
            rewind($assembled);
            $disk->writeStream($path, $assembled);

            $attachment = $upload->task->attachments()->create([
                'file_name' => Str::limit($upload->file_name, 255, ''),
                'file_path' => $path,
                'file_size' => $upload->file_size,
                'mime_type' => $file->getMimeType(),
            ]);
        } finally {
            fclose($assembled);
        }

        $upload->discard();

        if ($attachment->isImage()) {
            GenerateAttachmentThumbnail::dispatch($attachment);
        }

        return $attachment;
    }

    /**
     * The client-declared file name was checked at init; this checks what was actually sent.
     *
     * @throws ValidationException
     */
    private function validateContent(File $file, ChunkedUpload $upload): void
    {
        $validator = Validator::make(
            ['file' => $file],
            ['file' => ['mimes:'.implode(',', config('attachments.allowed_extensions'))]],
        );

        if ($validator->fails()) {
            $upload->discard();

            throw new ValidationException($validator);
        }
    }
}
