import 'package:flutter/material.dart';
import '../services/webrtc_service.dart';

class ConnectedScreen extends StatelessWidget {
  final WebRTCService service;
  const ConnectedScreen({super.key, required this.service});
  @override
  Widget build(BuildContext context) {
    return Column(children: [
      const SizedBox(height: 24),
      TweenAnimationBuilder<double>(tween: Tween(begin: 0.5, end: 1), duration: const Duration(milliseconds: 500), builder: (c, v, _) {
        return Transform.scale(scale: v, child: const Icon(Icons.check_circle, color: Colors.green, size: 72));
      }),
      const SizedBox(height: 16),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Camera: ${service.name}'),
          Text('Platform: ${service.server}'),
          Text('Network: ${service.connectionType}'),
          Text('Battery: ${service.batteryLevel}%'),
          Text('Resolution: ${service.resolution}'),
        ]))),
      ),
      const SizedBox(height: 16),
      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        ElevatedButton(
          onPressed: () async {
            await service.initWebRTC();
            service.setScreen(AppScreen.camera);
          },
          child: const Text('Start Camera Feed'),
        ),
        const SizedBox(width: 12),
        OutlinedButton(
          onPressed: () => service.disconnect(),
          child: const Text('Disconnect'),
        ),
      ]),
    ]);
  }
}
