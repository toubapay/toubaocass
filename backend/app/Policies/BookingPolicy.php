<?php

namespace App\Policies;

use App\Models\Booking;
use App\Models\User;

class BookingPolicy
{
    public function delete(User $user, Booking $booking): bool
    {
        return $user->id === $booking->rider_id;
    }

    public function update(User $user, Booking $booking): bool
    {
        return $user->id === $booking->rider_id;
    }
}
