<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\InsuranceProvider;
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
            'Fatick' => [14.3390, -16.4110],
            'Linguère' => [15.3900, -15.1200],
            'Tivaouane' => [14.9500, -16.8167],
            'Matam' => [15.6559, -13.2548],
            'Sédhiou' => [12.7081, -15.5569],
            'Koungheul' => [13.9833, -14.8000],
            'Kédougou' => [12.5500, -12.1833],
        ];

        foreach ($cities as $name => [$latitude, $longitude]) {
            $city = City::firstOrCreate(['name' => $name, 'country' => 'Senegal']);

            if ($city->latitude === null || $city->longitude === null) {
                $city->update(['latitude' => $latitude, 'longitude' => $longitude]);
            }
        }

        // Nouakchott (Mauritania) — the one cross-border route (Dakar <->
        // Nouakchott) among the additional routes below.
        $nouakchott = City::firstOrCreate(['name' => 'Nouakchott', 'country' => 'Mauritanie']);
        if ($nouakchott->latitude === null || $nouakchott->longitude === null) {
            $nouakchott->update(['latitude' => 18.0858, 'longitude' => -15.9785]);
        }

        $this->call(TestRoutesSeeder::class);
        $this->call(AdditionalRoutesSeeder::class);

        // Insurance comparison partners — no real api_base_url/api_key yet,
        // so each runs in simulated-quote mode until real credentials are
        // added via the admin back-office.
        $insuranceProviders = [
            ['code' => InsuranceProvider::CODE_ASS_SENEGAL, 'name' => 'Ass Sénégal', 'commission_rate' => 10],
            ['code' => InsuranceProvider::CODE_AMSA, 'name' => 'AMSA Assurances', 'commission_rate' => 10],
            ['code' => InsuranceProvider::CODE_PROVIDENCE, 'name' => 'Providence Assurances', 'commission_rate' => 10],
            ['code' => InsuranceProvider::CODE_INTOUCH_AGGREGATOR, 'name' => 'InTouch', 'commission_rate' => 8],
        ];

        foreach ($insuranceProviders as $data) {
            InsuranceProvider::firstOrCreate(['code' => $data['code']], $data);
        }
    }
}
