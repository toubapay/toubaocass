<?php

namespace App\Services;

use App\Models\AnandoRideBooking;
use App\Models\Booking;
use App\Models\City;
use App\Models\Delivery;
use App\Models\DemLeguiRequest;
use App\Models\Trip;
use App\Models\User;
use App\Support\Geo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Single source of truth for every "how much moved through the platform"
 * question — the admin detailed financial report, a rider's spending
 * mini-report, and a driver's earnings mini-report all read from the same
 * normalized row set (one row per completed/delivered booking-type record,
 * across all four service types) rather than each re-deriving totals from
 * the underlying tables independently, which is how "commission total" on
 * one screen and another used to silently drift apart (see the old
 * Admin\FinancialsController::summary(), which only ever counted Trip and
 * Delivery — Dem Légui and Anando were invisible to it).
 *
 * Money only "happened" once a service completed — see the wallet-timing
 * comments in BookingController/DeliveryController/DemLeguiController/
 * AnandoRideController — so every query below filters on the completion
 * status/timestamp, never on booking/creation time.
 */
class FinancialReportService
{
    public const SERVICE_TRIP = 'trip';

    public const SERVICE_DEM_LEGUI = 'dem_legui';

    public const SERVICE_DELIVERY = 'delivery';

    public const SERVICE_ANANDO = 'anando';

    private const SERVICE_LABELS = [
        self::SERVICE_TRIP => 'Trajets',
        self::SERVICE_DEM_LEGUI => 'Dem Légui',
        self::SERVICE_DELIVERY => 'Livraisons',
        self::SERVICE_ANANDO => 'Anando',
    ];

    /**
     * Platform-wide detailed report for the admin financial dashboard.
     */
    public function platformReport(?Carbon $from, ?Carbon $to): array
    {
        $rows = $this->completedRows($from, $to);

        $totals = $this->sumRows($rows);

        return [
            'range' => ['from' => $from?->toDateString(), 'to' => $to?->toDateString()],
            'totals' => [
                'gross_revenue' => $totals['gross'],
                'commission_total' => $totals['commission'],
                'driver_earnings_total' => $totals['driver_earnings'],
                'rider_spending_total' => $totals['gross'],
                'trips_count' => $rows->where('type', self::SERVICE_TRIP)->count(),
                'dem_legui_count' => $rows->where('type', self::SERVICE_DEM_LEGUI)->count(),
                'deliveries_count' => $rows->where('type', self::SERVICE_DELIVERY)->count(),
                'anando_count' => $rows->where('type', self::SERVICE_ANANDO)->count(),
                'active_drivers_count' => $rows->pluck('driver_id')->unique()->count(),
                'active_riders_count' => $rows->pluck('rider_id')->unique()->count(),
            ],
            'by_service' => $this->groupByService($rows),
            'by_destination' => $this->groupByDestination($rows),
            'by_vehicle_category' => $this->groupByRideType($rows),
            'by_driver' => $this->groupByDriver($rows),
        ];
    }

    /**
     * A single rider's own spending, broken down by period and by service —
     * powers the "Mes dépenses" mini-report on the rider's profile.
     */
    public function riderSpending(User $rider, Carbon $from, Carbon $to, string $bucket): array
    {
        $rows = $this->completedRows($from, $to)->where('rider_id', $rider->id);
        $totals = $this->sumRows($rows);

        return [
            'total_spent' => $totals['gross'],
            'items_count' => $rows->count(),
            'by_period' => $this->groupByPeriod($rows, $from, $to, $bucket, 'gross'),
            'by_service' => $this->groupByServiceAmount($rows, 'gross'),
        ];
    }

    /**
     * A single driver's own net earnings, broken down by period, by
     * service, and by which of their own cars ("flotte") earned it —
     * powers the "Mes revenus" mini-report on the driver's profile.
     */
    public function driverEarnings(User $driver, Carbon $from, Carbon $to, string $bucket): array
    {
        $rows = $this->completedRows($from, $to)->where('driver_id', $driver->id);
        $totals = $this->sumRows($rows);

        return [
            'total_earnings' => $totals['driver_earnings'],
            'items_count' => $rows->count(),
            'by_period' => $this->groupByPeriod($rows, $from, $to, $bucket, 'driver_earnings'),
            'by_service' => $this->groupByServiceAmount($rows, 'driver_earnings'),
            'by_vehicle' => $this->groupByCar($rows, $driver),
        ];
    }

