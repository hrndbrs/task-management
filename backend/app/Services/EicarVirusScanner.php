<?php

namespace App\Services;

use App\Contracts\VirusScanner;

/**
 * Simulated scanner: flags any file containing the EICAR anti-virus test signature.
 */
class EicarVirusScanner implements VirusScanner
{
    public function __construct(private int $blockSize = 1024 * 1024) {}

    public function isInfected($stream): bool
    {
        $signature = self::signature();
        $overlap = strlen($signature) - 1;
        $carry = '';

        while (! feof($stream)) {
            $window = $carry.fread($stream, $this->blockSize);

            if (str_contains($window, $signature)) {
                return true;
            }

            // Keep the tail so a signature split across two blocks is still found.
            $carry = substr($window, -$overlap);
        }

        return false;
    }

    public static function signature(): string
    {
        // Split so this source file is not itself flagged by real anti-virus software.
        return 'X5O!P%@AP[4\PZX54(P^)7CC)7}$'.'EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    }
}
