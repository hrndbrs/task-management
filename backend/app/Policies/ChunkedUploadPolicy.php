<?php

namespace App\Policies;

use App\Models\ChunkedUpload;
use App\Models\User;

class ChunkedUploadPolicy
{
    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, ChunkedUpload $upload): bool
    {
        return $user->id === $upload->user_id;
    }

    /**
     * Determine whether the user can add chunks to or complete the upload.
     */
    public function update(User $user, ChunkedUpload $upload): bool
    {
        return $user->id === $upload->user_id
            && $user->can('update', $upload->task);
    }

    /**
     * Determine whether the user can cancel the upload.
     */
    public function delete(User $user, ChunkedUpload $upload): bool
    {
        return $user->id === $upload->user_id;
    }
}
