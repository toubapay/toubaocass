<?php

namespace Database\Seeders;

use App\Models\Car;
use App\Models\City;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Test/demo trips for the Touba<->Dakar, Thiès->Touba, and Louga->Dakar
 * routes, with varied dates, times, fares, ride types, and seat
 * availability so the search/filter/map/fill-state UI all have something
 * realistic to show. Idempotent: skips entirely once a driver already
 * exists (identified by phone), so re-running on every deploy doesn't
 * pile up duplicates — but also means dates won't refresh after the
 * first successful run.
 */
class TestRoutesSeeder extends Seeder
{
    public function run(): void
    {
        $dakar = City::where('name', 'Dakar')->firstOrFail();
        $touba = City::where('name', 'Touba')->firstOrFail();
        $thies = City::where('name', 'Thiès')->firstOrFail();
        $louga = City::where('name', 'Louga')->firstOrFail();

        // Approximate town-center coordinates, used for the trips map.
        $coords = [
            'Dakar' => [14.6928, -17.4467, "Place de l'Indépendance, Dakar"],
            'Touba' => [14.8500, -15.8833, 'Gare routière, Touba'],
            'Thiès' => [14.7910, -16.9359, 'Gare routière, Thiès'],
            'Louga' => [15.6173, -16.2240, 'Gare routière, Louga'],
        ];

        $driverA = User::firstOrCreate(
            ['phone' => '+221781112233', 'role' => 'driver'],
            ['name' => 'Ibrahima Sarr', 'phone_verified_at' => now()],
        );

        if (! $driverA->wasRecentlyCreated) {
            return;
        }

        DriverProfile::create([
            'user_id' => $driverA->id,
            'license_number' => 'LIC-55210',
            'license_expiry' => now()->addYears(3),
            'national_id_number' => '1199200456789',
            'kyc_status' => DriverProfile::STATUS_APPROVED,
            'rating' => 4.7,
            'approved_at' => now(),
        ]);

        $carA = Car::create([
            'driver_id' => $driverA->id,
            'type' => 'sedan',
            'make' => 'Toyota',
            'model' => 'Corolla',
            'year' => 2019,
            'color' => 'Gris',
            'plate_number' => 'TH-4471-AA',
            'seats' => 4,
            'is_active' => true,
        ]);

        $driverB = User::create([
            'name' => 'Fatou Diagne',
            'phone' => '+221782223344',
            'role' => 'driver',
            'phone_verified_at' => now(),
        ]);

        DriverProfile::create([
            'user_id' => $driverB->id,
            'license_number' => 'LIC-77304',
            'license_expiry' => now()->addYears(2),
            'national_id_number' => '1198800112233',
            'kyc_status' => DriverProfile::STATUS_APPROVED,
            'rating' => 4.9,
            'approved_at' => now(),
        ]);

        $carB = Car::create([
            'driver_id' => $driverB->id,
            'type' => 'van',
            'make' => 'Hyundai',
            'model' => 'H1',
            'year' => 2022,
            'color' => 'Blanc',
            'plate_number' => 'LG-8823-BB',
            'seats' => 7,
            'is_active' => true,
        ]);

        $makeTrip = function (array $attrs) use ($coords) {
            $originName = $attrs['origin']->name;
            [$lat, $lng, $address] = $coords[$originName];

            Trip::create([
                'driver_id' => $attrs['driver']->id,
                'car_id' => $attrs['car']->id,
                'origin_city_id' => $attrs['origin']->id,
                'destination_city_id' => $attrs['destination']->id,
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
                'departure_address' => $address,
            ]);
        };

        // Touba -> Dakar
        $makeTrip([
            'driver' => $driverA, 'car' => $carA, 'origin' => $touba, 'destination' => $dakar,
            'date' => now()->addDay()->toDateString(), 'time' => '07:00',
            'fare' => 3500, 'ride_type' => 'standard', 'total_seats' => 4, 'available_seats' => 4,
        ]);
        $makeTrip([
            'driver' => $driverA, 'car' => $carA, 'origin' => $touba, 'destination' => $dakar,
            'date' => now()->addDay()->toDateString(), 'time' => '15:30',
            'fare' => 4000, 'ride_type' => 'comfort', 'total_seats' => 4, 'available_seats' => 1,
        ]);
        $makeTrip([
            'driver' => $driverA, 'car' => $carA, 'origin' => $touba, 'destination' => $dakar,
            'date' => now()->addDays(3)->toDateString(), 'time' => '09:00',
            'fare' => 3500, 'ride_type' => 'standard', 'total_seats' => 4, 'available_seats' => 0,
        ]);
        $makeTrip([
            'driver' => $driverB, 'car' => $carB, 'origin' => $touba, 'destination' => $dakar,
            'date' => now()->addDays(5)->toDateString(), 'time' => '18:00',
            'fare' => 4500, 'ride_type' => 'xl', 'total_seats' => 7, 'available_seats' => 7,
            'notes' => 'Grand véhicule climatisé, bagages acceptés.',
        ]);

        // Thiès -> Touba
        $makeTrip([
            'driver' => $driverA, 'car' => $carA, 'origin' => $thies, 'destination' => $touba,
            'date' => now()->addDay()->toDateString(), 'time' => '10:00',
            'fare' => 2000, 'ride_type' => 'standard', 'total_seats' => 4, 'available_seats' => 3,
        ]);
        $makeTrip([
            'driver' => $driverA, 'car' => $carA, 'origin' => $thies, 'destination' => $touba,
            'date' => now()->addDays(2)->toDateString(), 'time' => '06:30',
            'fare' => 2200, 'ride_type' => 'comfort', 'total_seats' => 4, 'available_seats' => 4,
        ]);
        $makeTrip([
            'driver' => $driverA, 'car' => $carA, 'origin' => $thies, 'destination' => $touba,
            'date' => now()->addDays(4)->toDateString(), 'time' => '16:00',
            'fare' => 2000, 'ride_type' => 'standard', 'total_seats' => 4, 'available_seats' => 1,
        ]);

        // Louga -> Dakar
        $makeTrip([
            'driver' => $driverB, 'car' => $carB, 'origin' => $louga, 'destination' => $dakar,
            'date' => now()->addDay()->toDateString(), 'time' => '08:00',
            'fare' => 4500, 'ride_type' => 'standard', 'total_seats' => 7, 'available_seats' => 7,
        ]);
        $makeTrip([
            'driver' => $driverB, 'car' => $carB, 'origin' => $louga, 'destination' => $dakar,
            'date' => now()->addDays(2)->toDateString(), 'time' => '13:00',
            'fare' => 5000, 'ride_type' => 'comfort', 'total_seats' => 7, 'available_seats' => 4,
        ]);
        $makeTrip([
            'driver' => $driverB, 'car' => $carB, 'origin' => $louga, 'destination' => $dakar,
            'date' => now()->addDays(3)->toDateString(), 'time' => '05:30',
            'fare' => 4500, 'ride_type' => 'standard', 'total_seats' => 4, 'available_seats' => 0,
        ]);
        $makeTrip([
            'driver' => $driverB, 'car' => $carB, 'origin' => $louga, 'destination' => $dakar,
            'date' => now()->addDays(6)->toDateString(), 'time' => '19:00',
            'fare' => 5500, 'ride_type' => 'xl', 'total_seats' => 7, 'available_seats' => 7,
        ]);
        // Departing soon and partially booked, so the "departure flash"
        // alert and the fill-status pill both have something to show
        // immediately without waiting for a specific date.
        $makeTrip([
            'driver' => $driverB, 'car' => $carB, 'origin' => $louga, 'destination' => $dakar,
            'date' => now()->addHours(2)->toDateString(), 'time' => now()->addHours(2)->format('H:i'),
            'fare' => 4500, 'ride_type' => 'standard', 'total_seats' => 7, 'available_seats' => 2,
        ]);
    }
}
