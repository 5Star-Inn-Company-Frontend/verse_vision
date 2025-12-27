<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    public function getSettings(Request $request)
    {
        return response()->json(['settings' => $request->user()->settings_sync ?? new \stdClass()]);
    }

    public function updateSettings(Request $request)
    {
        $request->validate([
            'settings' => 'required|array',
        ]);

        $user = $request->user();
        $user->settings_sync = $request->settings;
        $user->save();

        return response()->json(['message' => 'Settings synced', 'synced_at' => now()]);
    }
}
