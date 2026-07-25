<?php

namespace App\Notifications;

use App\Models\Message;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * Sent to the other participant (rider or driver) on a booking's chat when
 * a new message arrives, so they notice it without keeping the thread open.
 */
class NewMessageNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Message $message) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        return [
            'title' => $this->message->sender->name ?? 'Nouveau message',
            'body' => Str::limit($this->message->body, 100),
            'data' => [
                'type' => 'new_message',
                'booking_id' => $this->message->booking_id,
                'dem_legui_request_id' => $this->message->dem_legui_request_id,
            ],
        ];
    }
}
