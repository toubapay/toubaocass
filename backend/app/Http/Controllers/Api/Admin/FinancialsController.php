<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Delivery;

class FinancialsController extends Controller
{
    public function summary()
    {
        $bookingTotals = Booking::query()
            ->whereNotNull('commission_amount')
            ->selectRaw('COALESCE(SUM(commission_amount), 0) as commission, COALESCE(SUM(fare_total - commission_amount), 0) as driver_earnings, COUNT(*) as count')
            ->first();

        $deliveryTotals = Delivery::query()
            ->whereNotNull('commission_amount')
            ->selectRaw('COALESCE(SUM(commission_amount), 0) as commission, COALESCE(SUM(fee - commission_amount), 0) as driver_earnings, COUNT(*) as count')
            ->first();

        return response()->json([
            'trips' => [
                'completed_count' => (int) $bookingTotals->count,
                'commission_earned' => (int) $bookingTotals->commission,
                'driver_earnings' => (int) $bookingTotals->driver_earnings,
            ],
            'deliveries' => [
                'completed_count' => (int) $deliveryTotals->count,
                'commission_earned' => (int) $deliveryTotals->commission,
                'driver_earnings' => (int) $deliveryTotals->driver_earnings,
            ],
            'total_commission_earned' => (int) $bookingTotals->commission + (int) $deliveryTotals->commission,
            'total_driver_earnings' => (int) $bookingTotals->driver_earnings + (int) $deliveryTotals->driver_earnings,
        ]);
    }
}
