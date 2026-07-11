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
        // Approximate town-center coordinates, used for route distance
        // calculation (CityDistanceService) and map visualization.
        $cities = [
            'Dakar' => [14.6928, -17.4467],
            'Touba' => [14.8500, -15.8833],
            'Thiès' => [14.7910, -16.9359],
            'Kaolack' => [14.1825, -16.0728],
            'Saint-Louis' => [16.0326, -16.4818],
            'Ziguinchor' => [12.5833, -16.2719],
            'Mbour' => [14.4200, -16.9600],
            'Diourbel' => [14.6559, -16.2333],
            'Louga' => [15.6173, -16.2240],
            'Tambacounda' => [13.7671, -13.6681],
        ];

        foreach ($cities as $name => [$latitude, $longitude]) {
            $city = City::firstOrCreate(['name' => $name, 'country' => 'Senegal']);

            if ($city->latitude === null || $city->longitude === null) {
                $city->update(['latitude' => $latitude, 'longitude' => $longitude]);
            }
        }

        $this->call(TestRoutesSeeder::class);
    }
}
