<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        DB::table('modules')->insert([
            'key' => 'dem_legui',
            'name' => 'Dem Légui',
            'description' => "Demande de course à la volée : le passager indique sa position et sa destination, un conducteur en ligne l'accepte.",
            'category' => 'service',
            'config' => null,
            'is_enabled' => true,
            'enabled_at' => $now,
            'disabled_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        DB::table('modules')->where('key', 'dem_legui')->delete();
    }
};
