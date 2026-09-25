<?php

namespace App\Contracts;

interface VirusScanner
{
    /**
     * @param  resource  $stream
     */
    public function isInfected($stream): bool;
}
