<?php

use App\Jobs\GenerateAttachmentThumbnail;
use App\Models\TaskAttachment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');
});

function imageAttachment(int $width, int $height): TaskAttachment
{
    $path = UploadedFile::fake()->image('photo.jpg', $width, $height)->store('attachments/1', 'local');

    return TaskAttachment::factory()->create(['file_path' => $path, 'mime_type' => 'image/jpeg']);
}

it('stores a webp thumbnail scaled within the max dimension', function () {
    $attachment = imageAttachment(1200, 800);

    (new GenerateAttachmentThumbnail($attachment))->handle();

    $attachment->refresh();
    expect($attachment->thumbnail_path)->toEndWith('.webp');
    Storage::disk('local')->assertExists($attachment->thumbnail_path);

    $info = getimagesizefromstring(Storage::disk('local')->get($attachment->thumbnail_path));
    expect([$info[0], $info[1], $info['mime']])->toBe([300, 200, 'image/webp']);
});

it('does not upscale images smaller than the max dimension', function () {
    $attachment = imageAttachment(120, 80);

    (new GenerateAttachmentThumbnail($attachment))->handle();

    $info = getimagesizefromstring(Storage::disk('local')->get($attachment->refresh()->thumbnail_path));
    expect([$info[0], $info[1]])->toBe([120, 80]);
});
