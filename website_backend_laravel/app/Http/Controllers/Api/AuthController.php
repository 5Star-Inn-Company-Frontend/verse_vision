<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Plan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'api_token' => Str::random(60),
        ]);

        // Assign Starter Plan
        $starterPlan = Plan::where('slug', 'starter')->first();
        if ($starterPlan) {
            $user->subscriptions()->create([
                'plan_id' => $starterPlan->id,
                'status' => 'active',
                'starts_at' => now(),
            ]);
        }

        return response()->json([
            'token' => $user->api_token,
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
                
            $user = User::create([
                'name' => explode('@', $request->email)[0],
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'api_token' => Str::random(60),
            ]);

            // Assign Starter Plan
            $starterPlan = Plan::where('slug', 'starter')->first();
            if ($starterPlan) {
                $user->subscriptions()->create([
                    'plan_id' => $starterPlan->id,
                    'status' => 'active',
                    'starts_at' => now(),
                ]);
            }

            return response()->json([
                'token' => $user->api_token,
                'user' => $user->load('activeSubscription.plan'),
            ]);

        }

        
        if (! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }


        // Refresh token on login
        $user->api_token = Str::random(60);
        $user->save();

        return response()->json([
            'token' => $user->api_token,
            'user' => $user->load('activeSubscription.plan'),
        ]);
    }

    public function me(Request $request)
    {
        // User is attached by middleware
        return response()->json([
            'user' => $request->user()->load('activeSubscription.plan'),
            'features' => $this->getFeatures($request->user()),
        ]);
    }

    private function getFeatures(User $user)
    {
        $plan = $user->activeSubscription ? $user->activeSubscription->plan : null;
        if (!$plan) {
            // Fallback to defaults if no active plan (shouldn't happen if Starter is assigned)
            return [
                'camera_limit' => 1,
                'translation_limit' => 2,
                'output_resolution' => '720p',
                'allow_auto_approve' => false,
                'allow_cloud_recording' => false,
            ];
        }

        return [
            'camera_limit' => $plan->camera_limit,
            'translation_limit' => $plan->translation_limit,
            'output_resolution' => $plan->output_resolution,
            'allow_auto_approve' => (bool) $plan->allow_auto_approve,
            'allow_cloud_recording' => (bool) $plan->allow_cloud_recording,
            'allow_custom_vocabulary' => (bool) $plan->allow_custom_vocabulary,
            'allow_multi_campus' => (bool) $plan->allow_multi_campus,
        ];
    }
}
