<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('country')->default('Senegal');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['name', 'country']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cities');
    }
};
