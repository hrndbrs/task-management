<?php

namespace App\Listeners;

use App\Events\TasksChanged;
use App\Services\TaskListCache;

class FlushTaskListCache
{
    public function __construct(private TaskListCache $cache) {}

    public function handle(TasksChanged $event): void
    {
        $this->cache->flush();
    }
}
