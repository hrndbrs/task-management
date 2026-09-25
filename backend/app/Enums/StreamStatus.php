<?php

namespace App\Enums;

enum StreamStatus: string
{
    case Pending = 'pending';
    case Ready = 'ready';
    case Failed = 'failed';
}
