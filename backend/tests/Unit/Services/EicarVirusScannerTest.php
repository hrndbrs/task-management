<?php

use App\Services\EicarVirusScanner;

function streamOf(string $content)
{
    $stream = fopen('php://memory', 'r+');
    fwrite($stream, $content);
    rewind($stream);

    return $stream;
}

it('flags content that is the EICAR test file', function () {
    expect((new EicarVirusScanner)->isInfected(streamOf(EicarVirusScanner::signature())))->toBeTrue();
});

it('flags the signature embedded in a larger file', function () {
    $content = str_repeat('a', 5000).EicarVirusScanner::signature().str_repeat('b', 5000);

    expect((new EicarVirusScanner)->isInfected(streamOf($content)))->toBeTrue();
});

it('flags a signature that spans two read blocks', function () {
    $content = str_repeat('a', 90).EicarVirusScanner::signature();

    expect((new EicarVirusScanner(blockSize: 100))->isInfected(streamOf($content)))->toBeTrue();
});

it('does not flag clean content', function () {
    expect((new EicarVirusScanner(blockSize: 100))->isInfected(streamOf(str_repeat('clean data ', 1000))))->toBeFalse();
});
