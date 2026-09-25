<?php

use App\Services\VideoRenditions;

const LADDER = [360 => 800, 720 => 2800, 1080 => 5000];

it('offers every rung up to the source resolution', function () {
    expect(VideoRenditions::for(1080, LADDER))->toBe([
        ['height' => 360, 'bitrate' => 800],
        ['height' => 720, 'bitrate' => 2800],
        ['height' => 1080, 'bitrate' => 5000],
    ]);
});

it('never upscales past the source resolution', function () {
    expect(VideoRenditions::for(720, LADDER))->toBe([
        ['height' => 360, 'bitrate' => 800],
        ['height' => 720, 'bitrate' => 2800],
    ]);
});

it('keeps the source resolution when it falls between rungs', function () {
    expect(VideoRenditions::for(480, LADDER))->toBe([
        ['height' => 360, 'bitrate' => 800],
        ['height' => 480, 'bitrate' => 2800],
    ]);
});

it('caps very large videos at the top rung', function () {
    expect(VideoRenditions::for(2160, LADDER))->toBe([
        ['height' => 360, 'bitrate' => 800],
        ['height' => 720, 'bitrate' => 2800],
        ['height' => 1080, 'bitrate' => 5000],
    ]);
});

it('streams a small video at its own resolution only', function () {
    expect(VideoRenditions::for(240, LADDER))->toBe([
        ['height' => 240, 'bitrate' => 800],
    ]);
});

it('rounds an odd source height down to an even one for the encoder', function () {
    expect(VideoRenditions::for(301, LADDER))->toBe([
        ['height' => 300, 'bitrate' => 800],
    ]);
});

it('orders the ladder by height whatever order it is configured in', function () {
    expect(VideoRenditions::for(720, [720 => 2800, 360 => 800]))->toBe([
        ['height' => 360, 'bitrate' => 800],
        ['height' => 720, 'bitrate' => 2800],
    ]);
});
