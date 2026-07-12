<?php

namespace Tests\Feature\Addresses;

use App\Models\Address;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AddressTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_list_their_own_addresses(): void
    {
        $user = User::factory()->create();
        Address::factory()->for($user)->count(2)->create();
        Address::factory()->for(User::factory())->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/addresses')->assertOk();

        $this->assertCount(2, $response->json());
    }

    public function test_a_user_can_create_an_address(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/addresses', [
            'label' => 'Domicile',
            'address_line' => 'Sacré-Cœur 3, Dakar',
            'latitude' => 14.7167,
            'longitude' => -17.4677,
        ])->assertCreated();

        $this->assertSame('Domicile', $response->json('label'));
        $this->assertDatabaseHas('addresses', [
            'user_id' => $user->id,
            'label' => 'Domicile',
        ]);
    }

    public function test_creating_an_address_requires_a_label_and_address_line(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/addresses', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['label', 'address_line']);
    }

    public function test_setting_a_new_address_as_default_unsets_the_previous_default(): void
    {
        $user = User::factory()->create();
        $first = Address::factory()->for($user)->create(['is_default' => true]);

        $this->actingAs($user, 'sanctum')->postJson('/api/addresses', [
            'label' => 'Travail',
            'address_line' => 'Plateau, Dakar',
            'is_default' => true,
        ])->assertCreated();

        $this->assertFalse($first->fresh()->is_default);
        $this->assertSame(1, Address::where('user_id', $user->id)->where('is_default', true)->count());
    }

    public function test_a_user_can_update_their_own_address(): void
    {
        $user = User::factory()->create();
        $address = Address::factory()->for($user)->create(['label' => 'Domicile']);

        $this->actingAs($user, 'sanctum')->putJson("/api/addresses/{$address->id}", [
            'label' => 'Maison',
        ])->assertOk();

        $this->assertSame('Maison', $address->fresh()->label);
    }

    public function test_a_user_cannot_update_another_users_address(): void
    {
        $owner = User::factory()->create();
        $address = Address::factory()->for($owner)->create();
        $other = User::factory()->create();

        $this->actingAs($other, 'sanctum')->putJson("/api/addresses/{$address->id}", [
            'label' => 'Maison',
        ])->assertForbidden();
    }

    public function test_a_user_can_delete_their_own_address(): void
    {
        $user = User::factory()->create();
        $address = Address::factory()->for($user)->create();

        $this->actingAs($user, 'sanctum')->deleteJson("/api/addresses/{$address->id}")->assertOk();

        $this->assertDatabaseMissing('addresses', ['id' => $address->id]);
    }

    public function test_a_user_cannot_delete_another_users_address(): void
    {
        $owner = User::factory()->create();
        $address = Address::factory()->for($owner)->create();
        $other = User::factory()->create();

        $this->actingAs($other, 'sanctum')->deleteJson("/api/addresses/{$address->id}")->assertForbidden();

        $this->assertDatabaseHas('addresses', ['id' => $address->id]);
    }

    public function test_addresses_are_available_to_both_riders_and_drivers(): void
    {
        $rider = User::factory()->create(['role' => User::ROLE_RIDER]);
        $driver = User::factory()->driver()->create();

        $this->actingAs($rider, 'sanctum')->getJson('/api/addresses')->assertOk();
        $this->actingAs($driver, 'sanctum')->getJson('/api/addresses')->assertOk();
    }
}
