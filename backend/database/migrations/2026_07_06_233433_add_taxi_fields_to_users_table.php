<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->after('id');
            $table->enum('role', ['rider', 'driver'])->after('phone');
            $table->timestamp('phone_verified_at')->nullable()->after('role');
            $table->string('fcm_token')->nullable()->after('phone_verified_at');
            $table->enum('status', ['active', 'suspended'])->default('active')->after('fcm_token');
            $table->string('name')->nullable()->change();
            $table->string('email')->nullable()->change();
            $table->string('password')->nullable()->change();

            $table->unique(['phone', 'role']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['phone', 'role']);
            $table->dropColumn(['phone', 'role', 'phone_verified_at', 'fcm_token', 'status']);
        });
    }
};
