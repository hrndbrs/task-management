<?php

namespace App\Services;

use Illuminate\Support\Facades\Process;
use RuntimeException;

class VideoTranscoder
{
    public function __construct(
        private string $ffmpeg,
        private string $ffprobe,
        private int $segmentSeconds,
    ) {}

    public function probe(string $path): array
    {
        $result = Process::run([
            $this->ffprobe, '-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', $path,
        ])->throw();

        $info = json_decode($result->output(), true);
        $streams = collect($info['streams'] ?? []);
        $video = $streams->firstWhere('codec_type', 'video');

        if ($video === null) {
            throw new RuntimeException('The file has no video stream.');
        }

        return [
            'width' => (int) $video['width'],
            'height' => (int) $video['height'],
            'duration' => (float) ($info['format']['duration'] ?? 0),
            'has_audio' => $streams->contains('codec_type', 'audio'),
        ];
    }

    public function poster(string $source, string $target, float $at): void
    {
        Process::run([
            $this->ffmpeg, '-v', 'error', '-y', '-ss', sprintf('%.3f', $at), '-i', $source,
            '-frames:v', '1', '-q:v', '2', $target,
        ])->throw();
    }

    public function hls(string $source, string $directory, array $renditions, bool $hasAudio, int $timeout): void
    {
        $count = count($renditions);
        $splits = implode('', array_map(fn (int $i) => "[v{$i}]", array_keys($renditions)));
        $filters = ["[0:v]split={$count}{$splits}"];
        $arguments = [];
        $streamMap = [];

        foreach ($renditions as $i => ['height' => $height, 'bitrate' => $bitrate]) {
            $filters[] = "[v{$i}]scale=-2:{$height}[v{$i}out]";
            array_push(
                $arguments,
                '-map', "[v{$i}out]",
                "-c:v:{$i}", 'libx264',
                "-b:v:{$i}", "{$bitrate}k",
                "-maxrate:v:{$i}", (int) round($bitrate * 1.07).'k',
                "-bufsize:v:{$i}", (int) round($bitrate * 1.5).'k',
            );
            $streamMap[] = $hasAudio ? "v:{$i},a:{$i}" : "v:{$i}";
        }

        if ($hasAudio) {
            foreach ($renditions as $i => $rendition) {
                array_push($arguments, '-map', 'a:0');
            }
            array_push($arguments, '-c:a', 'aac', '-b:a', '128k', '-ac', '2');
        }

        Process::timeout($timeout)->run([
            $this->ffmpeg, '-v', 'error', '-y', '-i', $source,
            '-filter_complex', implode(';', $filters),
            ...$arguments,
            '-preset', 'veryfast',
            '-pix_fmt', 'yuv420p',
            '-force_key_frames', "expr:gte(t,n_forced*{$this->segmentSeconds})",
            '-sc_threshold', '0',
            '-f', 'hls',
            '-hls_time', (string) $this->segmentSeconds,
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', "{$directory}/stream_%v/seg_%03d.ts",
            '-master_pl_name', 'master.m3u8',
            '-var_stream_map', implode(' ', $streamMap),
            "{$directory}/stream_%v/index.m3u8",
        ])->throw();
    }
}
