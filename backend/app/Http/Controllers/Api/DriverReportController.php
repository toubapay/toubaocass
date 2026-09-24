<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FinancialReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DriverReportController extends Controller
{
    /**
     * "Mes revenus" mini-report for the driver's profile page — total net
     * earnings, by period, by service, by vehicle ("flotte"), over the
     * last week/month/year.
     */
    public function earnings(Request $request, FinancialReportService $reports)
    {
        $range = $request->string('range')->value();
        $range = in_array($range, ['week', 'month', 'year'], true) ? $range : 'month';

        $to = Carbon::now();
        [$from, $bucket] = match ($range) {
            'week' => [$to->copy()->subDays(6)->startOfDay(), 'day'],
            'year' => [$to->copy()->subMonths(11)->startOfMonth(), 'month'],
            default => [$to->copy()->subWeeks(3)->startOfWeek(), 'week'],
        };

        return response()->json([
            'range' => $range,
            ...$reports->driverEarnings($request->user(), $from, $to, $bucket),
        ]);
    }
}
