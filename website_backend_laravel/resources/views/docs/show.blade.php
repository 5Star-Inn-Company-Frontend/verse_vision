<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="scroll-smooth">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
    <title>{{ $title }} - VerseVision Documentation</title>
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />
    
    <!-- Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
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
                    },
                    typography: (theme) => ({
                        DEFAULT: {
                            css: {
                                color: theme('colors.gray.300'),
                                h1: { color: theme('colors.white') },
                                h2: { color: theme('colors.white') },
                                h3: { color: theme('colors.white') },
                                h4: { color: theme('colors.white') },
                                strong: { color: theme('colors.white') },
                                code: { color: theme('colors.brand.400') },
                                a: { color: theme('colors.brand.500'), '&:hover': { color: theme('colors.brand.400') } },
                                blockquote: { borderLeftColor: theme('colors.brand.500'), color: theme('colors.gray.400') },
                            },
                        },
                    }),
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
                    <a href="{{ url('/') }}" class="flex items-center gap-2">
                        <i class="fa-solid fa-layer-group text-brand-500 text-2xl"></i>
                        <span class="font-bold text-xl tracking-tight">VerseVision</span>
                    </a>
                    <span class="hidden md:inline-block px-2 py-0.5 rounded text-xs font-semibold bg-gray-800 text-gray-300 ml-2">Docs</span>
                </div>
                
                <!-- Desktop Menu -->
                <div class="hidden md:block">
                    <div class="ml-10 flex items-baseline space-x-8">
                        <a href="{{ url('/') }}#features" class="hover:text-brand-400 transition-colors px-3 py-2 rounded-md text-sm font-medium">Features</a>
                        <a href="{{ url('/') }}#plans" class="hover:text-brand-400 transition-colors px-3 py-2 rounded-md text-sm font-medium">Plans</a>
                        <a href="{{ route('docs.show', ['page' => 'index']) }}" class="text-brand-400 px-3 py-2 rounded-md text-sm font-medium">Documentation</a>
                    </div>
                </div>

                <!-- Mobile Menu Button -->
                <div class="md:hidden">
                    <button onclick="document.getElementById('mobile-menu').classList.toggle('hidden')" class="text-gray-300 hover:text-white">
                        <i class="fa-solid fa-bars text-xl"></i>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Mobile Menu -->
        <div id="mobile-menu" class="hidden md:hidden bg-gray-900 border-b border-gray-800">
            <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <a href="{{ url('/') }}" class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-800">Home</a>
                <a href="{{ route('docs.show', ['page' => 'index']) }}" class="block px-3 py-2 rounded-md text-base font-medium bg-gray-800 text-white">Documentation</a>
            </div>
        </div>
    </nav>

    <div class="pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex min-h-screen">
        
        <!-- Sidebar Navigation -->
        <aside class="hidden lg:block w-64 fixed top-16 bottom-0 overflow-y-auto py-8 pr-6 border-r border-gray-800 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
            <nav class="space-y-8">
                @foreach($menu as $section)
                    <div>
                        <h3 class="font-semibold text-white tracking-wider uppercase text-xs mb-3">{{ $section['title'] }}</h3>
                        <ul class="space-y-2">
                            @foreach($section['links'] as $link)
                                <li>
                                    <a href="{{ url($link['url']) }}" 
                                       class="block text-sm {{ request()->is(trim($link['url'], '/')) || (request()->is('docs') && trim($link['url'], '/') === 'docs') ? 'text-brand-400 font-medium border-l-2 border-brand-500 pl-3 -ml-[14px]' : 'text-gray-400 hover:text-white transition-colors' }}">
                                        {{ $link['title'] }}
                                    </a>
                                </li>
                            @endforeach
                        </ul>
                    </div>
                @endforeach
            </nav>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 lg:pl-72 py-8 w-full">
            <!-- Mobile Sidebar Toggle -->
            <div class="lg:hidden mb-6">
                <button onclick="document.getElementById('mobile-sidebar').classList.toggle('hidden')" class="flex items-center gap-2 text-brand-400 font-medium">
                    <i class="fa-solid fa-list-ul"></i> Menu
                </button>
            </div>

            <!-- Mobile Sidebar Overlay -->
            <div id="mobile-sidebar" class="hidden fixed inset-0 z-40 bg-gray-900/95 backdrop-blur-sm lg:hidden overflow-y-auto p-6">
                <div class="flex justify-between items-center mb-6">
                    <span class="font-bold text-xl">Documentation</span>
                    <button onclick="document.getElementById('mobile-sidebar').classList.toggle('hidden')" class="text-gray-400 hover:text-white">
                        <i class="fa-solid fa-xmark text-2xl"></i>
                    </button>
                </div>
                <nav class="space-y-8">
                    @foreach($menu as $section)
                        <div>
                            <h3 class="font-semibold text-white tracking-wider uppercase text-xs mb-3">{{ $section['title'] }}</h3>
                            <ul class="space-y-2">
                                @foreach($section['links'] as $link)
                                    <li>
                                        <a href="{{ url($link['url']) }}" class="block text-sm text-gray-400 hover:text-white transition-colors">
                                            {{ $link['title'] }}
                                        </a>
                                    </li>
                                @endforeach
                            </ul>
                        </div>
                    @endforeach
                </nav>
            </div>

            <div class="prose prose-invert prose-lg max-w-none">
                {!! $htmlContent !!}
            </div>
            
            <div class="mt-12 pt-8 border-t border-gray-800 flex justify-between text-sm text-gray-500">
                <span>&copy; {{ date('Y') }} VerseVision</span>
                <a href="#" class="hover:text-white">Edit this page on GitHub</a>
            </div>
        </main>
    </div>

</body>
</html>
