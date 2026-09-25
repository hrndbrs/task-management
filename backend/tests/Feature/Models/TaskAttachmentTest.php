<?php

use App\Models\TaskAttachment;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('rejects two versions of a file with the same version number', function () {
    $first = TaskAttachment::factory()->create(['version' => 1]);

    expect(fn () => TaskAttachment::factory()->for($first->task)->create([
        'version_group' => $first->version_group,
        'version' => 1,
    ]))->toThrow(UniqueConstraintViolationException::class);

    expect(TaskAttachment::where('version_group', $first->version_group)->count())->toBe(1);
});

it('allows the same version number in different files', function () {
    $first = TaskAttachment::factory()->create(['version' => 1]);

    $second = TaskAttachment::factory()->for($first->task)->create(['version' => 1]);

    $this->assertModelExists($second);
});
