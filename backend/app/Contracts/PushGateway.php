<?php

namespace App\Contracts;

interface PushGateway
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function send(string $token, string $title, string $body, array $data = []): PushSendResult;
}
