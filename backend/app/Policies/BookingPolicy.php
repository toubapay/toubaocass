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

    /**
     * Only the rider who made the booking and the driver of its trip may
     * read or send chat messages on it.
     */
    public function chat(User $user, Booking $booking): bool
    {
        return $user->id === $booking->rider_id || $user->id === $booking->trip->driver_id;
    }
}
