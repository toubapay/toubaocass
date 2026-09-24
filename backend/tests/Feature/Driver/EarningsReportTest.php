<?php

namespace Tests\Feature\Driver;

use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EarningsReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_reports_net_earnings_by_service_and_by_vehicle_for_the_current_driver_only(): void
    {
        $driver = User::factory()->driver()->create();
        $otherDriver = User::factory()->driver()->create();
        $rider = User::factory()->create();
        $carA = Car::factory()->create(['driver_id' => $driver->id, 'make' => 'Toyota', 'model' => 'Corolla', 'plate_number' => 'DK-1111-AA']);
        $carB = Car::factory()->create(['driver_id' => $driver->id, 'make' => 'Peugeot', 'model' => '308', 'plate_number' => 'DK-2222-BB']);
        [$origin, $destination] = City::factory()->count(2)->create();

        $tripA = Trip::factory()->create([
            'driver_id' => $driver->id, 'car_id' => $carA->id,
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_COMPLETED,
        ]);
        Booking::factory()->create(['trip_id' => $tripA->id, 'rider_id' => $rider->id, 'fare_total' => 4000, 'commission_amount' => 600, 'status' => Booking::STATUS_CONFIRMED]);

        $tripB = Trip::factory()->create([
            'driver_id' => $driver->id, 'car_id' => $carB->id,
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_COMPLETED,
        ]);
        Booking::factory()->create(['trip_id' => $tripB->id, 'rider_id' => $rider->id, 'fare_total' => 2000, 'commission_amount' => 300, 'status' => Booking::STATUS_CONFIRMED]);

        // A different driver's trip must not count.
        $otherTrip = Trip::factory()->create([
            'driver_id' => $otherDriver->id,
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_COMPLETED,
        ]);
        Booking::factory()->create(['trip_id' => $otherTrip->id, 'rider_id' => $rider->id, 'fare_total' => 9000, 'commission_amount' => 1350, 'status' => Booking::STATUS_CONFIRMED]);

        $response = $this->actingAs($driver, 'sanctum')
            ->getJson('/api/driver/earnings-report?range=month')
            ->assertOk();

        $response->assertJsonPath('total_earnings', 3400 + 1700); // (4000-600) + (2000-300)
        $response->assertJsonPath('items_count', 2);

        $byService = collect($response->json('by_service'))->keyBy('service');
        $this->assertSame(3400 + 1700, $byService['trip']['amount']);

        $byVehicle = collect($response->json('by_vehicle'))->keyBy('car_id');
        $this->assertSame(3400, $byVehicle[$carA->id]['earnings']);
        $this->assertSame(1700, $byVehicle[$carB->id]['earnings']);

        $items = collect($response->json('items'));
        $this->assertCount(2, $items);
        $amounts = $items->pluck('amount')->sort()->values()->all();
        $this->assertSame([1700, 3400], $amounts);
        $this->assertTrue($items->every(fn ($item) => $item['counterparty_name'] === $rider->name));
        $this->assertTrue($items->every(fn ($item) => $item['type'] === 'trip'));
    }
}
