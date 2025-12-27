<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Starter, Standard, Professional, Enterprise
            $table->string('slug')->unique();
            $table->decimal('price', 10, 2);
            $table->string('currency')->default('NGN');
            $table->integer('camera_limit')->default(1);
            $table->boolean('allow_auto_approve')->default(false);
            $table->integer('translation_limit')->default(2); // 2, 4, or -1 (unlimited)
            $table->boolean('allow_cloud_recording')->default(false);
            $table->integer('cloud_storage_gb')->default(0);
            $table->string('output_resolution')->default('720p'); // 720p, 1080p, 4k
            $table->boolean('allow_custom_vocabulary')->default(false);
            $table->boolean('allow_multi_campus')->default(false);
            $table->timestamps();
        });

        // Seed default plans
        DB::table('plans')->insert([
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'price' => 0.00,
                'camera_limit' => 1,
                'allow_auto_approve' => false,
                'translation_limit' => 2,
                'allow_cloud_recording' => false,
                'cloud_storage_gb' => 0,
                'output_resolution' => '720p',
                'allow_custom_vocabulary' => false,
                'allow_multi_campus' => false,
                'created_at' => now(), 'updated_at' => now()
            ],
            [
                'name' => 'Standard',
                'slug' => 'standard',
                'price' => 45000.00,
                'camera_limit' => 5,
                'allow_auto_approve' => true,
                'translation_limit' => 4,
                'allow_cloud_recording' => true,
                'cloud_storage_gb' => 50,
                'output_resolution' => '1080p',
                'allow_custom_vocabulary' => false,
                'allow_multi_campus' => false,
                'created_at' => now(), 'updated_at' => now()
            ],
            [
                'name' => 'Professional',
                'slug' => 'professional',
                'price' => 122450.00,
                'camera_limit' => -1, // Unlimited
                'allow_auto_approve' => true,
                'translation_limit' => -1, // Unlimited
                'allow_cloud_recording' => true,
                'cloud_storage_gb' => 500,
                'output_resolution' => '4k',
                'allow_custom_vocabulary' => true,
                'allow_multi_campus' => true,
                'created_at' => now(), 'updated_at' => now()
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'price' => 0.00, // Custom
                'camera_limit' => -1,
                'allow_auto_approve' => true,
                'translation_limit' => -1,
                'allow_cloud_recording' => true,
                'cloud_storage_gb' => -1, // Unlimited
                'output_resolution' => '4k',
                'allow_custom_vocabulary' => true,
                'allow_multi_campus' => true,
                'created_at' => now(), 'updated_at' => now()
            ]
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
