<?php

namespace App\Console\Commands;

use App\Models\Car;
use App\Models\City;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Models\User;
use App\Support\Geo;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * One-off content-seeding command: posts trips from Touba to every regional
 * capital in Senegal, one per day across a fixed date window, using a small
 * pool of demo drivers. Idempotent (skips a trip that already exists for
 * the same driver/route/date/time) so it's safe to re-run.
 */
class SeedToubaRoutes extends Command
{
    protected $signature = 'trips:seed-touba-routes {--end=2026-07-22 : Last departure date (Y-m-d), inclusive}';

    protected $description = 'Seed trips from Touba to every regional capital in Senegal, from today through --end';

    /** @var array<int, array{name: string, phone: string, license: string, national_id: string, car: array{type: string, make: string, model: string, plate: string, seats: int}}> */
    private const DRIVERS = [
        ['name' => 'Ousmane Diagne', 'phone' => '+221770009001', 'license' => 'LIC-TB-0001', 'national_id' => '1198500900001', 'car' => ['type' => 'sedan', 'make' => 'Toyota', 'model' => 'Corolla', 'plate' => 'DB-1001-AA', 'seats' => 4]],
        ['name' => 'Ibrahima Sarr', 'phone' => '+221770009002', 'license' => 'LIC-TB-0002', 'national_id' => '1198500900002', 'car' => ['type' => 'suv', 'make' => 'Hyundai', 'model' => 'Tucson', 'plate' => 'DB-1002-AB', 'seats' => 6]],
        ['name' => 'Cheikh Gueye', 'phone' => '+221770009003', 'license' => 'LIC-TB-0003', 'national_id' => '1198500900003', 'car' => ['type' => 'van', 'make' => 'Renault', 'model' => 'Trafic', 'plate' => 'DB-1003-AC', 'seats' => 8]],
    ];

    /** Regional capitals not already in the cities table — added for completeness. */
    private const MISSING_CITIES = [
        ['name' => 'Kaffrine', 'latitude' => 14.1059, 'longitude' => -15.5341],
        ['name' => 'Kolda', 'latitude' => 12.8939, 'longitude' => -14.9412],
    ];

    private const DEPARTURE_TIMES = ['06:30', '09:00', '13:00', '16:00'];

    private const RIDE_TYPES = ['standard', 'standard', 'comfort'];

    public function handle(): int
    {
        $touba = City::firstOrCreate(['name' => 'Touba'], ['country' => 'Senegal', 'latitude' => 14.85, 'longitude' => -15.8833, 'is_active' => true]);

        foreach (self::MISSING_CITIES as $city) {
            City::firstOrCreate(['name' => $city['name']], ['country' => 'Senegal', 'latitude' => $city['latitude'], 'longitude' => $city['longitude'], 'is_active' => true]);
        }

        $drivers = collect(self::DRIVERS)->map(fn (array $spec) => $this->driver($spec));

        $regionalCapitals = ['Dakar', 'Thiès', 'Diourbel', 'Kaolack', 'Fatick', 'Kaffrine', 'Louga', 'Saint-Louis', 'Matam', 'Tambacounda', 'Kédougou', 'Kolda', 'Sédhiou', 'Ziguinchor'];

        $destinations = City::whereIn('name', $regionalCapitals)->get()->keyBy('name');

        $start = Carbon::today();
        $end = Carbon::parse((string) $this->option('end'))->endOfDay();

        if ($end->lt($start)) {
            $this->error('La date de fin est antérieure à aujourd\'hui.');

            return self::FAILURE;
        }

        $created = 0;
        $skipped = 0;
        $driverIndex = 0;
        $timeIndex = 0;

        foreach ($regionalCapitals as $cityName) {
            $destination = $destinations->get($cityName);

            if ($destination === null) {
                $this->warn("Ville introuvable, ignorée : {$cityName}");

                continue;
            }

            $distanceKm = Geo::haversineKm($touba->latitude, $touba->longitude, $destination->latitude, $destination->longitude);
            $fare = (int) (round((1000 + $distanceKm * 35) / 100) * 100);

            $date = $start->copy();

            while ($date->lte($end)) {
                $driver = $drivers[$driverIndex % $drivers->count()];
                $time = self::DEPARTURE_TIMES[$timeIndex % count(self::DEPARTURE_TIMES)];
                $rideType = self::RIDE_TYPES[$timeIndex % count(self::RIDE_TYPES)];
                $driverIndex++;
                $timeIndex++;

                $exists = Trip::where('driver_id', $driver->user->id)
                    ->where('origin_city_id', $touba->id)
                    ->where('destination_city_id', $destination->id)
                    ->where('departure_date', $date->toDateString())
                    ->where('departure_time', $time)
                    ->exists();

                if ($exists) {
                    $skipped++;
                    $date->addDay();

                    continue;
                }

                Trip::create([
                    'driver_id' => $driver->user->id,
                    'car_id' => $driver->car->id,
                    'origin_city_id' => $touba->id,
                    'destination_city_id' => $destination->id,
                    'departure_date' => $date->toDateString(),
                    'departure_time' => $time,
                    'departure_latitude' => $touba->latitude,
                    'departure_longitude' => $touba->longitude,
                    'departure_address' => 'Gare routière, Touba',
                    'fare' => $fare,
                    'ride_type' => $rideType,
                    'total_seats' => $driver->car->seats,
                    'available_seats' => $driver->car->seats,
                    'status' => Trip::STATUS_SCHEDULED,
                ]);

                $created++;
                $date->addDay();
            }
        }

        $this->info("Trajets créés : {$created}. Déjà existants (ignorés) : {$skipped}.");

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
