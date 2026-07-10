<?php

namespace App\Contracts;

interface PushGateway
{
    /**
     * @param  array<string, mixed>  $data
     * @return bool whether the push was actually accepted for delivery.
     */
    public function send(string $token, string $title, string $body, array $data = []): bool;
}
