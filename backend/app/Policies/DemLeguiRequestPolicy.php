<?php

namespace App\Policies;

use App\Models\DemLeguiRequest;
use App\Models\User;

class DemLeguiRequestPolicy
{
    /**
     * Only the rider who made the request and the driver of the trip it's
     * matched to may read or send chat messages on it.
     */
    public function chat(User $user, DemLeguiRequest $demLeguiRequest): bool
    {
        return $user->id === $demLeguiRequest->rider_id
            || ($demLeguiRequest->trip !== null && $user->id === $demLeguiRequest->trip->driver_id);
    }
}
