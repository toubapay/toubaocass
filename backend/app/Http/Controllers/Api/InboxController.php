<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnandoRideBooking;
use App\Models\Booking;
use App\Models\DemLeguiRequest;
use App\Models\Delivery;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class InboxController extends Controller
{
    /**
     * Every chat thread (trip bookings, Dem Légui, Anando, deliveries) the
     * authenticated user is a participant in and that has at least one
     * message, each with its own unread count — powers the inbox
     * icon/badge and the inbox page, for both rider and driver apps alike
     * (a thread's two participants can be either role, so this doesn't
     * live under role:rider/role:driver).
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Sorted by the latest message's own id, not its created_at — ties
        // are common in tests/bursty traffic (same-second timestamps), and
        // the messages table's auto-increment id is a perfectly monotonic,
        // tie-free stand-in for "most recently sent" across every thread.
        // Also handy for the frontend to detect a genuinely new arrival
        // since its last poll, the same way ChatFab already does.
        $threads = $this->bookingThreads($user)
            ->concat($this->demLeguiThreads($user))
            ->concat($this->anandoThreads($user))
            ->concat($this->deliveryThreads($user))
            ->sortByDesc('latest_message_id')
            ->values();

        return response()->json([
            'data' => $threads,
            'unread_total' => $threads->sum('unread_count'),
        ]);
    }

    private function bookingThreads(User $user): Collection
    {
        return Booking::query()
            ->where(fn ($q) => $q->where('rider_id', $user->id)->orWhereHas('trip', fn ($t) => $t->where('driver_id', $user->id)))
            ->whereHas('messages')
            ->with(['rider:id,name', 'trip:id,driver_id', 'trip.driver:id,name'])
            ->get()
            ->map(function (Booking $booking) use ($user) {
                $isRider = $booking->rider_id === $user->id;

                return $this->threadRow(
                    'booking',
                    $booking->id,
                    $isRider ? $booking->trip->driver?->name : $booking->rider?->name,
                    $booking,
                    $user,
                );
            });
    }

    private function demLeguiThreads(User $user): Collection
    {
        return DemLeguiRequest::query()
            ->where(fn ($q) => $q->where('rider_id', $user->id)->orWhereHas('trip', fn ($t) => $t->where('driver_id', $user->id)))
            ->whereHas('messages')
            ->with(['rider:id,name', 'trip:id,driver_id', 'trip.driver:id,name'])
            ->get()
            ->map(function (DemLeguiRequest $demLeguiRequest) use ($user) {
                $isRider = $demLeguiRequest->rider_id === $user->id;

                return $this->threadRow(
                    'dem_legui_request',
                    $demLeguiRequest->id,
                    $isRider ? $demLeguiRequest->trip?->driver?->name : $demLeguiRequest->rider?->name,
                    $demLeguiRequest,
                    $user,
                );
            });
    }

    private function anandoThreads(User $user): Collection
    {
        return AnandoRideBooking::query()
            ->where(fn ($q) => $q->where('user_id', $user->id)->orWhereHas('anandoRide', fn ($r) => $r->where('user_id', $user->id)))
            ->whereHas('messages')
            ->with(['user:id,name', 'anandoRide:id,user_id', 'anandoRide.poster:id,name'])
            ->get()
            ->map(function (AnandoRideBooking $booking) use ($user) {
                $isPoster = $booking->anandoRide->user_id === $user->id;

                return $this->threadRow(
                    'anando',
                    $booking->id,
                    $isPoster ? $booking->user?->name : $booking->anandoRide->poster?->name,
                    $booking,
                    $user,
                );
            });
    }

    private function deliveryThreads(User $user): Collection
    {
        return Delivery::query()
            ->where(fn ($q) => $q->where('sender_id', $user->id)->orWhere('driver_id', $user->id))
            ->whereHas('messages')
            ->with(['sender:id,name', 'driver:id,name'])
            ->get()
            ->map(function (Delivery $delivery) use ($user) {
                $isSender = $delivery->sender_id === $user->id;

                return $this->threadRow(
                    'delivery',
                    $delivery->id,
                    $isSender ? $delivery->driver?->name : $delivery->sender?->name,
                    $delivery,
                    $user,
                );
            });
    }

    /**
     * $thread is any model with a messages(): HasMany<Message> relation
     * (Booking, DemLeguiRequest, AnandoRideBooking, Delivery) — calling
     * messages() fresh for each query here (rather than reusing one query
     * builder instance) avoids one call's ->latest()/->where() clauses
     * leaking into the other.
     */
    private function threadRow(string $type, int $id, ?string $otherPartyName, $thread, User $user): array
    {
        $latest = $thread->messages()->latest('created_at')->latest('id')->first();
        $unreadCount = $thread->messages()->where('sender_id', '!=', $user->id)->whereNull('read_at')->count();

        return [
            'type' => $type,
            'id' => $id,
            'other_party_name' => $otherPartyName,
            'unread_count' => $unreadCount,
            'preview' => $latest ? Str::limit($latest->body, 80) : null,
            'latest_at' => $latest?->created_at,
            'latest_message_id' => $latest?->id,
        ];
    }
}
