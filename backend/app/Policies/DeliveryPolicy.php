<?php

namespace App\Policies;

use App\Models\Delivery;
use App\Models\User;

class DeliveryPolicy
{
    public function view(User $user, Delivery $delivery): bool
    {
        return $user->id === $delivery->sender_id;
    }

    public function delete(User $user, Delivery $delivery): bool
    {
        return $user->id === $delivery->sender_id;
    }

    public function update(User $user, Delivery $delivery): bool
    {
        return $user->id === $delivery->driver_id;
    }

    /**
     * Only the sender and the assigned driver may read or send chat
     * messages — before a driver accepts there's nobody to chat with yet.
     */
    public function chat(User $user, Delivery $delivery): bool
    {
        return $user->id === $delivery->sender_id
            || ($delivery->driver_id !== null && $user->id === $delivery->driver_id);
    }
}
