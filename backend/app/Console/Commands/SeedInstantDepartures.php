<?php

namespace App\Console\Commands;

use App\Events\InstantTripPosted;
use App\Http\Controllers\Api\TripController;
use App\Models\Car;
use App\Models\City;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Models\User;
use App\Support\Geo;
use Illuminate\Console\Command;

/**
 * Demo/test-data command for the "Instant Post" feature: posts a handful of
 * is_instant trips departing right now (using the same grace window as the
 * real driver-facing endpoint), so the instant-departures banner and list
 * have something to show without a driver posting one live.
 */
class SeedInstantDepartures extends Command
{
    protected $signature = 'trips:seed-instant-departures {--count=5 : Number of instant trips to create} {--notify : Dispatch InstantTripPosted so registered riders are actually notified}';

    protected $description = 'Seed a handful of instant ("leaving now") trips for testing the Instant Post feature';

    /** @var array<int, array{name: string, phone: string, license: string, national_id: string, car: array{type: string, make: string, model: string, plate: string, seats: int}}> */
    private const DRIVERS = [
        ['name' => 'Modou Ba', 'phone' => '+221770009101', 'license' => 'LIC-IN-0001', 'national_id' => '1198500910001', 'car' => ['type' => 'sedan', 'make' => 'Toyota', 'model' => 'Yaris', 'plate' => 'DK-9101-AA', 'seats' => 4]],
        ['name' => 'Fatou Diop', 'phone' => '+221770009102', 'license' => 'LIC-IN-0002', 'national_id' => '1198500910002', 'car' => ['type' => 'suv', 'make' => 'Kia', 'model' => 'Sportage', 'plate' => 'DK-9102-AB', 'seats' => 6]],
    ];

    /** Directional city-name pairs likely to already exist from DatabaseSeeder. */
    private const ROUTES = [
        ['origin' => 'Dakar', 'destination' => 'Thiès'],
        ['origin' => 'Thiès', 'destination' => 'Dakar'],
        ['origin' => 'Dakar', 'destination' => 'Mbour'],
        ['origin' => 'Dakar', 'destination' => 'Touba'],
        ['origin' => 'Touba', 'destination' => 'Dakar'],
        ['origin' => 'Kaolack', 'destination' => 'Fatick'],
        ['origin' => 'Saint-Louis', 'destination' => 'Dakar'],
        ['origin' => 'Diourbel', 'destination' => 'Touba'],
    ];

    public function handle(): int
    {
        $count = max(1, (int) $this->option('count'));
        $notify = (bool) $this->option('notify');

        $drivers = collect(self::DRIVERS)->map(fn (array $spec) => $this->driver($spec));

        $routes = collect(self::ROUTES)->take($count);
        $created = 0;
        $driverIndex = 0;

        foreach ($routes as $route) {
            $origin = City::where('name', $route['origin'])->first();
            $destination = City::where('name', $route['destination'])->first();

            if ($origin === null || $destination === null) {
                $this->warn("Ville introuvable, trajet ignoré : {$route['origin']} → {$route['destination']}");

                continue;
            }

            $driver = $drivers[$driverIndex % $drivers->count()];
            $driverIndex++;

            $distanceKm = Geo::haversineKm($origin->latitude, $origin->longitude, $destination->latitude, $destination->longitude);
            $fare = (int) (round((1000 + $distanceKm * 35) / 100) * 100);

            $departsAt = now()->addMinutes(TripController::INSTANT_GRACE_MINUTES);

            $trip = Trip::create([
                'driver_id' => $driver->user->id,
                'car_id' => $driver->car->id,
                'origin_city_id' => $origin->id,
                'destination_city_id' => $destination->id,
                'departure_date' => $departsAt->toDateString(),
                'departure_time' => $departsAt->format('H:i:s'),
                'fare' => $fare,
                'ride_type' => 'standard',
                'total_seats' => $driver->car->seats,
                'available_seats' => $driver->car->seats,
                'status' => Trip::STATUS_SCHEDULED,
                'is_instant' => true,
            ]);

            if ($notify) {
                InstantTripPosted::dispatch($trip);
            }

            $created++;
        }

        $this->info("Départs immédiats créés : {$created}.");

        return self::SUCCESS;
    }

    /** @param array{name: string, phone: string, license: string, national_id: string, car: array{type: string, make: string, model: string, plate: string, seats: int}} $spec */
    private function driver(array $spec): object
    {
        $user = User::firstOrCreate(
            ['phone' => $spec['phone']],
            ['name' => $spec['name'], 'role' => User::ROLE_DRIVER, 'phone_verified_at' => now()],
        );

        DriverProfile::firstOrCreate(
            ['user_id' => $user->id],
            [
                'license_number' => $spec['license'],
                'license_expiry' => now()->addYears(2),
                'national_id_number' => $spec['national_id'],
                'kyc_status' => DriverProfile::STATUS_APPROVED,
                'rating' => 4.7,
                'approved_at' => now(),
            ],
        );

        $car = Car::firstOrCreate(
            ['plate_number' => $spec['car']['plate']],
            [
                'driver_id' => $user->id,
                'type' => $spec['car']['type'],
                'make' => $spec['car']['make'],
                'model' => $spec['car']['model'],
                'year' => 2022,
                'color' => 'Blanc',
                'seats' => $spec['car']['seats'],
                'is_active' => true,
            ],
        );

        return (object) ['user' => $user, 'car' => $car];
    }
}
