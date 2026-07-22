<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category')->nullable();
            $table->json('config')->nullable();
            $table->boolean('is_enabled')->default(true);
            $table->timestamp('enabled_at')->nullable();
            $table->timestamp('disabled_at')->nullable();
            $table->timestamps();
        });

        // Seed the platform's existing services as manageable modules, all
        // enabled by default (they're already live) — admin.permission:
        // manage_modules can add further modules from the back-office.
        $now = now();
        DB::table('modules')->insert([
            ['key' => 'livraison', 'name' => 'Livraison', 'description' => 'Envoi de colis en ville et entre villes.', 'category' => 'service', 'config' => null, 'is_enabled' => true, 'enabled_at' => $now, 'disabled_at' => null, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'cargaison', 'name' => 'Cargaison', 'description' => 'Transport de marchandises en gros volume.', 'category' => 'service', 'config' => null, 'is_enabled' => true, 'enabled_at' => $now, 'disabled_at' => null, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'camion', 'name' => 'Camion', 'description' => 'Déménagement et transport de gros objets.', 'category' => 'service', 'config' => null, 'is_enabled' => true, 'enabled_at' => $now, 'disabled_at' => null, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'location', 'name' => 'Location', 'description' => 'Location de véhicules avec ou sans chauffeur.', 'category' => 'service', 'config' => null, 'is_enabled' => true, 'enabled_at' => $now, 'disabled_at' => null, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'anando', 'name' => 'Anando', 'description' => 'Partage de trajet instantané entre utilisateurs (covoiturage).', 'category' => 'service', 'config' => null, 'is_enabled' => true, 'enabled_at' => $now, 'disabled_at' => null, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'assurance', 'name' => 'Assurance', 'description' => 'Comparaison et achat d\'assurance véhicule pour les conducteurs.', 'category' => 'service', 'config' => null, 'is_enabled' => true, 'enabled_at' => $now, 'disabled_at' => null, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'instant_trips', 'name' => 'Départs immédiats', 'description' => 'Publication et réservation de trajets à départ immédiat.', 'category' => 'service', 'config' => null, 'is_enabled' => true, 'enabled_at' => $now, 'disabled_at' => null, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('modules');
    }
};
