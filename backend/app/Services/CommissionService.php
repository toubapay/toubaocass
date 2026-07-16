<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Delivery;

class CommissionService
{
    const RATE_KEY_TRIP = 'commission_rate_trip';

    const RATE_KEY_DELIVERY = 'commission_rate_delivery';

    const DEFAULT_RATE = '15.00';

    public function __construct(private readonly PlatformSettingsService $settings) {}

    public function tripRate(): float
    {
        return (float) $this->settings->get(self::RATE_KEY_TRIP, self::DEFAULT_RATE);
    }

    public function deliveryRate(): float
    {
        return (float) $this->settings->get(self::RATE_KEY_DELIVERY, self::DEFAULT_RATE);
    }

    /**
     * @return array{rate: float, amount: int}
     */
    public function calculate(int $grossAmount, float $rate): array
    {
        return [
            'rate' => $rate,
            'amount' => (int) round($grossAmount * $rate / 100),
        ];
    }

    /**
     * Computes and persists commission on a confirmed booking, at trip
     * completion time — the rate is snapshotted onto the row so a later
     * rate change never retroactively alters historical figures.
     */
    public function applyToBooking(Booking $booking): Booking
    {
        $result = $this->calculate($booking->fare_total, $this->tripRate());

        $booking->update([
            'commission_rate' => $result['rate'],
            'commission_amount' => $result['amount'],
        ]);

        return $booking->fresh();
    }

    public function applyToDelivery(Delivery $delivery): Delivery
    {
        $result = $this->calculate($delivery->fee, $this->deliveryRate());

        $delivery->update([
            'commission_rate' => $result['rate'],
            'commission_amount' => $result['amount'],
        ]);

        return $delivery->fresh();
    }
}
