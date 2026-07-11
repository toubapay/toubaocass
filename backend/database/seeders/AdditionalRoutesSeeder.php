<?php

namespace Database\Seeders;

use App\Models\Car;
use App\Models\City;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Additional demo routes covering more of the country (and one cross-border
 * route to Nouakchott), all with future departure dates. Idempotent: skips
 * entirely once its driver already exists (identified by phone), so
 * re-running on every deploy doesn't pile up duplicates.
 */
class AdditionalRoutesSeeder extends Seeder
{
    public function run(): void
    {
        $driver = User::firstOrCreate(
            ['phone' => '+221783334455', 'role' => 'driver'],
            ['name' => 'Moussa Ndiaye', 'phone_verified_at' => now()],
        );

        if (! $driver->wasRecentlyCreated) {
            return;
        }

        DriverProfile::create([
            'user_id' => $driver->id,
            'license_number' => 'LIC-90114',
            'license_expiry' => now()->addYears(3),
            'national_id_number' => '1197700998877',
            'kyc_status' => DriverProfile::STATUS_APPROVED,
            'rating' => 4.6,
            'approved_at' => now(),
        ]);

        $car = Car::create([
            'driver_id' => $driver->id,
            'type' => 'suv',
            'make' => 'Toyota',
            'model' => 'Land Cruiser',
            'year' => 2021,
            'color' => 'Noir',
            'plate_number' => 'DK-2290-CC',
            'seats' => 7,
            'is_active' => true,
        ]);

        $names = [
            'Saint-Louis', 'Dakar', 'Tambacounda', 'Fatick', 'Kaolack', 'Linguère',
            'Tivaouane', 'Matam', 'Ziguinchor', 'Sédhiou', 'Koungheul', 'Kédougou',
            'Nouakchott',
        ];
        $cities = City::whereIn('name', $names)->get()->keyBy('name');

        // Approximate town-center coordinates for the departure pin — mirrors
        // the city coordinates in DatabaseSeeder.
        $coords = [
            'Saint-Louis' => [16.0326, -16.4818],
            'Dakar' => [14.6928, -17.4467],
            'Tambacounda' => [13.7671, -13.6681],
            'Kaolack' => [14.1825, -16.0728],
            'Tivaouane' => [14.9500, -16.8167],
            'Ziguinchor' => [12.5833, -16.2719],
            'Koungheul' => [13.9833, -14.8000],
        ];

        $makeTrip = function (string $originName, string $destinationName, array $attrs) use ($cities, $coords, $driver, $car) {
            $origin = $cities[$originName];
            $destination = $cities[$destinationName];
            [$lat, $lng] = $coords[$originName];

            Trip::create([
                'driver_id' => $driver->id,
                'car_id' => $car->id,
                'origin_city_id' => $origin->id,
                'destination_city_id' => $destination->id,
                'departure_date' => $attrs['date'],
                'departure_time' => $attrs['time'],
                'fare' => $attrs['fare'],
                'ride_type' => $attrs['ride_type'],
                'total_seats' => $attrs['total_seats'],
                'available_seats' => $attrs['available_seats'],
                'status' => Trip::STATUS_SCHEDULED,
                'notes' => $attrs['notes'] ?? null,
                'departure_latitude' => $lat,
                'departure_longitude' => $lng,
                'departure_address' => "Gare routière, {$originName}",
            ]);
        };

        $makeTrip('Saint-Louis', 'Dakar', [
            'date' => now()->addDay()->toDateString(), 'time' => '07:30',
            'fare' => 4000, 'ride_type' => 'standard', 'total_seats' => 7, 'available_seats' => 7,
        ]);
        $makeTrip('Tambacounda', 'Fatick', [
            'date' => now()->addDays(2)->toDateString(), 'time' => '08:00',
            'fare' => 6000, 'ride_type' => 'comfort', 'total_seats' => 7, 'available_seats' => 5,
        ]);
        $makeTrip('Kaolack', 'Linguère', [
            'date' => now()->addDays(3)->toDateString(), 'time' => '09:30',
            'fare' => 4500, 'ride_type' => 'standard', 'total_seats' => 7, 'available_seats' => 7,
        ]);
        $makeTrip('Tivaouane', 'Matam', [
            'date' => now()->addDays(4)->toDateString(), 'time' => '06:00',
            'fare' => 7500, 'ride_type' => 'xl', 'total_seats' => 7, 'available_seats' => 3,
        ]);
        $makeTrip('Ziguinchor', 'Sédhiou', [
            'date' => now()->addDays(2)->toDateString(), 'time' => '14:00',
            'fare' => 2500, 'ride_type' => 'standard', 'total_seats' => 7, 'available_seats' => 6,
        ]);
        $makeTrip('Koungheul', 'Kédougou', [
            'date' => now()->addDays(5)->toDateString(), 'time' => '10:00',
            'fare' => 5000, 'ride_type' => 'comfort', 'total_seats' => 7, 'available_seats' => 7,
        ]);
        $makeTrip('Dakar', 'Nouakchott', [
            'date' => now()->addDays(6)->toDateString(), 'time' => '05:00',
            'fare' => 15000, 'ride_type' => 'xl', 'total_seats' => 7, 'available_seats' => 7,
            'notes' => 'Trajet international — pièce d\'identité et passeport requis.',
        ]);
    }
}
