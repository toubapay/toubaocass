<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\DriverProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemLeguiTripManagementTest extends TestCase
{
    use RefreshDatabase;

    private function createTrip(User $driver, Car $car, array $overrides = []): DemLeguiTrip
    {
        return DemLeguiTrip::create(array_merge([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'destination_city_id' => City::factory()->create()->id,
            'total_seats' => $car->seats,
            'available_seats' => $car->seats,
            'price_per_seat' => 1000,
            'status' => DemLeguiTrip::STATUS_OPEN,
        ], $overrides));
    }

    public function test_admin_can_list_dem_legui_trips_with_driver_car_and_client_info(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        $trip = $this->createTrip($driver, $car);
        $rider = User::factory()->create();
        DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'dem_legui_trip_id' => $trip->id, 'status' => DemLeguiRequest::STATUS_MATCHED]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dem-legui-trips')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $response->assertJsonPath('data.0.driver.phone', $driver->phone);
        $response->assertJsonPath('data.0.car.plate_number', $car->plate_number);
        $response->assertJsonPath('data.0.requests.0.rider.phone', $rider->phone);
    }

    public function test_admin_without_permission_cannot_list_dem_legui_trips(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_ACCOUNTANT)->create();

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dem-legui-trips')->assertForbidden();
    }

    public function test_admin_can_cancel_a_dem_legui_trip_and_refund_matched_wallet_riders(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        $trip = $this->createTrip($driver, $car, ['available_seats' => $car->seats - 1]);
        $rider = User::factory()->create();
        $matchedRequest = DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'dem_legui_trip_id' => $trip->id,
            'status' => DemLeguiRequest::STATUS_MATCHED,
            'payment_method' => DemLeguiRequest::PAYMENT_METHOD_WALLET,
            'fare_total' => 1500,
        ]);

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/dem-legui-trips/{$trip->id}/cancel")
            ->assertOk()
            ->assertJsonPath('status', 'cancelled');

        $this->assertDatabaseHas('dem_legui_trips', ['id' => $trip->id, 'status' => DemLeguiTrip::STATUS_CANCELLED]);
        $this->assertDatabaseHas('dem_legui_requests', ['id' => $matchedRequest->id, 'status' => DemLeguiRequest::STATUS_CANCELLED]);
        $this->assertDatabaseHas('wallets', ['user_id' => $rider->id, 'balance' => 1500]);
        $this->assertDatabaseHas('audit_logs', ['admin_id' => $admin->id, 'action' => 'dem_legui_trip.cancel']);
    }

    public function test_admin_cannot_cancel_an_already_completed_dem_legui_trip(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        $trip = $this->createTrip($driver, $car, ['status' => DemLeguiTrip::STATUS_COMPLETED]);

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/dem-legui-trips/{$trip->id}/cancel")
            ->assertStatus(422);

        $this->assertDatabaseHas('dem_legui_trips', ['id' => $trip->id, 'status' => DemLeguiTrip::STATUS_COMPLETED]);
    }

    public function test_admin_can_reassign_an_open_dem_legui_trip_to_a_driver_with_enough_seats(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id, 'seats' => 4]);
        $trip = $this->createTrip($driver, $car, ['total_seats' => 4, 'available_seats' => 2]);

        $newDriver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $newDriver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);
        $newCar = Car::factory()->create(['driver_id' => $newDriver->id, 'is_active' => true, 'seats' => 6]);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/dem-legui-trips/{$trip->id}/driver", ['driver_id' => $newDriver->id])
            ->assertOk()
            ->assertJsonPath('driver.id', $newDriver->id);

        $this->assertDatabaseHas('dem_legui_trips', [
            'id' => $trip->id,
            'driver_id' => $newDriver->id,
            'car_id' => $newCar->id,
            'total_seats' => 6,
            'available_seats' => 4,
        ]);
    }

    public function test_admin_cannot_reassign_to_a_driver_whose_car_is_too_small(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id, 'seats' => 4]);
        $trip = $this->createTrip($driver, $car, ['total_seats' => 4, 'available_seats' => 1]);

        $newDriver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $newDriver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);
        Car::factory()->create(['driver_id' => $newDriver->id, 'is_active' => true, 'seats' => 2]);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/dem-legui-trips/{$trip->id}/driver", ['driver_id' => $newDriver->id])
            ->assertStatus(422);
    }

    public function test_admin_cannot_reassign_a_dem_legui_trip_already_in_progress(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        $trip = $this->createTrip($driver, $car, ['status' => DemLeguiTrip::STATUS_IN_PROGRESS]);

        $newDriver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $newDriver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);
        Car::factory()->create(['driver_id' => $newDriver->id, 'is_active' => true]);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/dem-legui-trips/{$trip->id}/driver", ['driver_id' => $newDriver->id])
            ->assertStatus(422);
    }
}
