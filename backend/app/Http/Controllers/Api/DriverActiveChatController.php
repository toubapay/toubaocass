<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\DemLeguiRequest;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Powers the floating chat button in the driver app: rather than making a
 * driver dig into a specific trip to find a specific booking's thread, this
 * resolves the single most relevant conversation to jump straight into —
 * the most recent incoming message across every trip/Dem Légui request they
 * drive, falling back to their most recent active thread if nobody has
 * said anything yet.
 */
class DriverActiveChatController extends Controller
{
    public function show(Request $request)
    {
        $driverId = $request->user()->id;

        $latestBookingMessage = Message::query()
            ->whereNotNull('booking_id')
            ->where('sender_id', '!=', $driverId)
            ->whereHas('booking.trip', fn ($q) => $q->where('driver_id', $driverId))
            ->latest('created_at')
            ->latest('id')
            ->first();

        $latestDemLeguiMessage = Message::query()
            ->whereNotNull('dem_legui_request_id')
            ->where('sender_id', '!=', $driverId)
            ->whereHas('demLeguiRequest.trip', fn ($q) => $q->where('driver_id', $driverId))
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
            ->where('status', Booking::STATUS_CONFIRMED)
            ->whereHas('trip', fn ($q) => $q->where('driver_id', $driverId))
            ->latest('created_at')
            ->latest('id')
            ->first();

        $latestRequest = DemLeguiRequest::query()
            ->where('status', DemLeguiRequest::STATUS_MATCHED)
            ->whereHas('trip', fn ($q) => $q->where('driver_id', $driverId))
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
            $booking = Booking::with('rider')->find($bookingId);

            return response()->json(['active_chat' => [
                'type' => 'booking',
                'id' => $bookingId,
                'other_party_name' => $booking?->rider?->name,
            ]]);
        }

        $demLeguiRequest = DemLeguiRequest::with('rider')->find($demLeguiRequestId);

        return response()->json(['active_chat' => [
            'type' => 'dem_legui_request',
            'id' => $demLeguiRequestId,
            'other_party_name' => $demLeguiRequest?->rider?->name,
        ]]);
    }
}
