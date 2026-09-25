<?php

use App\Enums\UserRole;
use App\Models\ChunkedUpload;
use App\Models\User;
use App\Policies\ChunkedUploadPolicy;

test('only the user who started an upload can view or cancel it', function (UserRole $role, int $userId, bool $allowed) {
    $user = (new User(['role' => $role]))->forceFill(['id' => $userId]);
    $upload = new ChunkedUpload(['user_id' => 1]);
    $policy = new ChunkedUploadPolicy;

    expect($policy->view($user, $upload))->toBe($allowed)
        ->and($policy->delete($user, $upload))->toBe($allowed);
})->with([
    'uploader' => [UserRole::Member, 1, true],
    'another member' => [UserRole::Member, 2, false],
    'admin' => [UserRole::Admin, 2, false],
]);
