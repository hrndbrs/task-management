<?php

namespace App\Services;

class VideoRenditions
{
    public static function for(int $sourceHeight, array $ladder): array
    {
        ksort($ladder);
        $top = min($sourceHeight, array_key_last($ladder));
        $top -= $top % 2;

        $renditions = [];
        foreach ($ladder as $height => $bitrate) {
            if ($height < $top) {
                $renditions[] = ['height' => $height, 'bitrate' => $bitrate];
            }
        }

        $renditions[] = ['height' => $top, 'bitrate' => self::bitrateFor($top, $ladder)];

        return $renditions;
    }

    private static function bitrateFor(int $height, array $ladder): int
    {
        foreach ($ladder as $rungHeight => $bitrate) {
            if ($rungHeight >= $height) {
                return $bitrate;
            }
        }

        return end($ladder);
    }
}
