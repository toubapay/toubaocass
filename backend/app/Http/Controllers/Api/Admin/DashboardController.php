<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\Delivery;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Models\User;
use App\Support\Geo;

class DashboardController extends Controller
{
    public function stats()
    {
        $bookingTotals = Booking::query()
            ->whereNotNull('commission_amount')
            ->selectRaw('COALESCE(SUM(commission_amount), 0) as commission')
            ->first();

        $deliveryTotals = Delivery::query()
            ->whereNotNull('commission_amount')
            ->selectRaw('COALESCE(SUM(commission_amount), 0) as commission')
            ->first();

        return response()->json([
            'registered_drivers' => User::where('role', User::ROLE_DRIVER)->count(),
            'registered_riders' => User::where('role', User::ROLE_RIDER)->count(),
            'active_cars' => Car::where('is_active', true)->count(),
            'kyc_pending' => DriverProfile::where('kyc_status', DriverProfile::STATUS_SUBMITTED)->count(),
            'total_trips' => Trip::count(),
            'trips_in_progress' => Trip::where('status', Trip::STATUS_IN_PROGRESS)->count(),
            'total_deliveries' => Delivery::count(),
            'total_commission_earned' => (int) $bookingTotals->commission + (int) $deliveryTotals->commission,
        ]);
    }

    public function routes()
    {
        $topTripRoutes = Trip::query()
            ->join('cities as origin', 'origin.id', '=', 'trips.origin_city_id')
            ->join('cities as destination', 'destination.id', '=', 'trips.destination_city_id')
            ->selectRaw('origin.name as origin_city, destination.name as destination_city, COUNT(*) as trips_count')
            ->groupBy('origin.name', 'destination.name')
            ->orderByDesc('trips_count')
            ->limit(10)
            ->get();

        $cities = City::query()
            ->select('id', 'name', 'latitude', 'longitude')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->get();

        $deliveryZones = Delivery::query()
            ->select('pickup_latitude', 'pickup_longitude')
            ->get()
            ->reduce(function (array $carry, Delivery $delivery) use ($cities) {
                $nearest = $cities->sortBy(fn (City $city) => Geo::haversineKm(
                    $delivery->pickup_latitude,
                    $delivery->pickup_longitude,
                    $city->latitude,
                    $city->longitude,
                ))->first();

                if ($nearest === null) {
                    return $carry;
                }

                $carry[$nearest->name] = ($carry[$nearest->name] ?? 0) + 1;

                return $carry;
            }, []);

        arsort($deliveryZones);

        return response()->json([
            'top_trip_routes' => $topTripRoutes,
            'delivery_zone_coverage' => collect($deliveryZones)
                ->map(fn ($count, $zone) => ['zone' => $zone, 'deliveries_count' => $count])
                ->values(),
        ]);
    }
}
