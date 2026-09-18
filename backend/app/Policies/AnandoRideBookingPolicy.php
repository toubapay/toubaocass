<?php

namespace App\Policies;

use App\Models\AnandoRideBooking;
use App\Models\User;

class AnandoRideBookingPolicy
{
    /**
     * Only the joiner on this booking and the poster of the ride it
     * belongs to may read or send chat messages on it.
     */
    public function chat(User $user, AnandoRideBooking $anandoRideBooking): bool
    {
        return $user->id === $anandoRideBooking->user_id
            || $user->id === $anandoRideBooking->anandoRide->user_id;
    }
}
