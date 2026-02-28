<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class DocsController extends Controller
{
    public function show($page = 'index')
    {
        $path = resource_path("docs/{$page}.md");

        if (!File::exists($path)) {
            abort(404);
        }

        $content = File::get($path);
        $htmlContent = Str::markdown($content);
        
        // Extract title from the first h1 tag or filename
        preg_match('/^#\s+(.*)$/m', $content, $matches);
        $title = $matches[1] ?? Str::title(str_replace('-', ' ', $page));

        // Load menu
        $menuPath = resource_path('docs/menu.json');
        $menu = File::exists($menuPath) ? json_decode(File::get($menuPath), true) : [];

        return view('docs.show', compact('htmlContent', 'title', 'menu', 'page'));
    }
}
