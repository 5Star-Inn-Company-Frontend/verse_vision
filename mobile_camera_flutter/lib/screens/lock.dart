import 'package:flutter/material.dart';
import '../services/webrtc_service.dart';

class LockScreen extends StatelessWidget {
  final WebRTCService service;
  const LockScreen({super.key, required this.service});
  @override
  Widget build(BuildContext context) {
    return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      TweenAnimationBuilder<double>(tween: Tween(begin: 0.8, end: 1), duration: const Duration(milliseconds: 800), builder: (c, v, _) {
        return Transform.scale(scale: v, child: const Icon(Icons.lock, size: 64));
      }),
      const SizedBox(height: 12),
      const Text('Battery 87%'),
      const SizedBox(height: 6),
      Text('Streaming ${service.durationText()}'),
      const SizedBox(height: 12),
      const Text('Camera continues streaming in background'),
      const SizedBox(height: 16),
      ElevatedButton(onPressed: () => service.setScreen(AppScreen.camera), child: const Text('Unlock')),
    ]));
  }
}
