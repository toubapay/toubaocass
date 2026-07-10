<?php

namespace Database\Seeders;

use App\Models\City;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $cities = [
            'Dakar', 'Touba', 'Thiès', 'Kaolack', 'Saint-Louis',
            'Ziguinchor', 'Mbour', 'Diourbel', 'Louga', 'Tambacounda',
        ];

        foreach ($cities as $city) {
            City::firstOrCreate(['name' => $city, 'country' => 'Senegal']);
        }

        $this->call(TestRoutesSeeder::class);
    }
}
