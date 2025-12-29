<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="scroll-smooth">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
    <title>VerseVision - Revolutionize Your Worship</title>
    <meta name="description" content="Seamlessly integrate lyrics, scripture, and live camera feeds with AI-powered translations and automation.">
    <link rel="canonical" href="{{ url('/') }}">

    <meta property="og:title" content="VerseVision — Worship Technology, Reimagined">
    <meta property="og:description" content="Seamlessly integrate lyrics, scripture, and live camera feeds with AI-powered translations and automation.">
    <meta property="og:image" content="{{ url('share.png') }}">
    <meta property="og:url" content="{{ url('/') }}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="VerseVision">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="VerseVision — Worship Technology, Reimagined">
    <meta name="twitter:description" content="Seamlessly integrate lyrics, scripture, and live camera feeds with AI-powered translations and automation.">
    <meta name="twitter:image" content="{{ url('share.png') }}">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />
    
    <!-- Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Instrument Sans', 'sans-serif'],
                    },
                    colors: {
                        brand: {
                            50: '#f0f9ff',
                            100: '#e0f2fe',
                            500: '#0ea5e9',
                            600: '#0284c7',
                            900: '#0c4a6e',
                        }
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-950 text-white font-sans antialiased selection:bg-brand-500 selection:text-white">

    <!-- Navigation -->
    <nav class="fixed w-full z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-layer-group text-brand-500 text-2xl"></i>
                    <span class="font-bold text-xl tracking-tight">VerseVision</span>
                </div>
                <div class="hidden md:block">
                    <div class="ml-10 flex items-baseline space-x-8">
                        <a href="#features" class="hover:text-brand-400 transition-colors px-3 py-2 rounded-md text-sm font-medium">Features</a>
                        <a href="#plans" class="hover:text-brand-400 transition-colors px-3 py-2 rounded-md text-sm font-medium">Plans</a>
                        <a href="#contact" class="hover:text-brand-400 transition-colors px-3 py-2 rounded-md text-sm font-medium">Contact</a>
                    </div>
                </div>
                <div>
                    @if (Route::has('login'))
                        <div class="flex items-center gap-4">
                            @auth
                                <a href="{{ url('/dashboard') }}" class="text-sm font-semibold hover:text-brand-400 transition-colors">Dashboard</a>
                            @else
                                <a href="{{ route('login') }}" class="text-sm font-medium hover:text-brand-400 transition-colors">Log in</a>
                                @if (Route::has('register'))
                                    <a href="{{ route('register') }}" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-brand-500/20">Get Started</a>
                                @endif
                            @endauth
                        </div>
                    @endif
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/40 via-gray-950 to-gray-950 -z-10"></div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 class="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white via-brand-100 to-brand-500 bg-clip-text text-transparent">
                Worship Technology,<br>Reimagined.
            </h1>
            <p class="mt-4 max-w-2xl mx-auto text-xl text-gray-400">
                Seamlessly integrate lyrics, scripture, and live camera feeds with AI-powered translations and automation.
            </p>
            <div class="mt-10 flex flex-wrap justify-center gap-4">
                <a href="https://versevision.5starcompany.com.ng/VerseVision_Setup.exe" 
                   onclick="trackDownload()"
                   class="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-full text-lg font-semibold transition-all shadow-lg shadow-green-500/25 transform hover:scale-105 flex items-center gap-2">
                    <i class="fa-brands fa-windows"></i> Download App
                </a>
                <a href="#plans" class="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-full text-lg font-semibold transition-all shadow-lg shadow-brand-500/25 transform hover:scale-105">
                    View Plans
                </a>
                <a href="#features" class="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-full text-lg font-semibold transition-all border border-gray-700">
                    Learn More
                </a>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-20 bg-gray-900/50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
                <p class="text-gray-400">Everything you need to elevate your service production.</p>
            </div>
            
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <!-- Feature 1 -->
                <div class="bg-gray-950 p-8 rounded-2xl border border-gray-800 hover:border-brand-500/50 transition-colors group">
                    <div class="w-12 h-12 bg-brand-900/30 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-language text-brand-400 text-xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold mb-3">Real-time Translation</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">
                        Instantly translate scriptures and content into Yoruba, Hausa, Igbo, and French using advanced AI engines.
                    </p>
                </div>

                <!-- Feature 2 -->
                <div class="bg-gray-950 p-8 rounded-2xl border border-gray-800 hover:border-brand-500/50 transition-colors group">
                    <div class="w-12 h-12 bg-brand-900/30 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-wand-magic-sparkles text-brand-400 text-xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold mb-3">AI Scripture Detection</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">
                        Our intelligent engine listens to the speaker and automatically displays the referenced scripture in real-time.
                    </p>
                </div>

                <!-- Feature 3 -->
                <div class="bg-gray-950 p-8 rounded-2xl border border-gray-800 hover:border-brand-500/50 transition-colors group">
                    <div class="w-12 h-12 bg-brand-900/30 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-music text-brand-400 text-xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold mb-3">Smart Lyrics</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">
                        Access a vast library of hymns and contemporary songs with AI-powered search and automated slide generation.
                    </p>
                </div>

                <!-- Feature 4 -->
                <div class="bg-gray-950 p-8 rounded-2xl border border-gray-800 hover:border-brand-500/50 transition-colors group">
                    <div class="w-12 h-12 bg-brand-900/30 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-video text-brand-400 text-xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold mb-3">Multi-Camera Grid</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">
                        Connect multiple smartphone cameras via WebRTC for a professional broadcast experience without expensive hardware.
                    </p>
                </div>

                <!-- Feature 5 -->
                <div class="bg-gray-950 p-8 rounded-2xl border border-gray-800 hover:border-brand-500/50 transition-colors group">
                    <div class="w-12 h-12 bg-brand-900/30 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-cloud text-brand-400 text-xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold mb-3">Cloud Sync</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">
                        Seamlessly sync your settings, playlists, and assets across devices with our robust cloud infrastructure.
                    </p>
                </div>

                <!-- Feature 6 -->
                <div class="bg-gray-950 p-8 rounded-2xl border border-gray-800 hover:border-brand-500/50 transition-colors group">
                    <div class="w-12 h-12 bg-brand-900/30 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-desktop text-brand-400 text-xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold mb-3">Professional Output</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">
                        Generate clean, broadcast-ready lower thirds, subtitles, and overlays for your live stream or projector.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Plans Section -->
    <section id="plans" class="py-20 relative overflow-hidden">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-brand-900/20 via-transparent to-transparent -z-10"></div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-bold mb-4">Choose Your Plan</h2>
                <p class="text-gray-400">Flexible options designed for churches of all sizes.</p>
            </div>

            <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <!-- Starter Plan -->
                <div class="bg-gray-900 rounded-2xl p-8 border border-gray-800 flex flex-col">
                    <h3 class="text-xl font-semibold text-gray-300">Starter</h3>
                    <div class="my-6">
                        <span class="text-4xl font-bold text-white">Free</span>
                        <span class="text-gray-500">/mo</span>
                    </div>
                    <ul class="space-y-4 mb-8 flex-1">
                        <li class="flex items-center gap-3 text-sm text-gray-300">
                            <i class="fa-solid fa-check text-green-500"></i> 5 AI Lyrics Searches/mo
                        </li>
                        <li class="flex items-center gap-3 text-sm text-gray-300">
                            <i class="fa-solid fa-check text-green-500"></i> Basic Camera Grid
                        </li>
                        <li class="flex items-center gap-3 text-sm text-gray-500">
                            <i class="fa-solid fa-xmark text-red-500"></i> No AI Detection
                        </li>
                        <li class="flex items-center gap-3 text-sm text-gray-500">
                            <i class="fa-solid fa-xmark text-red-500"></i> No AI Translation
                        </li>
                    </ul>
                    <a href="#" class="block w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-center rounded-xl font-medium transition-colors">Get Started</a>
                </div>

                <!-- Standard Plan -->
                <div class="bg-gray-900 rounded-2xl p-8 border border-brand-500/50 relative flex flex-col shadow-2xl shadow-brand-900/20 transform md:-translate-y-4">
                    <div class="absolute top-0 right-0 bg-brand-600 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
                    <h3 class="text-xl font-semibold text-white">Standard</h3>
                    <div class="my-6">
                        <span class="text-4xl font-bold text-white">₦15,000</span>
                        <span class="text-gray-500">/mo</span>
                    </div>
                    <ul class="space-y-4 mb-8 flex-1">
                        <li class="flex items-center gap-3 text-sm text-gray-300">
                            <i class="fa-solid fa-check text-brand-400"></i> 50 AI Lyrics Searches/mo
                        </li>
                        <li class="flex items-center gap-3 text-sm text-gray-300">
                            <i class="fa-solid fa-check text-brand-400"></i> AI Detection Engine
                        </li>
                        <li class="flex items-center gap-3 text-sm text-gray-300">
                            <i class="fa-solid fa-check text-brand-400"></i> Standard Support
                        </li>
                        <li class="flex items-center gap-3 text-sm text-gray-500">
                            <i class="fa-solid fa-xmark text-red-500"></i> No AI Translation
                        </li>
                    </ul>
                    <a href="#" class="block w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 text-center rounded-xl font-medium transition-colors">Upgrade Now</a>
                </div>

                <!-- Professional Plan -->
                <div class="bg-gray-900 rounded-2xl p-8 border border-gray-800 flex flex-col">
                    <h3 class="text-xl font-semibold text-purple-400">Professional</h3>
                    <div class="my-6">
                        <span class="text-4xl font-bold text-white">₦30,000</span>
                        <span class="text-gray-500">/mo</span>
                    </div>
                    <ul class="space-y-4 mb-8 flex-1">
                        <li class="flex items-center gap-3 text-sm text-gray-300">
                            <i class="fa-solid fa-check text-purple-400"></i> 5000 AI Lyrics Searches/mo
                        </li>
                        <li class="flex items-center gap-3 text-sm text-gray-300">
                            <i class="fa-solid fa-check text-purple-400"></i> AI Detection Engine
                        </li>
                        <li class="flex items-center gap-3 text-sm text-gray-300">
                            <i class="fa-solid fa-check text-purple-400"></i> AI Translation (All Languages)
                        </li>
                        <li class="flex items-center gap-3 text-sm text-gray-300">
                            <i class="fa-solid fa-check text-purple-400"></i> Priority Support
                        </li>
                    </ul>
                    <a href="#" class="block w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-center rounded-xl font-medium transition-colors">Go Pro</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="py-20 bg-gray-900/30">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 class="text-3xl md:text-4xl font-bold mb-8">Get in Touch</h2>
            <div class="bg-gray-950 p-10 rounded-3xl border border-gray-800 flex flex-col md:flex-row items-center justify-around gap-8">
                <div class="text-center group">
                    <div class="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-900/30 transition-colors">
                        <i class="fa-solid fa-envelope text-2xl text-gray-400 group-hover:text-brand-400"></i>
                    </div>
                    <h3 class="text-lg font-semibold mb-2">Email Us</h3>
                    <a href="mailto:info@5starcompany.com.ng" class="text-brand-400 hover:text-brand-300 transition-colors">info@5starcompany.com.ng</a>
                </div>
                
                <div class="w-px h-24 bg-gray-800 hidden md:block"></div>
                <div class="w-full h-px bg-gray-800 md:hidden"></div>

                <div class="text-center group">
                    <div class="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-900/30 transition-colors">
                        <i class="fa-brands fa-whatsapp text-3xl text-gray-400 group-hover:text-green-400"></i>
                    </div>
                    <h3 class="text-lg font-semibold mb-2">WhatsApp</h3>
                    <a href="https://wa.me/2348085640505" class="text-green-400 hover:text-green-300 transition-colors">+234 808 564 0505</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="py-8 border-t border-gray-900 bg-black">
        <div class="max-w-7xl mx-auto px-4 text-center">
            <p class="text-gray-500 text-sm">
                &copy; {{ date('Y') }} VerseVision. All rights reserved.
            </p>
            <p class="text-gray-600 text-xs mt-2 font-medium">
                Powered By <span class="text-gray-400">5Star Inn Company</span>
            </p>
        </div>
    </footer>

    <script>
        function trackDownload() {
            fetch('/track-download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({})
            }).catch(console.error);
        }
    </script>
</body>
</html>
