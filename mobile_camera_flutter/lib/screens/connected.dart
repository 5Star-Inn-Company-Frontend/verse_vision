import 'package:flutter/material.dart';
import '../services/webrtc_service.dart';

class ConnectedScreen extends StatelessWidget {
  final WebRTCService service;
  const ConnectedScreen({super.key, required this.service});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0.5, end: 1),
              duration: const Duration(milliseconds: 500),
              curve: Curves.elasticOut,
              builder: (c, v, _) {
                return Transform.scale(
                  scale: v,
                  child: Icon(Icons.check_circle, color: Theme.of(context).colorScheme.secondary, size: 96),
                );
              },
            ),
            const SizedBox(height: 32),
            Card(
              elevation: 4,
              color: Theme.of(context).colorScheme.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _infoRow(context, 'Camera', service.name, Icons.camera_alt),
                    const Divider(),
                    _infoRow(context, 'Platform', service.server, Icons.cloud),
                    const Divider(),
                    _infoRow(context, 'Network', service.connectionType, Icons.wifi),
                    const Divider(),
                    _infoRow(context, 'Battery', '${service.batteryLevel}%', Icons.battery_std),
                    const Divider(),
                    _infoRow(context, 'Resolution', service.resolution, Icons.hd),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () async {
                  await service.initWebRTC();
                  service.setScreen(AppScreen.camera);
                },
                icon: const Icon(Icons.videocam),
                label: const Text('Start Camera Feed'),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => service.disconnect(),
                child: const Text('Disconnect'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(BuildContext context, String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey),
          const SizedBox(width: 12),
          Text(label, style: const TextStyle(color: Colors.grey)),
          const Spacer(),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
