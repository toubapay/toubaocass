<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FinancialReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class RiderReportController extends Controller
{
    /**
     * "Mes dépenses" mini-report for the rider's profile page — total
     * spent, by period, by service, over the last week/month/year.
     */
    public function spending(Request $request, FinancialReportService $reports)
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
            ...$reports->riderSpending($request->user(), $from, $to, $bucket),
        ]);
    }
}
