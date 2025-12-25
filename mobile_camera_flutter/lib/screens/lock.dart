import 'package:flutter/material.dart';
import '../services/webrtc_service.dart';

class LockScreen extends StatelessWidget {
  final WebRTCService service;
  const LockScreen({super.key, required this.service});
  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black, // Force black for battery saving on OLED
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0.8, end: 1),
              duration: const Duration(milliseconds: 800),
              curve: Curves.easeInOut,
              builder: (c, v, _) {
                return Transform.scale(
                  scale: v,
                  child: Icon(Icons.lock_outline, size: 80, color: Theme.of(context).colorScheme.primary),
                );
              },
            ),
            const SizedBox(height: 32),
            Text(
              '${service.batteryLevel}%',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Streaming ${service.durationText()}',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.grey),
            ),
            const SizedBox(height: 32),
            const Text(
              'Camera active in background',
              style: TextStyle(color: Colors.white30),
            ),
            const SizedBox(height: 48),
            OutlinedButton.icon(
              onPressed: () => service.setScreen(AppScreen.camera),
              icon: const Icon(Icons.lock_open),
              label: const Text('Unlock'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                side: BorderSide(color: Theme.of(context).colorScheme.primary.withOpacity(0.5)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
