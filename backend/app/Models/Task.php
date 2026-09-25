<?php

namespace App\Models;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['title', 'description', 'status', 'priority', 'assigned_user_id', 'created_by', 'due_date'])]
class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use HasFactory;

    // Mirrors the DB defaults so a newly created task reports them before being re-fetched.
    protected $attributes = [
        'status' => TaskStatus::Pending->value,
        'priority' => TaskPriority::Medium->value,
    ];

    protected function casts(): array
    {
        return [
            'status' => TaskStatus::class,
            'priority' => TaskPriority::class,
            'due_date' => 'date',
        ];
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TaskAttachment::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class);
    }

    public function chunkedUploads(): HasMany
    {
        return $this->hasMany(ChunkedUpload::class);
    }

    /**
     * Apply the task list's filters and sort. The sort column must already be allow-listed by validation.
     *
     * @param  array<string, mixed>  $filters
     */
    #[Scope]
    protected function filtered(Builder $query, array $filters): void
    {
        $has = fn (string $key) => ($filters[$key] ?? null) !== null && $filters[$key] !== '';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $sort = $filters['sort'] ?? 'created_at';

        $query
            ->when($has('status'), fn ($query) => $query->where('status', $filters['status']))
            ->when($has('priority'), fn ($query) => $query->where('priority', $filters['priority']))
            ->when($has('assigned_user_id'), fn ($query) => $query->where('assigned_user_id', (int) $filters['assigned_user_id']))
            ->when($has('created_by'), fn ($query) => $query->where('created_by', (int) $filters['created_by']))
            ->when($has('search'), fn ($query) => $query->where('title', 'like', '%'.$filters['search'].'%'));

        match ($sort) {
            'priority' => $this->orderByEnumCase($query, 'priority', TaskPriority::cases(), $direction),
            'status' => $this->orderByEnumCase($query, 'status', TaskStatus::cases(), $direction),
            default => $query->orderBy($sort, $direction),
        };

        $query->orderBy('id', $direction);
    }

    /**
     * Sort a string-backed enum column by the order its cases are declared in, not alphabetically.
     *
     * @param  list<\BackedEnum>  $cases
     */
    private function orderByEnumCase(Builder $query, string $column, array $cases, string $direction): void
    {
        $whens = implode(' ', array_fill(0, count($cases), 'WHEN ? THEN ?'));
        $bindings = collect($cases)->flatMap(fn (\BackedEnum $case, int $rank) => [$case->value, $rank])->all();

        $query->orderByRaw("CASE {$column} {$whens} END {$direction}", $bindings);
    }
}
