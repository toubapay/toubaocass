<?php

namespace App\Notifications;

use App\Models\DemLeguiRequest;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the driver when a rider cancels a Dem Légui request that was
 * already matched to the driver's trip.
 */
class DemLeguiRequestCancelledNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly DemLeguiRequest $request) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class, SmsChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        return [
            'title' => 'Demande annulée',
            'body' => "Le passager a annulé sa demande Dem Légui ({$this->request->seats_requested} place(s)) vers {$this->request->destinationCity->name}.",
            'data' => [
                'type' => 'dem_legui_request_cancelled',
                'dem_legui_request_id' => $this->request->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "Intercity : Le passager a annulé sa demande Dem Légui ({$this->request->seats_requested} place(s)) vers {$this->request->destinationCity->name}.";
    }
}
