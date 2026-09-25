<?php

use App\Enums\UserRole;
use App\Models\Export;
use App\Models\User;
use App\Policies\ExportPolicy;

test('an export is visible only to the user who requested it', function () {
    $owner = (new User(['role' => UserRole::Member]))->forceFill(['id' => 1]);
    $export = new Export(['user_id' => 1]);

    expect((new ExportPolicy)->view($owner, $export)->allowed())->toBeTrue();
});

test('another user, even an admin, is told the export does not exist', function (UserRole $role) {
    $user = (new User(['role' => $role]))->forceFill(['id' => 2]);
    $export = new Export(['user_id' => 1]);

    $response = (new ExportPolicy)->view($user, $export);

    expect($response->denied())->toBeTrue()
        ->and($response->status())->toBe(404);
})->with([
    'member' => [UserRole::Member],
    'admin' => [UserRole::Admin],
]);
