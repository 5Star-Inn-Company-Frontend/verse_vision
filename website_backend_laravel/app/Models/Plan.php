<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'price',
        'currency',
        'camera_limit',
        'allow_auto_approve',
        'translation_limit',
        'allow_cloud_recording',
        'cloud_storage_gb',
        'output_resolution',
        'allow_custom_vocabulary',
        'allow_multi_campus',
    ];

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }
}
