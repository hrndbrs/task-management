<?php

use App\Enums\ScanStatus;
use App\Jobs\GenerateAttachmentThumbnail;
use App\Jobs\ScanAttachmentForViruses;
use App\Models\TaskAttachment;
use App\Services\EicarVirusScanner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');
    Queue::fake();
});

function scannedAttachment(string $content, string $mimeType): TaskAttachment
{
    Storage::disk('local')->put('attachments/1/file', $content);

    $attachment = TaskAttachment::factory()->pending()->create([
        'file_path' => 'attachments/1/file',
        'mime_type' => $mimeType,
    ]);

    (new ScanAttachmentForViruses($attachment))->handle(new EicarVirusScanner);

    return $attachment->refresh();
}

it('marks a clean file as clean and keeps it', function () {
    $attachment = scannedAttachment('quarterly report', 'text/plain');

    expect($attachment->scan_status)->toBe(ScanStatus::Clean)
        ->and($attachment->scanned_at)->not->toBeNull();
    Storage::disk('local')->assertExists('attachments/1/file');
    Queue::assertNotPushed(GenerateAttachmentThumbnail::class);
});

it('queues a thumbnail once a clean image is confirmed', function () {
    $image = UploadedFile::fake()->image('photo.png', 40, 40);
    $attachment = scannedAttachment(file_get_contents($image->getPathname()), 'image/png');

    Queue::assertPushed(
        GenerateAttachmentThumbnail::class,
        fn (GenerateAttachmentThumbnail $job) => $job->attachment->is($attachment),
    );
});

it('quarantines an infected file and does not generate a thumbnail', function () {
    $attachment = scannedAttachment('prefix '.EicarVirusScanner::signature(), 'image/png');

    expect($attachment->scan_status)->toBe(ScanStatus::Infected)
        ->and($attachment->scanned_at)->not->toBeNull();
    Storage::disk('local')->assertMissing('attachments/1/file');
    Queue::assertNotPushed(GenerateAttachmentThumbnail::class);
});
