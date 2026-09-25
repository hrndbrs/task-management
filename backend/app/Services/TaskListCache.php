<?php

namespace App\Services;

use App\Models\User;
use Closure;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class TaskListCache
{
    public const TTL_SECONDS = 600;

    private const VERSION_KEY = 'tasks:list:version';

    /**
     * @param  array<string, mixed>  $query
     * @param  Closure(): array<string, mixed>  $callback
     * @return array<string, mixed>
     */
    public function remember(User $user, array $query, Closure $callback): array
    {
        ksort($query);

        $key = sprintf('tasks:list:%s:user:%d:%s', $this->version(), $user->id, md5(http_build_query($query)));

        return Cache::remember($key, self::TTL_SECONDS, $callback);
    }

    public function flush(): void
    {
        Cache::forever(self::VERSION_KEY, Str::random(16));
    }

    private function version(): string
    {
        return Cache::rememberForever(self::VERSION_KEY, fn () => Str::random(16));
    }
}