    /**
     * One normalized row per completed Trip booking, matched Dem Légui
     * request, delivered Delivery, and confirmed Anando booking on a
     * completed ride — everything downstream (totals, grouping) works off
     * this single shape instead of four different table layouts.
     */
    private function completedRows(?Carbon $from, ?Carbon $to): Collection
    {
        $rows = collect();

        $tripBookings = Booking::query()
            ->where('status', Booking::STATUS_CONFIRMED)
            ->whereHas('trip', fn ($q) => $q->where('status', Trip::STATUS_COMPLETED))
            ->with('trip')
            ->get()
            ->filter(fn (Booking $b) => $this->withinRange($b->trip->updated_at, $from, $to));

        foreach ($tripBookings as $booking) {
            $trip = $booking->trip;
            $rows->push((object) [
                'type' => self::SERVICE_TRIP,
                'gross' => (int) $booking->fare_total,
                'commission' => (int) ($booking->commission_amount ?? 0),
                'driver_earnings' => (int) $booking->fare_total - (int) ($booking->commission_amount ?? 0),
                'driver_id' => $trip->driver_id,
                'rider_id' => $booking->rider_id,
                'completed_at' => $trip->updated_at,
                'destination_city_id' => $trip->destination_city_id,
                'destination_lat' => null,
                'destination_lng' => null,
                'ride_type' => $trip->ride_type,
                'car_id' => $trip->car_id,
            ]);
        }

        $demLeguiRequests = DemLeguiRequest::query()
            ->where('status', DemLeguiRequest::STATUS_MATCHED)
            ->whereHas('trip', fn ($q) => $q->where('status', \App\Models\DemLeguiTrip::STATUS_COMPLETED))
            ->with('trip')
            ->get()
            ->filter(fn (DemLeguiRequest $r) => $this->withinRange($r->trip->completed_at, $from, $to));

        foreach ($demLeguiRequests as $request) {
            $trip = $request->trip;
            $rows->push((object) [
                'type' => self::SERVICE_DEM_LEGUI,
                'gross' => (int) $request->fare_total,
                'commission' => (int) ($request->commission_amount ?? 0),
                'driver_earnings' => (int) $request->fare_total - (int) ($request->commission_amount ?? 0),
                'driver_id' => $trip->driver_id,
                'rider_id' => $request->rider_id,
                'completed_at' => $trip->completed_at,
                'destination_city_id' => $request->destination_city_id,
                'destination_lat' => null,
                'destination_lng' => null,
                'ride_type' => null,
                'car_id' => $trip->car_id,
            ]);
        }

        $deliveries = Delivery::query()
            ->where('status', Delivery::STATUS_DELIVERED)
            ->when($from, fn ($q) => $q->where('delivered_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('delivered_at', '<=', $to))
            ->get();

        foreach ($deliveries as $delivery) {
            $rows->push((object) [
                'type' => self::SERVICE_DELIVERY,
                'gross' => (int) $delivery->fee,
                'commission' => (int) ($delivery->commission_amount ?? 0),
                'driver_earnings' => (int) $delivery->fee - (int) ($delivery->commission_amount ?? 0),
                'driver_id' => $delivery->driver_id,
                'rider_id' => $delivery->sender_id,
                'completed_at' => $delivery->delivered_at,
                'destination_city_id' => null,
                'destination_lat' => $delivery->receiver_latitude,
                'destination_lng' => $delivery->receiver_longitude,
                'ride_type' => null,
                'car_id' => null,
            ]);
        }

        $anandoBookings = AnandoRideBooking::query()
            ->where('status', AnandoRideBooking::STATUS_CONFIRMED)
            ->whereHas('anandoRide', fn ($q) => $q->where('status', \App\Models\AnandoRide::STATUS_COMPLETED))
            ->with('anandoRide')
            ->get()
            ->filter(fn (AnandoRideBooking $b) => $this->withinRange($b->anandoRide->completed_at, $from, $to));

        foreach ($anandoBookings as $booking) {
            $ride = $booking->anandoRide;
            $rows->push((object) [
                'type' => self::SERVICE_ANANDO,
                'gross' => (int) $booking->price_total,
                'commission' => (int) ($booking->commission_amount ?? 0),
                'driver_earnings' => (int) $booking->price_total - (int) ($booking->commission_amount ?? 0),
                'driver_id' => $ride->user_id,
                'rider_id' => $booking->user_id,
                'completed_at' => $ride->completed_at,
                'destination_city_id' => $ride->destination_city_id,
                'destination_lat' => null,
                'destination_lng' => null,
                'ride_type' => null,
                'car_id' => null,
            ]);
        }

        return $rows;
    }

    private function withinRange(?Carbon $at, ?Carbon $from, ?Carbon $to): bool
    {
        if ($at === null) {
            return false;
        }

        if ($from && $at->lt($from)) {
            return false;
        }

        if ($to && $at->gt($to)) {
            return false;
        }

        return true;
    }

    private function sumRows(Collection $rows): array
    {
        return [
            'gross' => (int) $rows->sum('gross'),
            'commission' => (int) $rows->sum('commission'),
            'driver_earnings' => (int) $rows->sum('driver_earnings'),
        ];
    }

    private function groupByService(Collection $rows): array
    {
        return collect(self::SERVICE_LABELS)
            ->map(function (string $label, string $service) use ($rows) {
                $subset = $rows->where('type', $service);
                $totals = $this->sumRows($subset);

                return [
                    'service' => $service,
                    'label' => $label,
                    'count' => $subset->count(),
                    'gross' => $totals['gross'],
                    'commission' => $totals['commission'],
                    'driver_earnings' => $totals['driver_earnings'],
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Single-metric per-service breakdown for a rider/driver's own
     * mini-report — unlike the admin report, a single user only cares about
     * one number per service (what they spent, or what they earned), not
     * the full gross/commission/driver_earnings split.
     */
    private function groupByServiceAmount(Collection $rows, string $field): array
    {
        return collect(self::SERVICE_LABELS)
            ->map(function (string $label, string $service) use ($rows, $field) {
                $subset = $rows->where('type', $service);

                return [
                    'service' => $service,
                    'label' => $label,
                    'count' => $subset->count(),
                    'amount' => (int) $subset->sum($field),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Trip/Dem Légui go straight through their City foreign key; Delivery
     * has no city column at all (only free-text address + lat/lng), so its
     * rows are bucketed to the nearest known City by Haversine distance —
     * the same technique Admin\DashboardController::routes() already uses
     * for delivery "zone coverage".
     */
    private function groupByDestination(Collection $rows): array
    {
        $cities = City::query()
            ->select('id', 'name', 'latitude', 'longitude')
            ->get()
            ->keyBy('id');

        $citiesWithCoords = $cities->filter(fn (City $c) => $c->latitude !== null && $c->longitude !== null);

        $buckets = [];

        foreach ($rows as $row) {
            $cityName = null;

            if ($row->destination_city_id !== null) {
                $cityName = $cities->get($row->destination_city_id)?->name;
            } elseif ($row->destination_lat !== null && $row->destination_lng !== null && $citiesWithCoords->isNotEmpty()) {
                $nearest = $citiesWithCoords->sortBy(fn (City $c) => Geo::haversineKm(
                    (float) $row->destination_lat,
                    (float) $row->destination_lng,
                    (float) $c->latitude,
                    (float) $c->longitude,
                ))->first();
                $cityName = $nearest?->name;
            }

            $cityName ??= 'Non déterminée';

            $buckets[$cityName] ??= ['count' => 0, 'gross' => 0, 'commission' => 0, 'driver_earnings' => 0];
            $buckets[$cityName]['count']++;
            $buckets[$cityName]['gross'] += $row->gross;
            $buckets[$cityName]['commission'] += $row->commission;
            $buckets[$cityName]['driver_earnings'] += $row->driver_earnings;
        }

        return collect($buckets)
            ->map(fn (array $totals, string $city) => array_merge(['city' => $city], $totals))
            ->sortByDesc('gross')
            ->take(15)
            ->values()
            ->all();
    }

    /**
     * "Flotte" here means vehicle category (Trip::ride_type: standard/
     * comfort/xl) — the only structured vehicle-grouping dimension that
     * exists platform-wide (see class doc on why: no fleet/operator concept
     * exists in this codebase, and only Trip carries a ride_type at all).
     */
    private function groupByRideType(Collection $rows): array
    {
        $labels = [
            Trip::RIDE_TYPE_STANDARD => 'Standard',
            Trip::RIDE_TYPE_COMFORT => 'Confort',
            Trip::RIDE_TYPE_XL => 'XL',
        ];

        return collect($labels)
            ->map(function (string $label, string $rideType) use ($rows) {
                $subset = $rows->where('type', self::SERVICE_TRIP)->where('ride_type', $rideType);
                $totals = $this->sumRows($subset);

                return [
                    'ride_type' => $rideType,
                    'label' => $label,
                    'count' => $subset->count(),
                    'gross' => $totals['gross'],
                    'commission' => $totals['commission'],
                    'driver_earnings' => $totals['driver_earnings'],
                ];
            })
            ->values()
            ->all();
    }

    private function groupByDriver(Collection $rows, int $limit = 20): array
    {
        $byDriver = $rows->groupBy('driver_id');
        $drivers = User::query()->whereIn('id', $byDriver->keys())->get(['id', 'name', 'phone'])->keyBy('id');

        return $byDriver
            ->map(function (Collection $subset, int $driverId) use ($drivers) {
                $totals = $this->sumRows($subset);
                $driver = $drivers->get($driverId);

                return [
                    'driver_id' => $driverId,
                    'name' => $driver?->name,
                    'phone' => $driver?->phone,
                    'count' => $subset->count(),
                    'gross' => $totals['gross'],
                    'commission' => $totals['commission'],
                    'driver_earnings' => $totals['driver_earnings'],
                ];
            })
            ->sortByDesc('driver_earnings')
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * A driver's own cars are their "flotte" — Delivery/Anando rows carry
     * no car_id (deliveries aren't assigned a specific vehicle, Anando is
     * peer-to-peer with only free-text vehicle_info), so those fall under
     * an explicit "no vehicle assigned" bucket rather than being dropped.
     */
    private function groupByCar(Collection $rows, User $driver): array
    {
        $cars = $driver->cars()->get(['id', 'make', 'model', 'plate_number'])->keyBy('id');

        $byCar = $rows->groupBy(fn ($row) => $row->car_id ?? 'none');

        return $byCar
            ->map(function (Collection $subset, $carId) use ($cars) {
                $totals = $this->sumRows($subset);
                $car = $carId !== 'none' ? $cars->get($carId) : null;

                return [
                    'car_id' => $carId !== 'none' ? (int) $carId : null,
                    'label' => $car ? trim("{$car->make} {$car->model} · {$car->plate_number}") : 'Sans véhicule assigné',
                    'count' => $subset->count(),
                    'earnings' => $totals['driver_earnings'],
                ];
            })
            ->sortByDesc('earnings')
            ->values()
            ->all();
    }

    /**
     * Buckets rows into a compact, human-labeled timeline — daily for a
     * week, weekly for a month, monthly for a year — so "mini" reports stay
     * a handful of rows instead of dumping 30 daily bars on a profile page.
     */
    private function groupByPeriod(Collection $rows, Carbon $from, Carbon $to, string $bucket, string $sumField): array
    {
        $buckets = [];
        $cursor = $from->copy();

        while ($cursor->lte($to)) {
            $bucketEnd = match ($bucket) {
                'week' => $cursor->copy()->endOfWeek(),
                'month' => $cursor->copy()->endOfMonth(),
                default => $cursor->copy()->endOfDay(),
            };
            $bucketEnd = $bucketEnd->min($to);

            $label = match ($bucket) {
                'week' => $cursor->translatedFormat('d M'),
                'month' => $cursor->translatedFormat('M Y'),
                default => $cursor->translatedFormat('d M'),
            };

            $buckets[] = [
                'label' => $label,
                'from' => $cursor->copy(),
                'to' => $bucketEnd,
                'amount' => 0,
                'count' => 0,
            ];

            $cursor = match ($bucket) {
                'week' => $cursor->addWeek()->startOfWeek(),
                'month' => $cursor->addMonthNoOverflow()->startOfMonth(),
                default => $cursor->addDay(),
            };
        }

        foreach ($rows as $row) {
            foreach ($buckets as &$b) {
                if ($row->completed_at && $row->completed_at->between($b['from'], $b['to'])) {
                    $b['amount'] += $row->{$sumField};
                    $b['count']++;
                    break;
                }
            }
        }
        unset($b);

        return array_map(fn (array $b) => ['label' => $b['label'], 'amount' => $b['amount'], 'count' => $b['count']], $buckets);
    }
}
