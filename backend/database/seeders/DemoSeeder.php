<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo data for taking product screenshots: an approved driver with a car
 * and two posted trips, plus a rider with an existing confirmed booking.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $dakar = City::where('name', 'Dakar')->firstOrFail();
        $touba = City::where('name', 'Touba')->firstOrFail();
        $thies = City::where('name', 'Thiès')->firstOrFail();
        $saintLouis = City::where('name', 'Saint-Louis')->firstOrFail();
        $mbour = City::where('name', 'Mbour')->firstOrFail();

        $driver = User::create([
            'name' => 'Modou Fall',
            'phone' => '+221770000001',
            'role' => 'driver',
            'phone_verified_at' => now(),
        ]);

        DriverProfile::create([
            'user_id' => $driver->id,
            'license_number' => 'LIC-88213',
            'license_expiry' => now()->addYears(2),
            'national_id_number' => '1198500123456',
            'kyc_status' => DriverProfile::STATUS_APPROVED,
            'rating' => 4.8,
            'approved_at' => now(),
        ]);

        $car = Car::create([
            'driver_id' => $driver->id,
            'type' => 'suv',
            'make' => 'Toyota',
            'model' => 'Land Cruiser Prado',
            'year' => 2021,
            'color' => 'White',
            'plate_number' => 'DK-2451-AB',
            'seats' => 6,
            'is_active' => true,
        ]);

        $trip1 = Trip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $dakar->id,
            'destination_city_id' => $touba->id,
            'departure_date' => now()->addDay()->toDateString(),
            'departure_time' => '08:00',
            'fare' => 5000,
            'ride_type' => 'comfort',
            'total_seats' => 6,
            'available_seats' => 4,
            'status' => Trip::STATUS_SCHEDULED,
            'notes' => 'Direct route via the new highway, one stop in Diourbel.',
        ]);

        Trip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $dakar->id,
            'destination_city_id' => $thies->id,
            'departure_date' => now()->addDays(2)->toDateString(),
            'departure_time' => '14:30',
            'fare' => 2000,
            'ride_type' => 'standard',
            'total_seats' => 6,
            'available_seats' => 6,
            'status' => Trip::STATUS_SCHEDULED,
        ]);

        Trip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $dakar->id,
            'destination_city_id' => $saintLouis->id,
            'departure_date' => now()->addDays(3)->toDateString(),
            'departure_time' => '06:00',
            'fare' => 6000,
            'ride_type' => 'xl',
            'total_seats' => 6,
            'available_seats' => 6,
            'status' => Trip::STATUS_SCHEDULED,
        ]);

        // Departing soon (within the "flash" window) and partially booked,
        // so both the fill-status pill and the departure alert have
        // something to show without waiting for a specific date.
        Trip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $dakar->id,
            'destination_city_id' => $mbour->id,
            'departure_date' => now()->addHours(2)->toDateString(),
            'departure_time' => now()->addHours(2)->format('H:i'),
            'fare' => 2500,
            'ride_type' => 'standard',
            'total_seats' => 6,
            'available_seats' => 2,
            'status' => Trip::STATUS_SCHEDULED,
        ]);

        $rider = User::create([
            'name' => 'Awa Ndiaye',
            'phone' => '+221770000002',
            'role' => 'rider',
            'phone_verified_at' => now(),
        ]);

        Booking::create([
            'trip_id' => $trip1->id,
            'rider_id' => $rider->id,
            'seats_booked' => 2,
            'fare_total' => 10000,
            'status' => Booking::STATUS_CONFIRMED,
        ]);
    }
}
