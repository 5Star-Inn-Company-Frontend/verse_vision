<x-mail::message>
# New Login Detected

Hello {{ $details['name'] }},

We detected a new login to your VerseVision account.

**Device:** {{ $details['device'] }}  
**IP Address:** {{ $details['ip'] }}  
**Time:** {{ $details['time'] }}  
**Version:** {{ $details['version'] ?? 'N/A' }}

If this was you, you can ignore this email. If you did not log in, please secure your account immediately.

Thanks,  
{{ config('app.name') }}
</x-mail::message>
