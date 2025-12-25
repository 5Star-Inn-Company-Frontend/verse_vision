import 'package:flutter/material.dart';

class WelcomeScreen extends StatelessWidget {
  final VoidCallback onConnect;
  final VoidCallback onSettings;
  final VoidCallback? onReconnect;
  final bool hasSaved;

  const WelcomeScreen({
    super.key, 
    required this.onConnect, 
    required this.onSettings,
    this.onReconnect,
    this.hasSaved = false,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        TweenAnimationBuilder<double>(tween: Tween(begin: 0.9, end: 1.1), duration: const Duration(seconds: 2), curve: Curves.easeInOut, builder: (c, v, _) {
          return Transform.scale(scale: v, child: ShaderMask(shaderCallback: (r) => const LinearGradient(colors: [Colors.deepPurple, Colors.pink]).createShader(r), child: const Icon(Icons.videocam, size: 96, color: Colors.white)));
        }),
        const SizedBox(height: 16),
        const Text('High-quality mobile streaming to VerseVision'),
        const SizedBox(height: 24),
        if (hasSaved && onReconnect != null) ...[
          ElevatedButton(
            onPressed: onReconnect,
            style: ElevatedButton.styleFrom(backgroundColor: Colors.deepPurple, foregroundColor: Colors.white),
            child: const Text('Start Camera Feed'),
          ),
          const SizedBox(height: 12),
          TextButton(onPressed: onConnect, child: const Text('Scan New Code')),
        ] else ...[
          ElevatedButton(onPressed: onConnect, child: const Text('Connect to Platform')),
        ],
        const SizedBox(height: 8),
        OutlinedButton(onPressed: onSettings, child: const Text('Settings')),
      ]),
    );
  }
}
