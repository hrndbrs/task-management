<?php

use App\Enums\StreamStatus;
use App\Jobs\ProcessVideoAttachment;
use App\Models\TaskAttachment;
use App\Services\VideoTranscoder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Process\Exceptions\ProcessFailedException;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    if (! Process::run(['ffmpeg', '-version'])->successful()) {
        $this->markTestSkipped('ffmpeg is not installed.');
    }

    Storage::fake('local');
});

function videoAttachment(string $size, bool $withAudio = true): TaskAttachment
{
    $path = Storage::disk('local')->path('attachments/1/clip.mp4');
    @mkdir(dirname($path), 0777, true);

    Process::run([
        'ffmpeg', '-v', 'error', '-y',
        '-f', 'lavfi', '-i', "testsrc=size={$size}:rate=25",
        ...($withAudio ? ['-f', 'lavfi', '-i', 'sine=frequency=440'] : []),
        '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        ...($withAudio ? ['-c:a', 'aac', '-shortest'] : []),
        $path,
    ])->throw();

    return TaskAttachment::factory()->video()->create([
        'file_path' => 'attachments/1/clip.mp4',
        'stream_status' => StreamStatus::Pending,
    ]);
}

function runVideoJob(TaskAttachment $attachment): TaskAttachment
{
    (new ProcessVideoAttachment($attachment))->handle(app(VideoTranscoder::class));

    return $attachment->refresh();
}

it('builds an adaptive HLS stream with one quality level per rung up to the source', function () {
    $attachment = runVideoJob(videoAttachment('1280x720'));

    expect($attachment->stream_status)->toBe(StreamStatus::Ready)
        ->and($attachment->stream_path)->toBe($attachment->streamDirectory())
        ->and($attachment->duration)->toEqualWithDelta(2.0, 0.1);

    $master = Storage::disk('local')->get("{$attachment->stream_path}/master.m3u8");
    expect($master)->toContain('RESOLUTION=640x360')
        ->toContain('RESOLUTION=1280x720')
        ->toContain('stream_0/index.m3u8')
        ->toContain('stream_1/index.m3u8')
        ->toContain('mp4a.40.2');
    Storage::disk('local')->assertExists("{$attachment->stream_path}/stream_0/seg_000.ts");
    Storage::disk('local')->assertExists("{$attachment->stream_path}/stream_1/seg_000.ts");
});

it('stores a webp poster frame as the thumbnail', function () {
    $attachment = runVideoJob(videoAttachment('1280x720'));

    expect($attachment->thumbnail_path)->toBe('attachments/1/thumbnails/clip.webp');
    $info = getimagesizefromstring(Storage::disk('local')->get($attachment->thumbnail_path));
    expect([$info[0], $info[1], $info['mime']])->toBe([300, 169, 'image/webp']);
});

it('streams a video without an audio track', function () {
    $attachment = runVideoJob(videoAttachment('640x360', withAudio: false));

    $master = Storage::disk('local')->get("{$attachment->stream_path}/master.m3u8");
    expect($attachment->stream_status)->toBe(StreamStatus::Ready)
        ->and($master)->toContain('RESOLUTION=640x360')
        ->not->toContain('mp4a');
});

it('replaces the stream when the job runs again', function () {
    $attachment = videoAttachment('640x360');
    Storage::disk('local')->put("{$attachment->streamDirectory()}/stream_9/stale.ts", 'old');

    runVideoJob($attachment);

    Storage::disk('local')->assertMissing("{$attachment->streamDirectory()}/stream_9/stale.ts");
    Storage::disk('local')->assertExists("{$attachment->streamDirectory()}/master.m3u8");
});

it('fails on a file that is not a video, and marks the stream failed once retries run out', function () {
    Storage::disk('local')->put('attachments/1/fake.mp4', 'not a video');
    $attachment = TaskAttachment::factory()->video()->create([
        'file_path' => 'attachments/1/fake.mp4',
        'stream_status' => StreamStatus::Pending,
    ]);
    $job = new ProcessVideoAttachment($attachment);

    expect(fn () => $job->handle(app(VideoTranscoder::class)))->toThrow(ProcessFailedException::class);
    $job->failed(null);

    expect($attachment->refresh()->stream_status)->toBe(StreamStatus::Failed);
    Storage::disk('local')->assertMissing($attachment->streamDirectory());
});
