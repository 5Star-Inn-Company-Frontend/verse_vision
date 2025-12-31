<x-mail::message>
# Subscription Successful!

Hello {{ $user->name }},

Thank you for subscribing to the **{{ $planName }}** plan on VerseVision.

Your subscription is now active, and you can enjoy all the features included in your plan.

<x-mail::button :url="config('app.url')">
Open VerseVision
</x-mail::button>

Thanks,  
{{ config('app.name') }}
</x-mail::message>
