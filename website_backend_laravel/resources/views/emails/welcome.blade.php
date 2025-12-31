<x-mail::message>
# Welcome to VerseVision!

Hi {{ $user->name }},

We are thrilled to have you join the VerseVision community! You've just taken the first step towards revolutionizing your worship service production.

**Here is what makes VerseVision special:**

*   **Real-time Translation:** Instantly translate scriptures and content into Yoruba, Hausa, Igbo, and French using advanced AI engines.
*   **AI Scripture Detection:** Our intelligent engine listens to the speaker and automatically displays the referenced scripture in real-time.
*   **Smart Lyrics:** Access a vast library of hymns and contemporary songs with AI-powered search.
*   **Multi-Camera Grid:** Connect multiple smartphone cameras via WebRTC for a professional broadcast experience.
*   **Cloud Sync:** Seamlessly sync your settings, playlists, and assets across devices.
*   **Professional Output:** Generate clean, broadcast-ready lower thirds, subtitles, and overlays.

<x-mail::button :url="'https://versevision.5starcompany.com.ng/'">
Visit Our Website
</x-mail::button>

Explore our website to learn more about how to maximize these features.

Thanks,<br>
{{ config('app.name') }} Team
</x-mail::message>
