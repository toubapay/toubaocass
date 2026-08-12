<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use App\Models\AnandoRide;
use App\Models\AnandoRideBooking;
use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\Delivery;
use App\Models\DriverProfile;
use App\Models\InsurancePolicy;
use App\Models\InsuranceProvider;
use App\Models\Trip;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\DeliveryPricingService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Populates every module (Trip, Anando, Dem Légui, Livraison, Assurance,
 * Wallet) with a handful of accounts and records in a mix of statuses, so
 * each of the five apps (web, rider, driver, driver-web, admin) has
 * something real to click through without manually walking each flow
 * end-to-end first.
 *
 * Not called from DatabaseSeeder::run() — like DemoSeeder, it's meant to be
 * run explicitly on a dev/staging database:
 *
 *   php artisan db:seed --class=TestDataSeeder
 *
 * Requires DatabaseSeeder to have already run (cities + insurance
 * providers must exist).
 *
 * Safe to rerun: the accounts (users/driver profiles/cars/wallets) are
 * created with firstOrCreate(), and module data (trips, bookings, Anando
 * rides, Dem Légui, deliveries, the insurance policy) is only seeded the
 * first time — once the test accounts already exist, rerunning just
 * reprints the credentials table instead of duplicating every record.
 *
 * Login credentials:
 *   - Riders/drivers: phone number below + OTP "123456" (the
 *     OTP_BYPASS_CODE configured in .env for local/dev environments).
 *   - Admin: admin@test.sn / password (apps/admin).
 */
