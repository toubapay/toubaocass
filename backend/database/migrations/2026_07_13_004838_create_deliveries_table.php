<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('receiver_name');
            $table->string('receiver_phone');
            $table->string('receiver_address_line');
            $table->decimal('receiver_latitude', 10, 7);
            $table->decimal('receiver_longitude', 10, 7);
            $table->string('pickup_address_line');
            $table->decimal('pickup_latitude', 10, 7);
            $table->decimal('pickup_longitude', 10, 7);
            $table->enum('package_type', ['document', 'colis_leger', 'colis_moyen', 'colis_volumineux']);
            $table->string('notes')->nullable();
            $table->decimal('distance_km', 8, 2);
            $table->unsignedInteger('fee');
            $table->enum('payment_method', ['cash', 'wallet'])->default('cash');
            $table->enum('status', ['pending', 'accepted', 'picked_up', 'delivered', 'cancelled'])->default('pending');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'driver_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deliveries');
    }
};
