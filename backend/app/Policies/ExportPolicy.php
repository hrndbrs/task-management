<?php

namespace App\Policies;

use App\Models\Export;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ExportPolicy
{
    /**
     * Determine whether the user can view or download the export.
     */
    public function view(User $user, Export $export): Response
    {
        // Not found rather than forbidden, so other users' export ids reveal nothing.
        return $user->id === $export->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
