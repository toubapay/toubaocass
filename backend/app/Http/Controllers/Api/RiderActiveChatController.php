<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\DemLeguiRequest;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            return $this->respond($latestMessage->booking_id, $latestMessage->dem_legui_request_id);
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

    private function respond(?int $bookingId, ?int $demLeguiRequestId): JsonResponse
    {
        if ($bookingId) {
            $booking = Booking::with('trip.driver')->find($bookingId);

            return response()->json(['active_chat' => [
                'type' => 'booking',
                'id' => $bookingId,
                'other_party_name' => $booking?->trip?->driver?->name,
            ]]);
        }

        $demLeguiRequest = DemLeguiRequest::with('trip.driver')->find($demLeguiRequestId);

        return response()->json(['active_chat' => [
            'type' => 'dem_legui_request',
            'id' => $demLeguiRequestId,
            'other_party_name' => $demLeguiRequest?->trip?->driver?->name,
        ]]);
    }
}
