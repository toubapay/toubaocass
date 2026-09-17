<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\DemLeguiRequest;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Rider counterpart to DriverActiveChatController — powers the same
 * floating chat button, resolved from the rider's own bookings/Dem Légui
 * requests instead of a driver's trips.
 */
class RiderActiveChatController extends Controller
{
    public function show(Request $request)
    {
        $riderId = $request->user()->id;

        $latestBookingMessage = Message::query()
            ->whereNotNull('booking_id')
            ->where('sender_id', '!=', $riderId)
            ->whereHas('booking', fn ($q) => $q->where('rider_id', $riderId))
            ->latest('created_at')
            ->latest('id')
            ->first();

        $latestDemLeguiMessage = Message::query()
            ->whereNotNull('dem_legui_request_id')
            ->where('sender_id', '!=', $riderId)
            ->whereHas('demLeguiRequest', fn ($q) => $q->where('rider_id', $riderId))
            ->latest('created_at')
            ->latest('id')
            ->first();

        $latestMessage = collect([$latestBookingMessage, $latestDemLeguiMessage])
            ->filter()
            ->sortByDesc('created_at')
            ->first();

        if ($latestMessage) {
            return $this->respond($latestMessage->booking_id, $latestMessage->dem_legui_request_id, $latestMessage);
        }

        // No messages yet on either side — still point at the most recent
        // active thread so the button has somewhere useful to go.
        $latestBooking = Booking::query()
            ->where('rider_id', $riderId)
            ->where('status', Booking::STATUS_CONFIRMED)
            ->latest('created_at')
            ->latest('id')
            ->first();

        $latestRequest = DemLeguiRequest::query()
            ->where('rider_id', $riderId)
            ->where('status', DemLeguiRequest::STATUS_MATCHED)
            ->latest('created_at')
            ->latest('id')
            ->first();

        if ($latestBooking && (! $latestRequest || $latestBooking->created_at >= $latestRequest->created_at)) {
            return $this->respond($latestBooking->id, null);
        }

        if ($latestRequest) {
            return $this->respond(null, $latestRequest->id);
        }

        return response()->json(['active_chat' => null]);
    }

    private function respond(?int $bookingId, ?int $demLeguiRequestId, ?Message $latestMessage = null): JsonResponse
    {
        // latest_message_id/preview let the frontend tell "a new message
        // just arrived" apart from "this has been the active chat for a
        // while" across polls, to drive the in-app new-message alert
        // without depending on push notification permission/FCM setup.
        $messageFields = [
            'latest_message_id' => $latestMessage?->id,
            'preview' => $latestMessage ? Str::limit($latestMessage->body, 80) : null,
        ];

        if ($bookingId) {
            $booking = Booking::with('trip.driver')->find($bookingId);

            return response()->json(['active_chat' => array_merge([
                'type' => 'booking',
                'id' => $bookingId,
                'other_party_name' => $booking?->trip?->driver?->name,
            ], $messageFields)]);
        }

        $demLeguiRequest = DemLeguiRequest::with('trip.driver')->find($demLeguiRequestId);

        return response()->json(['active_chat' => array_merge([
            'type' => 'dem_legui_request',
            'id' => $demLeguiRequestId,
            'other_party_name' => $demLeguiRequest?->trip?->driver?->name,
        ], $messageFields)]);
    }
}
