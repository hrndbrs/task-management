<?php

return [

    'disk' => env('ATTACHMENTS_DISK', 'local'),

    // Kilobytes. Files above this go through chunked upload instead.
    'max_size' => (int) env('ATTACHMENTS_MAX_SIZE_KB', 51200),

    'allowed_extensions' => [
        // images
        'jpg', 'jpeg', 'png', 'gif', 'webp',
        // documents
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
        // videos
        'mp4', 'webm', 'mov',
    ],

    'video' => [
        'ffmpeg' => env('FFMPEG_BINARY', 'ffmpeg'),
        'ffprobe' => env('FFPROBE_BINARY', 'ffprobe'),
        'segment_seconds' => 4,
        'renditions' => [
            360 => 800,
            720 => 2800,
            1080 => 5000,
        ],
    ],

    'chunked' => [
        // Kilobytes. Must stay below PHP's post_max_size.
        'chunk_size' => (int) env('ATTACHMENTS_CHUNK_SIZE_KB', 5120),

        // Kilobytes.
        'max_size' => (int) env('ATTACHMENTS_CHUNKED_MAX_SIZE_KB', 2097152),

        'expire_after_hours' => 24,
    ],

];
