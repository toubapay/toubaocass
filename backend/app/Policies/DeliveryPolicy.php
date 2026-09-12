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
}
