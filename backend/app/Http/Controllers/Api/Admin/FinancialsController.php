<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Delivery;
use App\Services\FinancialReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class FinancialsController extends Controller
{
    /**
     * Detailed platform-wide financial report — commission, driver
     * earnings, rider spending, counts, and breakdowns by service,
     * destination, vehicle category, and driver, across all four service
     * types. Defaults to the last 30 days when no range is given.
     */
    public function report(Request $request, FinancialReportService $reports)
    {
        $data = $request->validate([
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date'],
        ]);

        $to = isset($data['to']) ? Carbon::parse($data['to'])->endOfDay() : Carbon::now();
        $from = isset($data['from']) ? Carbon::parse($data['from'])->startOfDay() : $to->copy()->subDays(30)->startOfDay();

        return response()->json($reports->platformReport($from, $to));
    }

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
