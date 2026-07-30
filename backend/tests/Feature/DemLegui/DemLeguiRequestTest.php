<?php

namespace Tests\Feature\DemLegui;

use App\Events\DemLeguiRequestMatched;
use App\Events\DemLeguiRequestPosted;
use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\DriverProfile;
use App\Models\User;
use App\Notifications\DemLeguiRequestPostedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class DemLeguiRequestTest extends TestCase
{
    use RefreshDatabase;

    private function onlineDriver(array $profileOverrides = []): User
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(array_merge([
            'user_id' => $driver->id,
            'is_online' => true,
            'current_latitude' => 14.69,
            'current_longitude' => -17.44,
        ], $profileOverrides));
        Car::factory()->create(['driver_id' => $driver->id, 'is_active' => true, 'seats' => 4]);

        return $driver;
    }

    public function test_quote_computes_fare_from_distance(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);

        $response = $this->actingAs($rider, 'sanctum')->postJson('/api/dem-legui/requests/quote', [
            'pickup_latitude' => 14.6928,
            'pickup_longitude' => -17.4467,
            'destination_city_id' => $destination->id,
            'seats_requested' => 2,
        ])->assertOk();

        $this->assertGreaterThan(0, $response->json('distance_km'));
        $this->assertEquals($response->json('fare_per_seat') * 2, $response->json('fare_total'));
    }

    public function test_rider_can_create_a_request(): void
    {
        Event::fake();
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);

        $response = $this->actingAs($rider, 'sanctum')->postJson('/api/dem-legui/requests', [
            'pickup_latitude' => 14.6928,
            'pickup_longitude' => -17.4467,
            'pickup_address' => 'Marché Sandaga',
            'destination_city_id' => $destination->id,
            'seats_requested' => 1,
        ])->assertCreated();

        $this->assertDatabaseHas('dem_legui_requests', [
            'rider_id' => $rider->id,
            'status' => DemLeguiRequest::STATUS_PENDING,
        ]);
        $response->assertJsonPath('status', 'pending');
        Event::assertDispatched(DemLeguiRequestPosted::class);
    }

    public function test_request_is_only_notified_to_nearby_online_drivers(): void
    {
        Notification::fake();
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);

        $nearbyOnline = $this->onlineDriver(['current_latitude' => 14.70, 'current_longitude' => -17.43]);
        $nearbyOnline->update(['fcm_token' => 'token-nearby']);

        $farOnline = $this->onlineDriver(['current_latitude' => 16.00, 'current_longitude' => -16.00]);
        $farOnline->update(['fcm_token' => 'token-far']);

        $nearbyOffline = $this->onlineDriver(['is_online' => false, 'current_latitude' => 14.70, 'current_longitude' => -17.43]);
        $nearbyOffline->update(['fcm_token' => 'token-offline']);

        $this->actingAs($rider, 'sanctum')->postJson('/api/dem-legui/requests', [
            'pickup_latitude' => 14.6928,
            'pickup_longitude' => -17.4467,
            'destination_city_id' => $destination->id,
        ])->assertCreated();

        Notification::assertSentTo($nearbyOnline, DemLeguiRequestPostedNotification::class);
        Notification::assertNotSentTo($farOnline, DemLeguiRequestPostedNotification::class);
        Notification::assertNotSentTo($nearbyOffline, DemLeguiRequestPostedNotification::class);
    }

    public function test_offline_driver_cannot_list_available_requests(): void
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'is_online' => false]);

        $this->actingAs($driver, 'sanctum')->getJson('/api/driver/dem-legui/requests')->assertStatus(422);
    }

    public function test_online_driver_only_sees_requests_within_radius(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver(['current_latitude' => 14.6928, 'current_longitude' => -17.4467]);

        $near = DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'destination_city_id' => $destination->id,
            'pickup_latitude' => 14.70,
            'pickup_longitude' => -17.43,
        ]);
        $far = DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'destination_city_id' => $destination->id,
            'pickup_latitude' => 16.50,
            'pickup_longitude' => -16.50,
        ]);

        $response = $this->actingAs($driver, 'sanctum')->getJson('/api/driver/dem-legui/requests')->assertOk();
        $ids = collect($response->json('data'))->pluck('id');

        $this->assertTrue($ids->contains($near->id));
        $this->assertFalse($ids->contains($far->id));
    }

    public function test_two_drivers_cannot_double_accept_the_same_request(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driverA = $this->onlineDriver();
        $driverB = $this->onlineDriver();

        $request = DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'destination_city_id' => $destination->id,
            'status' => DemLeguiRequest::STATUS_PENDING,
        ]);

        $carA = Car::where('driver_id', $driverA->id)->first();
        $carB = Car::where('driver_id', $driverB->id)->first();

        $this->actingAs($driverA, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $carA->id])
            ->assertOk();

        $this->actingAs($driverB, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $carB->id])
            ->assertStatus(422);

        $this->assertEquals(1, DemLeguiTrip::where('driver_id', $driverA->id)->count());
        $this->assertEquals(0, DemLeguiTrip::where('driver_id', $driverB->id)->count());
    }

    public function test_accepting_requires_online_and_kyc_approved_driver(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'is_online' => true, 'kyc_status' => DriverProfile::STATUS_SUBMITTED]);
        $car = Car::factory()->create(['driver_id' => $driver->id, 'is_active' => true]);

        $request = DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'destination_city_id' => $destination->id,
        ]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->assertStatus(422);
    }

    public function test_a_second_compatible_request_joins_the_existing_open_trip(): void
    {
        $riderA = User::factory()->create();
        $riderB = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver();
        $car = Car::where('driver_id', $driver->id)->first();

        $requestA = DemLeguiRequest::factory()->create([
            'rider_id' => $riderA->id,
            'destination_city_id' => $destination->id,
            'seats_requested' => 1,
        ]);
        $requestB = DemLeguiRequest::factory()->create([
            'rider_id' => $riderB->id,
            'destination_city_id' => $destination->id,
            'seats_requested' => 2,
        ]);

        $tripId = $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$requestA->id}/accept", ['car_id' => $car->id])
            ->assertOk()->json('id');

        $response = $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$requestB->id}/accept")
            ->assertOk();

        $this->assertEquals($tripId, $response->json('id'));
        $this->assertEquals(1, DemLeguiTrip::count());
        $this->assertEquals($car->seats - 3, DemLeguiTrip::first()->available_seats);
    }

    public function test_a_request_to_a_different_destination_does_not_join_the_open_trip(): void
    {
        $riderA = User::factory()->create();
        $riderB = User::factory()->create();
        $destinationA = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $destinationB = City::factory()->create(['latitude' => 12.58, 'longitude' => -16.27]);
        $driver = $this->onlineDriver();
        $car = Car::where('driver_id', $driver->id)->first();

        $requestA = DemLeguiRequest::factory()->create(['rider_id' => $riderA->id, 'destination_city_id' => $destinationA->id, 'seats_requested' => 1]);
        $requestB = DemLeguiRequest::factory()->create(['rider_id' => $riderB->id, 'destination_city_id' => $destinationB->id, 'seats_requested' => 1]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$requestA->id}/accept", ['car_id' => $car->id])
            ->assertOk();

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$requestB->id}/accept", ['car_id' => $car->id])
            ->assertOk();

        $this->assertEquals(2, DemLeguiTrip::count());
    }

    public function test_accepting_dispatches_matched_event_to_notify_rider(): void
    {
        Event::fake();
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver();
        $car = Car::where('driver_id', $driver->id)->first();

        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->assertOk();

        Event::assertDispatched(DemLeguiRequestMatched::class);
    }

    public function test_start_and_complete_trip_lifecycle_applies_commission(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver();
        $car = Car::where('driver_id', $driver->id)->first();

        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id, 'fare_total' => 1000]);

        $tripId = $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->json('id');

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/trips/{$tripId}/start")
            ->assertOk()->assertJsonPath('status', 'in_progress');

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/trips/{$tripId}/complete")
            ->assertOk()->assertJsonPath('status', 'completed');

        $request->refresh();
        $this->assertNotNull($request->commission_amount);
        $this->assertEquals(15.00, (float) $request->commission_rate);
    }

    public function test_driver_can_report_live_position_only_while_trip_in_progress(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver();
        $car = Car::where('driver_id', $driver->id)->first();

        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id]);
        $tripId = $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->json('id');

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/trips/{$tripId}/location", ['latitude' => 14.7, 'longitude' => -17.4])
            ->assertStatus(422);

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/dem-legui/trips/{$tripId}/start")->assertOk();

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/trips/{$tripId}/location", ['latitude' => 14.7, 'longitude' => -17.4])
            ->assertOk();

        $this->assertDatabaseHas('dem_legui_trips', ['id' => $tripId, 'current_latitude' => 14.7, 'current_longitude' => -17.4]);
    }

    public function test_rider_can_cancel_a_pending_request(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id]);

        $this->actingAs($rider, 'sanctum')
            ->deleteJson("/api/dem-legui/requests/{$request->id}")
            ->assertOk();

        $this->assertDatabaseHas('dem_legui_requests', ['id' => $request->id, 'status' => DemLeguiRequest::STATUS_CANCELLED]);
    }

    public function test_cancelling_a_wallet_paid_matched_request_refunds_rider_and_frees_seats(): void
    {
        $rider = User::factory()->create();
        $rider->wallet()->create(['balance' => 5000]);
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver();
        $driver->wallet()->create(['balance' => 0]);
        $car = Car::where('driver_id', $driver->id)->first();

        $request = DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'destination_city_id' => $destination->id,
            'payment_method' => DemLeguiRequest::PAYMENT_METHOD_WALLET,
            'fare_total' => 1000,
            'seats_requested' => 1,
        ]);

        $tripId = $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->json('id');

        $this->assertEquals(4000, $rider->wallet->fresh()->balance);
        $this->assertEquals(1000, $driver->wallet->fresh()->balance);

        $this->actingAs($rider, 'sanctum')
            ->deleteJson("/api/dem-legui/requests/{$request->id}")
            ->assertOk();

        $this->assertEquals(5000, $rider->wallet->fresh()->balance);
        $this->assertEquals(0, $driver->wallet->fresh()->balance);
        $this->assertEquals($car->seats, DemLeguiTrip::find($tripId)->available_seats);
    }

    public function test_cancelling_after_trip_started_is_rejected(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver();
        $car = Car::where('driver_id', $driver->id)->first();

        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id]);
        $tripId = $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->json('id');

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/dem-legui/trips/{$tripId}/start")->assertOk();

        $this->actingAs($rider, 'sanctum')
            ->deleteJson("/api/dem-legui/requests/{$request->id}")
            ->assertStatus(422);
    }

    public function test_rider_cannot_view_another_riders_request(): void
    {
        $rider = User::factory()->create();
        $stranger = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id]);

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/dem-legui/requests/{$request->id}")
            ->assertNotFound();
    }

    public function test_pending_request_has_no_eta_and_matched_request_does(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver(['current_latitude' => 14.70, 'current_longitude' => -17.43]);
        $car = Car::where('driver_id', $driver->id)->first();

        $request = DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'destination_city_id' => $destination->id,
            'pickup_latitude' => 14.6928,
            'pickup_longitude' => -17.4467,
        ]);

        $this->actingAs($rider, 'sanctum')
            ->getJson("/api/dem-legui/requests/{$request->id}")
            ->assertOk()
            ->assertJsonPath('eta_minutes', null);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->assertOk();

        $response = $this->actingAs($rider, 'sanctum')
            ->getJson("/api/dem-legui/requests/{$request->id}")
            ->assertOk();

        $this->assertIsInt($response->json('eta_minutes'));
        $this->assertGreaterThan(0, $response->json('eta_minutes'));
    }

    public function test_nearby_drivers_endpoint_is_anonymized_and_radius_filtered(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);

        $request = DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'destination_city_id' => $destination->id,
            'pickup_latitude' => 14.6928,
            'pickup_longitude' => -17.4467,
        ]);

        $this->onlineDriver(['current_latitude' => 14.70, 'current_longitude' => -17.43]);
        $this->onlineDriver(['current_latitude' => 16.50, 'current_longitude' => -16.50]);

        $response = $this->actingAs($rider, 'sanctum')
            ->getJson("/api/dem-legui/requests/{$request->id}/nearby-drivers")
            ->assertOk();

        $drivers = $response->json('drivers');
        $this->assertCount(1, $drivers);
        $this->assertArrayHasKey('latitude', $drivers[0]);
        $this->assertArrayNotHasKey('name', $drivers[0]);
        $this->assertArrayNotHasKey('phone', $drivers[0]);
    }

    public function test_stranger_cannot_view_nearby_drivers_for_someone_elses_request(): void
    {
        $rider = User::factory()->create();
        $stranger = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id]);

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/dem-legui/requests/{$request->id}/nearby-drivers")
            ->assertNotFound();
    }

    public function test_rider_cannot_create_a_second_request_while_one_is_pending(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id]);

        $this->actingAs($rider, 'sanctum')->postJson('/api/dem-legui/requests', [
            'pickup_latitude' => 14.6928,
            'pickup_longitude' => -17.4467,
            'destination_city_id' => $destination->id,
        ])->assertStatus(422);

        $this->assertEquals(1, DemLeguiRequest::where('rider_id', $rider->id)->count());
    }

    public function test_rider_cannot_create_a_second_request_while_matched_to_an_unfinished_trip(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver();
        $car = Car::where('driver_id', $driver->id)->first();

        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id]);
        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->assertOk();

        $this->actingAs($rider, 'sanctum')->postJson('/api/dem-legui/requests', [
            'pickup_latitude' => 14.6928,
            'pickup_longitude' => -17.4467,
            'destination_city_id' => $destination->id,
        ])->assertStatus(422);
    }

    public function test_rider_can_create_a_new_request_after_cancelling_the_previous_one(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id]);

        $this->actingAs($rider, 'sanctum')->deleteJson("/api/dem-legui/requests/{$request->id}")->assertOk();

        $this->actingAs($rider, 'sanctum')->postJson('/api/dem-legui/requests', [
            'pickup_latitude' => 14.6928,
            'pickup_longitude' => -17.4467,
            'destination_city_id' => $destination->id,
        ])->assertCreated();
    }

    public function test_rider_can_create_a_new_request_after_previous_trip_completed(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver();
        $car = Car::where('driver_id', $driver->id)->first();

        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id]);
        $tripId = $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->json('id');

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/dem-legui/trips/{$tripId}/start")->assertOk();
        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/dem-legui/trips/{$tripId}/complete")->assertOk();

        $this->actingAs($rider, 'sanctum')->postJson('/api/dem-legui/requests', [
            'pickup_latitude' => 14.6928,
            'pickup_longitude' => -17.4467,
            'destination_city_id' => $destination->id,
        ])->assertCreated();
    }

    public function test_my_active_request_is_null_when_rider_has_none(): void
    {
        $rider = User::factory()->create();

        $this->actingAs($rider, 'sanctum')
            ->getJson('/api/dem-legui/requests/mine/active')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_my_active_request_returns_pending_request(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id]);

        $this->actingAs($rider, 'sanctum')
            ->getJson('/api/dem-legui/requests/mine/active')
            ->assertOk()
            ->assertJsonPath('data.id', $request->id)
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_my_active_request_returns_matched_request_with_eta_and_ignores_completed_trips(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver(['current_latitude' => 14.70, 'current_longitude' => -17.43]);
        $car = Car::where('driver_id', $driver->id)->first();

        $request = DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'destination_city_id' => $destination->id,
            'pickup_latitude' => 14.6928,
            'pickup_longitude' => -17.4467,
        ]);

        $tripId = $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->json('id');

        $response = $this->actingAs($rider, 'sanctum')
            ->getJson('/api/dem-legui/requests/mine/active')
            ->assertOk();

        $this->assertEquals($request->id, $response->json('data.id'));
        $this->assertIsInt($response->json('data.eta_minutes'));

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/dem-legui/trips/{$tripId}/start")->assertOk();
        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/dem-legui/trips/{$tripId}/complete")->assertOk();

        $this->actingAs($rider, 'sanctum')
            ->getJson('/api/dem-legui/requests/mine/active')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_rider_and_matched_driver_can_chat_but_a_stranger_cannot(): void
    {
        $rider = User::factory()->create();
        $stranger = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver();
        $car = Car::where('driver_id', $driver->id)->first();

        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id]);

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/dem-legui/requests/{$request->id}/messages", ['body' => 'Bonjour'])
            ->assertForbidden();

        // Before a match, the driver has no relation to the request yet.
        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/dem-legui/requests/{$request->id}/messages", ['body' => 'Bonjour'])
            ->assertForbidden();

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->assertOk();

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/dem-legui/requests/{$request->id}/messages", ['body' => 'Je suis en bas.'])
            ->assertCreated()
            ->assertJsonPath('body', 'Je suis en bas.');

        $response = $this->actingAs($driver, 'sanctum')
            ->getJson("/api/dem-legui/requests/{$request->id}/messages")
            ->assertOk();

        $this->assertCount(1, $response->json());

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/dem-legui/requests/{$request->id}/messages")
            ->assertForbidden();
    }

    public function test_rider_can_list_their_own_request_history(): void
    {
        $rider = User::factory()->create();
        $stranger = User::factory()->create();
        $destination = City::factory()->create();

        DemLeguiRequest::factory()->count(2)->create([
            'rider_id' => $rider->id,
            'destination_city_id' => $destination->id,
            'status' => DemLeguiRequest::STATUS_CANCELLED,
        ]);
        DemLeguiRequest::factory()->create([
            'rider_id' => $stranger->id,
            'destination_city_id' => $destination->id,
        ]);

        $response = $this->actingAs($rider, 'sanctum')
            ->getJson('/api/dem-legui/requests/mine')
            ->assertOk();

        $this->assertCount(2, $response->json('data'));
    }

    public function test_driver_can_mark_arrived_at_pickup_while_trip_is_open(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver();
        $car = Car::where('driver_id', $driver->id)->first();

        $request = DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'destination_city_id' => $destination->id,
            'status' => DemLeguiRequest::STATUS_PENDING,
        ]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->assertOk();

        $trip = DemLeguiTrip::where('driver_id', $driver->id)->firstOrFail();

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/trips/{$trip->id}/arrived")
            ->assertOk()
            ->assertJsonPath('id', $trip->id);

        $trip->refresh();
        $this->assertNotNull($trip->arrived_at);
    }

    public function test_only_the_owning_driver_can_mark_arrived_at_pickup(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver();
        $car = Car::where('driver_id', $driver->id)->first();
        $stranger = $this->onlineDriver();

        $request = DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'destination_city_id' => $destination->id,
            'status' => DemLeguiRequest::STATUS_PENDING,
        ]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->assertOk();

        $trip = DemLeguiTrip::where('driver_id', $driver->id)->firstOrFail();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/driver/dem-legui/trips/{$trip->id}/arrived")
            ->assertNotFound();
    }

    public function test_arrived_at_pickup_cannot_be_marked_once_trip_is_in_progress(): void
    {
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver();
        $car = Car::where('driver_id', $driver->id)->first();

        $request = DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'destination_city_id' => $destination->id,
            'status' => DemLeguiRequest::STATUS_PENDING,
        ]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->assertOk();

        $trip = DemLeguiTrip::where('driver_id', $driver->id)->firstOrFail();

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/trips/{$trip->id}/start")
            ->assertOk();

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/trips/{$trip->id}/arrived")
            ->assertUnprocessable();
    }
}