class TestDataSeeder extends Seeder
{
    public function run(): void
    {
        $dakar = City::where('name', 'Dakar')->firstOrFail();
        $touba = City::where('name', 'Touba')->firstOrFail();
        $thies = City::where('name', 'Thiès')->firstOrFail();
        $mbour = City::where('name', 'Mbour')->firstOrFail();
        $saintLouis = City::where('name', 'Saint-Louis')->firstOrFail();
        $kaolack = City::where('name', 'Kaolack')->firstOrFail();

        AdminUser::firstOrCreate(
            ['email' => 'admin@test.sn'],
            [
                'name' => 'Admin Test',
                'password' => Hash::make('password'),
                'role' => AdminUser::ROLE_SUPER_ADMIN,
                'status' => AdminUser::STATUS_ACTIVE,
            ],
        );

        // --- Drivers -------------------------------------------------

        // Fully approved, online, with a car — the "everything works" driver.
        $driver1 = $this->user('Ibrahima Diop', '+221770000010', User::ROLE_DRIVER);
        DriverProfile::firstOrCreate(['user_id' => $driver1->id], [
            'license_number' => 'LIC-10001',
            'license_expiry' => now()->addYears(2),
            'national_id_number' => '1198500100001',
            'kyc_status' => DriverProfile::STATUS_APPROVED,
            'rating' => 4.9,
            'approved_at' => now(),
            'is_online' => true,
            'last_seen_at' => now(),
            'current_latitude' => 14.70,
            'current_longitude' => -17.45,
        ]);
        $car1 = Car::firstOrCreate(['plate_number' => 'DK-1001-AA'], [
            'driver_id' => $driver1->id,
            'type' => 'suv',
            'make' => 'Toyota',
            'model' => 'Land Cruiser Prado',
            'year' => 2021,
            'color' => 'Blanc',
            'seats' => 6,
            'is_active' => true,
        ]);

        // Approved, but offline — second driver for "another driver did X" scenarios.
        $driver2 = $this->user('Cheikh Ba', '+221770000011', User::ROLE_DRIVER);
        DriverProfile::firstOrCreate(['user_id' => $driver2->id], [
            'license_number' => 'LIC-10002',
            'license_expiry' => now()->addYears(3),
            'national_id_number' => '1198500100002',
            'kyc_status' => DriverProfile::STATUS_APPROVED,
            'rating' => 4.6,
            'approved_at' => now(),
        ]);
        $car2 = Car::firstOrCreate(['plate_number' => 'DK-1002-BB'], [
            'driver_id' => $driver2->id,
            'type' => 'sedan',
            'make' => 'Hyundai',
            'model' => 'Accent',
            'year' => 2019,
            'color' => 'Gris',
            'seats' => 4,
            'is_active' => true,
        ]);

        // KYC still under review — for testing the admin KYC queue.
        $driver3 = $this->user('Fatou Sarr', '+221770000012', User::ROLE_DRIVER);
        DriverProfile::firstOrCreate(['user_id' => $driver3->id], [
            'license_number' => 'LIC-10003',
            'license_expiry' => now()->addYear(),
            'national_id_number' => '1198500100003',
            'kyc_status' => DriverProfile::STATUS_SUBMITTED,
        ]);

        // KYC rejected — for testing the rejected-driver banner/flow.
        $driver4 = $this->user('Omar Diallo', '+221770000013', User::ROLE_DRIVER);
        DriverProfile::firstOrCreate(['user_id' => $driver4->id], [
            'license_number' => 'LIC-10004',
            'license_expiry' => now()->addYear(),
            'national_id_number' => '1198500100004',
            'kyc_status' => DriverProfile::STATUS_REJECTED,
            'kyc_rejection_reason' => 'Permis de conduire expiré.',
        ]);

        // --- Riders ----------------------------------------------------

        // Has bookings/history everywhere — the "returning user" account.
        $rider1 = $this->user('Aissatou Ndiaye', '+221770000020', User::ROLE_RIDER);
        // Brand new account with no history — for onboarding/empty-state testing.
        $rider2 = $this->user('Mamadou Sy', '+221770000021', User::ROLE_RIDER);

        // --- Wallets -----------------------------------------------------

        $riderWallet = Wallet::firstOrCreate(['user_id' => $rider1->id], ['balance' => 0]);
        if ($riderWallet->wasRecentlyCreated) {
            $riderWallet->update(['balance' => 25000]);
            WalletTransaction::create([
                'wallet_id' => $riderWallet->id,
                'type' => WalletTransaction::TYPE_TOP_UP,
                'amount' => 25000,
                'description' => 'Recharge de test',
            ]);
        }

        $driverWallet = Wallet::firstOrCreate(['user_id' => $driver1->id], ['balance' => 0]);
        if ($driverWallet->wasRecentlyCreated) {
            $driverWallet->update(['balance' => 18000]);
            WalletTransaction::create([
                'wallet_id' => $driverWallet->id,
                'type' => WalletTransaction::TYPE_EARNING,
                'amount' => 18000,
                'description' => 'Gains de test',
            ]);
        }

        // Everything below (Trip/Anando/Dem Légui/Delivery/Insurance) is
        // plain ::create(), not firstOrCreate() — only safe to run once.
        // Gate it on whether rider1 was actually just created, so rerunning
        // this seeder against a DB that already has the test accounts
        // (e.g. to pick up a code change without a full migrate:fresh)
        // skips straight to reprinting the credentials table instead of
        // duplicating every trip/booking/delivery/etc.
        if (! $rider1->wasRecentlyCreated) {
            $this->command?->warn('Test accounts already exist — skipping module data, only printing credentials.');
            $this->printAccountsTable();

            return;
        }

        // --- Trip (scheduled long-distance rides) -----------------------

        $tripScheduled = Trip::create([
            'driver_id' => $driver1->id,
            'car_id' => $car1->id,
            'origin_city_id' => $dakar->id,
            'destination_city_id' => $touba->id,
            'departure_date' => now()->addDay()->toDateString(),
            'departure_time' => '08:00',
            'fare' => 5000,
            'ride_type' => Trip::RIDE_TYPE_COMFORT,
            'total_seats' => 6,
            'available_seats' => 4,
            'status' => Trip::STATUS_SCHEDULED,
            'notes' => 'Trajet de test — départ direct.',
        ]);
        Booking::create([
            'trip_id' => $tripScheduled->id,
            'rider_id' => $rider1->id,
            'seats_booked' => 2,
            'fare_total' => 10000,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        $tripFull = Trip::create([
            'driver_id' => $driver2->id,
            'car_id' => $car2->id,
            'origin_city_id' => $dakar->id,
            'destination_city_id' => $thies->id,
            'departure_date' => now()->addHours(3)->toDateString(),
            'departure_time' => now()->addHours(3)->format('H:i'),
            'fare' => 2000,
            'ride_type' => Trip::RIDE_TYPE_STANDARD,
            'total_seats' => 4,
            'available_seats' => 0,
            'status' => Trip::STATUS_FULL,
            'is_instant' => true,
        ]);
        Booking::create([
            'trip_id' => $tripFull->id,
            'rider_id' => $rider1->id,
            'seats_booked' => 4,
            'fare_total' => 8000,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        $tripInProgress = Trip::create([
            'driver_id' => $driver1->id,
            'car_id' => $car1->id,
            'origin_city_id' => $dakar->id,
            'destination_city_id' => $saintLouis->id,
            'departure_date' => now()->toDateString(),
            'departure_time' => now()->subHour()->format('H:i'),
            'fare' => 6000,
            'ride_type' => Trip::RIDE_TYPE_XL,
            'total_seats' => 6,
            'available_seats' => 5,
            'status' => Trip::STATUS_IN_PROGRESS,
            'current_latitude' => 15.10,
            'current_longitude' => -16.90,
            'current_location_updated_at' => now(),
        ]);
        Booking::create([
            'trip_id' => $tripInProgress->id,
            'rider_id' => $rider2->id,
            'seats_booked' => 1,
            'fare_total' => 6000,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        $tripCompleted = Trip::create([
            'driver_id' => $driver2->id,
            'car_id' => $car2->id,
            'origin_city_id' => $dakar->id,
            'destination_city_id' => $kaolack->id,
            'departure_date' => now()->subDays(3)->toDateString(),
            'departure_time' => '09:00',
            'fare' => 4500,
            'ride_type' => Trip::RIDE_TYPE_STANDARD,
            'total_seats' => 4,
            'available_seats' => 3,
            'status' => Trip::STATUS_COMPLETED,
        ]);
        Booking::create([
            'trip_id' => $tripCompleted->id,
            'rider_id' => $rider1->id,
            'seats_booked' => 1,
            'fare_total' => 4500,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        Trip::create([
            'driver_id' => $driver1->id,
            'car_id' => $car1->id,
            'origin_city_id' => $dakar->id,
            'destination_city_id' => $mbour->id,
            'departure_date' => now()->subDay()->toDateString(),
            'departure_time' => '07:00',
            'fare' => 2500,
            'ride_type' => Trip::RIDE_TYPE_STANDARD,
            'total_seats' => 6,
            'available_seats' => 6,
            'status' => Trip::STATUS_CANCELLED,
        ]);

        // --- Anando (peer carpool) ---------------------------------------

        $anandoOpen = AnandoRide::create([
            'user_id' => $driver2->id,
            'origin_city_id' => $dakar->id,
            'destination_city_id' => $mbour->id,
            'departure_point' => 'Place de la Nation, Dakar',
            'departure_latitude' => 14.6928,
            'departure_longitude' => -17.4467,
            'departure_at' => now()->addMinutes(45),
            'price_per_seat' => 1500,
            'total_seats' => 4,
            'available_seats' => 3,
            'vehicle_info' => 'Hyundai Accent grise',
            'status' => AnandoRide::STATUS_OPEN,
        ]);
        AnandoRideBooking::create([
            'anando_ride_id' => $anandoOpen->id,
            'user_id' => $rider1->id,
            'seats_booked' => 1,
            'price_total' => 1500,
            'payment_method' => AnandoRideBooking::PAYMENT_METHOD_CASH,
            'status' => AnandoRideBooking::STATUS_CONFIRMED,
        ]);

        $anandoInProgress = AnandoRide::create([
            'user_id' => $driver1->id,
            'origin_city_id' => $dakar->id,
            'destination_city_id' => $thies->id,
            'departure_point' => 'Autoroute à péage, Pikine',
            'departure_at' => now()->subMinutes(20),
            'price_per_seat' => 1000,
            'total_seats' => 6,
            'available_seats' => 4,
            'status' => AnandoRide::STATUS_IN_PROGRESS,
            'started_at' => now()->subMinutes(15),
            'current_latitude' => 14.75,
            'current_longitude' => -17.10,
            'current_location_updated_at' => now(),
        ]);
        AnandoRideBooking::create([
            'anando_ride_id' => $anandoInProgress->id,
            'user_id' => $rider2->id,
            'seats_booked' => 2,
            'price_total' => 2000,
            'payment_method' => AnandoRideBooking::PAYMENT_METHOD_CASH,
            'status' => AnandoRideBooking::STATUS_CONFIRMED,
        ]);

        $anandoCompleted = AnandoRide::create([
            'user_id' => $driver2->id,
            'origin_city_id' => $dakar->id,
            'destination_city_id' => $touba->id,
            'departure_point' => 'Gare routière, Pikine',
            'departure_at' => now()->subDays(2),
            'price_per_seat' => 2500,
            'total_seats' => 4,
            'available_seats' => 3,
            'status' => AnandoRide::STATUS_COMPLETED,
            'started_at' => now()->subDays(2)->addMinutes(10),
            'completed_at' => now()->subDays(2)->addHours(3),
        ]);
        AnandoRideBooking::create([
            'anando_ride_id' => $anandoCompleted->id,
            'user_id' => $rider1->id,
            'seats_booked' => 1,
            'price_total' => 2500,
            'payment_method' => AnandoRideBooking::PAYMENT_METHOD_CASH,
            'status' => AnandoRideBooking::STATUS_CONFIRMED,
        ]);

        // --- Dem Légui (on-demand dispatch) ------------------------------

        $demLeguiTrip = DemLeguiTrip::create([
            'driver_id' => $driver1->id,
            'car_id' => $car1->id,
            'destination_city_id' => $touba->id,
            'total_seats' => $car1->seats,
            'available_seats' => $car1->seats - 1,
            'price_per_seat' => 1500,
            'status' => DemLeguiTrip::STATUS_OPEN,
        ]);
        DemLeguiRequest::create([
            'rider_id' => $rider2->id,
            'pickup_latitude' => 14.71,
            'pickup_longitude' => -17.44,
            'pickup_address' => 'Marché Sandaga, Dakar',
            'destination_city_id' => $touba->id,
            'seats_requested' => 1,
            'fare_total' => 1500,
            'payment_method' => DemLeguiRequest::PAYMENT_METHOD_CASH,
            'status' => DemLeguiRequest::STATUS_MATCHED,
            'dem_legui_trip_id' => $demLeguiTrip->id,
        ]);

        // Still searching for a driver — no trip attached yet.
        DemLeguiRequest::create([
            'rider_id' => $rider1->id,
            'pickup_latitude' => 14.69,
            'pickup_longitude' => -17.45,
            'pickup_address' => 'Corniche Ouest, Dakar',
            'destination_city_id' => $thies->id,
            'seats_requested' => 1,
            'fare_total' => 1200,
            'payment_method' => DemLeguiRequest::PAYMENT_METHOD_WALLET,
            'status' => DemLeguiRequest::STATUS_PENDING,
        ]);

        // --- Livraison (deliveries) --------------------------------------

        $pricing = app(DeliveryPricingService::class);

        $deliveryPending = Delivery::create($this->deliveryData($pricing, [
            'sender_id' => $rider1->id,
            'receiver_name' => 'Boutique Keur Ndiaye',
            'status' => Delivery::STATUS_PENDING,
        ]));

        $deliveryAccepted = Delivery::create($this->deliveryData($pricing, [
            'sender_id' => $rider2->id,
            'driver_id' => $driver2->id,
            'receiver_name' => 'Pharmacie du Plateau',
            'status' => Delivery::STATUS_ACCEPTED,
            'accepted_at' => now()->subMinutes(10),
        ]));

        $deliveryPickedUp = Delivery::create($this->deliveryData($pricing, [
            'sender_id' => $rider1->id,
            'driver_id' => $driver1->id,
            'receiver_name' => 'Atelier Diop Couture',
            'status' => Delivery::STATUS_PICKED_UP,
            'accepted_at' => now()->subMinutes(30),
            'picked_up_at' => now()->subMinutes(15),
            'current_latitude' => 14.70,
            'current_longitude' => -17.42,
            'current_location_updated_at' => now(),
        ]));

        Delivery::create($this->deliveryData($pricing, [
            'sender_id' => $rider2->id,
            'driver_id' => $driver2->id,
            'receiver_name' => 'Cyber Café Liberté',
            'status' => Delivery::STATUS_DELIVERED,
            'accepted_at' => now()->subHours(5),
            'picked_up_at' => now()->subHours(4)->addMinutes(30),
            'delivered_at' => now()->subHours(3),
        ]));

        Delivery::create($this->deliveryData($pricing, [
            'sender_id' => $rider1->id,
            'receiver_name' => 'Librairie Sankoré',
            'status' => Delivery::STATUS_CANCELLED,
            'cancelled_at' => now()->subDay(),
        ]));

        // --- Assurance (insurance) ----------------------------------------

        $provider = InsuranceProvider::first();
        if ($provider) {
            InsurancePolicy::firstOrCreate(['policy_number' => 'POL-TEST0001'], [
                'car_id' => $car1->id,
                'driver_id' => $driver1->id,
                'insurance_provider_id' => $provider->id,
                'coverage_type' => InsurancePolicy::COVERAGE_TIERS_COLLISION,
                'plan_name' => 'Formule tiers collision',
                'annual_premium' => 95000,
                'starts_at' => now()->subMonths(2)->toDateString(),
                'ends_at' => now()->addMonths(10)->toDateString(),
                'status' => InsurancePolicy::STATUS_ACTIVE,
            ]);
        }

        $this->printAccountsTable();
    }

    private function printAccountsTable(): void
    {
        $this->command?->info('Test accounts — phone + OTP "123456" (rider/driver), admin@test.sn / password (admin):');
        $this->command?->table(['Name', 'Role', 'Phone'], [
            ['Ibrahima Diop', 'driver (approved, online, has car)', '+221770000010'],
            ['Cheikh Ba', 'driver (approved, offline, has car)', '+221770000011'],
            ['Fatou Sarr', 'driver (KYC submitted, pending review)', '+221770000012'],
            ['Omar Diallo', 'driver (KYC rejected)', '+221770000013'],
            ['Aissatou Ndiaye', 'rider (has bookings/wallet balance)', '+221770000020'],
            ['Mamadou Sy', 'rider (fresh account)', '+221770000021'],
        ]);
    }

    private function user(string $name, string $phone, string $role): User
    {
        return User::firstOrCreate(
            ['phone' => $phone],
            ['name' => $name, 'role' => $role, 'phone_verified_at' => now()],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function deliveryData(DeliveryPricingService $pricing, array $overrides): array
    {
        $pickupLat = 14.6928;
        $pickupLng = -17.4467;
        $receiverLat = 14.7167;
        $receiverLng = -17.4677;

        $quote = $pricing->quote($pickupLat, $pickupLng, $receiverLat, $receiverLng);

        return array_merge([
            'receiver_phone' => '+221'.random_int(700000000, 779999999),
            'receiver_address_line' => 'Marché Tilène, Dakar',
            'receiver_latitude' => $receiverLat,
            'receiver_longitude' => $receiverLng,
            'pickup_address_line' => "Place de l'Indépendance, Dakar",
            'pickup_latitude' => $pickupLat,
            'pickup_longitude' => $pickupLng,
            'package_type' => Delivery::PACKAGE_TYPE_COLIS_LEGER,
            'distance_km' => $quote['distance_km'],
            'fee' => $quote['fee'],
            'payment_method' => Delivery::PAYMENT_METHOD_CASH,
        ], $overrides);
    }
}
