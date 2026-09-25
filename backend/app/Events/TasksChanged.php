<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

class TasksChanged implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable;

    /**
     * @param  list<int>  $taskIds
     */
    public function __construct(
        public array $taskIds,
        public string $action,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('tasks')];
    }

    public function broadcastAs(): string
    {
        return 'tasks.changed';
    }
}
