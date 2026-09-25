<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Task export</title>
    <style>
        body { font-family: "DejaVu Sans", sans-serif; font-size: 9px; color: #1f2933; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        .meta { color: #616e7c; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #e4e7eb; text-align: left; padding: 5px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
        td { padding: 5px; border-bottom: 1px solid #e4e7eb; vertical-align: top; }
        tr { page-break-inside: avoid; }
        .muted { color: #9aa5b1; }
    </style>
</head>
<body>
    <h1>Task export</h1>
    <div class="meta">
        {{ $tasks->count() }} {{ Str::plural('task', $tasks->count()) }}
        &middot; generated {{ $generatedAt->toDayDateTimeString() }}
        @foreach (Arr::only($filters, ['status', 'priority', 'search']) as $name => $value)
            @if ($value !== null && $value !== '')
                &middot; {{ Str::headline($name) }}: {{ $value }}
            @endif
        @endforeach
    </div>

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Creator</th>
                <th>Due</th>
                <th>Created</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($tasks as $task)
                <tr>
                    <td>{{ $task->id }}</td>
                    <td>{{ $task->title }}</td>
                    <td>{{ Str::headline($task->status->value) }}</td>
                    <td>{{ Str::headline($task->priority->value) }}</td>
                    <td>{{ $task->assignedUser?->name ?? '—' }}</td>
                    <td>{{ $task->creator->name }}</td>
                    <td>{{ $task->due_date?->toDateString() ?? '—' }}</td>
                    <td>{{ $task->created_at->toDateString() }}</td>
                </tr>
            @empty
                <tr><td colspan="8" class="muted">No tasks match these filters.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
