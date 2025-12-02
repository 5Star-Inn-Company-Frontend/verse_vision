import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../widgets/overlays.dart';
import '../services/webrtc_service.dart';

class CameraScreen extends StatefulWidget {
  final WebRTCService service;
  const CameraScreen({super.key, required this.service});
  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  bool gridOverlay = true;
  bool adaptiveBitrate = true;
  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      Positioned.fill(child: widget.service.renderer.textureId != null ? RTCVideoView(widget.service.renderer) : const Center(child: Text('Initializing camera...'))),
      Positioned(top: 24, left: 16, right: 16, child: Row(children: [
        TweenAnimationBuilder<double>(tween: Tween(begin: 0.6, end: 1), duration: const Duration(seconds: 1), curve: Curves.easeInOut, builder: (c, v, _) {
          return Transform.scale(scale: v, child: Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6), decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(16)), child: const Text('STREAMING', style: TextStyle(color: Colors.white))));
        }),
        const Spacer(),
        const Text('Battery 87%'),
        const SizedBox(width: 12),
        const Icon(Icons.wifi)
      ])),
      if (gridOverlay)
        Positioned.fill(child: IgnorePointer(child: CustomPaint(painter: GridOverlayPainter()))),
      Positioned(bottom: 24, left: 16, right: 16, child: Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          OutlinedButton(onPressed: () => widget.service.setScreen(AppScreen.settings), child: const Text('Settings')),
          ElevatedButton(onPressed: () => widget.service.setScreen(AppScreen.lock), child: const Text('Lock')),
          OutlinedButton(onPressed: () => widget.service.flipCamera(), child: const Text('Flip')),
        ]),
        const SizedBox(height: 8),
        Text('Res ${widget.service.resolution} • Bitrate ${adaptiveBitrate ? 'Adaptive' : 'Fixed'} • ${widget.service.durationText()}'),
      ])),
    ]);
  }
}
