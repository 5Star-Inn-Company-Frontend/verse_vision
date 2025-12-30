<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use App\Models\Plan;
use Illuminate\Support\Facades\Http;

class SubscriptionController extends Controller
{
    public function plans()
    {
        return response()->json(Plan::all());
    }

    public function initialize(Request $request)
    {
        $request->validate(['plan_slug' => 'required|exists:plans,slug']);

        $user = $request->user();
        $plan = Plan::where('slug', $request->plan_slug)->first();

        if ($plan->price <= 0) {
            // Free plan switch
            // Logic to cancel current and start new free plan
            // For now, just create new subscription
            $user->subscriptions()->create([
                'plan_id' => $plan->id,
                'status' => 'active',
                'starts_at' => now(),
            ]);

            return response()->json(['message' => 'Switched to ' . $plan->name, 'status' => 'active']);
        }

        // Initialize Paystack Transaction
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . env('PAYSTACK_SECRET_KEY'),
            'Content-Type' => 'application/json',
        ])->withoutVerifying()->post('https://api.paystack.co/transaction/initialize', [
            'email' => $user->email,
            'amount' => $plan->price * 100, // Kobo
            'metadata' => [
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'custom_fields' => [
                    ['display_name' => "Plan", "variable_name" => "plan", "value" => $plan->name],
                    ['display_name' => "Platform", "variable_name" => "platform", "value" => "versevision"]
                ]
            ],
            'callback_url' => route('paystack_verify'), // Should be env config
        ]);

        if ($response->successful()) {
            return response()->json($response->json()['data']);
        }

        return response()->json(['message' => 'Payment initialization failed'], 400);
    }

    public function verify(Request $request)
    {
        $request->validate(['reference' => 'required']);

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . env('PAYSTACK_SECRET_KEY'),
        ])->withoutVerifying()->get('https://api.paystack.co/transaction/verify/' . $request->reference);

        if ($response->successful()) {
            $data = $response->json()['data'];
            if ($data['status'] === 'success') {
                $meta = $data['metadata'];
                $planId = $meta['plan_id'] ?? null;
                $userId = $meta['user_id'] ?? null;

                if ($planId) {
                    $user=User::where('id',$userId)->first();
                    $user->subscriptions()->create([
                        'plan_id' => $planId,
                        'status' => 'active',
                        'paystack_subscription_code' => $data['id'], // Just using ID as ref
                        'starts_at' => now(),
                        // Add duration logic (e.g., +1 month)
                        'ends_at' => now()->addMonth(),
                    ]);

                    // Update user paystack codes if needed
                    $user->update([

                        'paystack_customer_code' => $data['customer']['customer_code'] ?? null,
                    ]);

                    return response('<!DOCTYPE html><html><head><title>Payment Successful</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-900 flex items-center justify-center h-screen text-white"><div class="bg-gray-800 p-8 rounded-2xl shadow-xl text-center max-w-md border border-gray-700"><div class="mb-6 text-green-500"><svg class="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div><h1 class="text-3xl font-bold mb-3">Payment Successful!</h1><p class="text-gray-400 mb-8 text-lg">Plan subscribed successfully.</p><p class="text-sm text-gray-500">You can now close this window.Please close the software and re-open it.</p></div></body></html>');
                }
            }else{
                return response('<!DOCTYPE html><html><head><title>Payment Failed</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-900 flex items-center justify-center h-screen text-white"><div class="bg-gray-800 p-8 rounded-2xl shadow-xl text-center max-w-md border border-gray-700"><div class="mb-6 text-red-500"><svg class="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></div><h1 class="text-3xl font-bold mb-3">Payment Failed</h1><p class="text-gray-400 mb-8 text-lg">Verification failed. Please try again.</p><p class="text-sm text-gray-500">You can now close this window.</p></div></body></html>', 400);
            }
        }

        return response('<!DOCTYPE html><html><head><title>Payment Failed</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-900 flex items-center justify-center h-screen text-white"><div class="bg-gray-800 p-8 rounded-2xl shadow-xl text-center max-w-md border border-gray-700"><div class="mb-6 text-red-500"><svg class="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></div><h1 class="text-3xl font-bold mb-3">Payment Failed</h1><p class="text-gray-400 mb-8 text-lg">Verification failed. Please try again.</p><p class="text-sm text-gray-500">You can now close this window.</p></div></body></html>', 400);
    }
}
