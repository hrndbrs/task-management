<?php

use App\Models\ChunkedUpload;

test('every chunk but the last is the full chunk size', function (int $index) {
    $upload = new ChunkedUpload(['file_size' => 12, 'chunk_size' => 5, 'total_chunks' => 3]);

    expect($upload->expectedChunkSize($index))->toBe(5);
})->with([
    'first chunk' => [0],
    'middle chunk' => [1],
]);

test('the last chunk holds the remaining bytes', function () {
    $upload = new ChunkedUpload(['file_size' => 12, 'chunk_size' => 5, 'total_chunks' => 3]);

    expect($upload->expectedChunkSize(2))->toBe(2);
});

test('the last chunk is full when the file divides evenly', function () {
    $upload = new ChunkedUpload(['file_size' => 15, 'chunk_size' => 5, 'total_chunks' => 3]);

    expect($upload->expectedChunkSize(2))->toBe(5);
});

test('a file smaller than one chunk is sent as a single chunk of its own size', function () {
    $upload = new ChunkedUpload(['file_size' => 3, 'chunk_size' => 5, 'total_chunks' => 1]);

    expect($upload->expectedChunkSize(0))->toBe(3);
});

test('chunks are stored in a directory named after the upload', function () {
    $upload = (new ChunkedUpload)->forceFill(['id' => '0199a0d9-e614-7308-bfbd-f05723a058b6']);

    expect($upload->chunkDirectory())->toBe('chunks/0199a0d9-e614-7308-bfbd-f05723a058b6')
        ->and($upload->chunkPath(4))->toBe('chunks/0199a0d9-e614-7308-bfbd-f05723a058b6/4');
});
