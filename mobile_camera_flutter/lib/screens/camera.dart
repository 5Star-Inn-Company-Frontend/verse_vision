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
    return Stack(
      children: [
        // Camera Feed
        Positioned.fill(
          child: widget.service.renderer.textureId != null 
              ? RTCVideoView(
                  widget.service.renderer,
                  objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                ) 
              : const Center(child: CircularProgressIndicator()),
        ),
        
        // Grid Overlay
        if (gridOverlay)
          Positioned.fill(child: IgnorePointer(child: CustomPaint(painter: GridOverlayPainter()))),
          
        // Top Overlay (Status)
        Positioned(
          top: 0, left: 0, right: 0,
          child: Container(
            padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.black.withOpacity(0.7), Colors.transparent],
              ),
            ),
            child: Row(
              children: [
                // Live Badge
                ListenableBuilder(
                  listenable: widget.service,
                  builder: (context, child) {
                    final state = widget.service.connectionState;
                    final color = state == 'Online' ? Colors.red : state == 'Connecting' ? Colors.orange : Colors.grey;
                    return GestureDetector(
                      onTap: () {
                        showDialog(
                          context: context,
                          builder: (context) => AlertDialog(
                            backgroundColor: const Color(0xFF1E293B),
                            title: const Text('Connection Status', style: TextStyle(color: Colors.white)),
                            content: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _statusLegend(Colors.red, 'ONLINE', 'Actively connected and streaming video.'),
                                const SizedBox(height: 12),
                                _statusLegend(Colors.orange, 'CONNECTING', 'Negotiating connection with PC.'),
                                const SizedBox(height: 12),
                                _statusLegend(Colors.grey, 'OFFLINE', 'Disconnected. Check network or PC.'),
                              ],
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: const Text('Close'),
                              ),
                            ],
                          ),
                        );
                      },
                      child: TweenAnimationBuilder<double>(
                        tween: Tween(begin: 0.8, end: 1),
                        duration: const Duration(seconds: 1),
                        curve: Curves.easeInOut,
                        builder: (c, v, _) {
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: color.withOpacity(0.9),
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(color: color.withOpacity(0.5 * v), blurRadius: 8 * v),
                              ],
                            ),
                            child: Row(
                              children: [
                                if (state == 'Online') ...[
                                  const Icon(Icons.fiber_manual_record, size: 12, color: Colors.white),
                                  const SizedBox(width: 6),
                                ],
                                Text(state.toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                              ],
                            ),
                          );
                        },
                      ),
                    );
                  }
                ),
                const Spacer(),
                
                // Stats
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.battery_std, size: 16, color: _getBatteryColor(widget.service.batteryLevel)),
                      const SizedBox(width: 4),
                      Text('${widget.service.batteryLevel}%', style: const TextStyle(color: Colors.white, fontSize: 12)),
                      const SizedBox(width: 12),
                      const Icon(Icons.wifi, size: 16, color: Colors.white),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        // Bottom Overlay (Controls)
        Positioned(
          bottom: 0, left: 0, right: 0,
          child: Container(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 48),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
                colors: [Colors.black.withOpacity(0.8), Colors.transparent],
              ),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _controlButton(
                      icon: Icons.refresh,
                      label: 'Reset',
                      onPressed: () => widget.service.reconnect(),
                    ),
                    _controlButton(
                      icon: Icons.settings,
                      label: 'Settings',
                      onPressed: () => widget.service.setScreen(AppScreen.settings),
                    ),
                    _controlButton(
                      icon: Icons.screen_lock_portrait,
                      label: 'Lock',
                      onPressed: () => widget.service.setScreen(AppScreen.lock),
                      primary: true,
                    ),
                    _controlButton(
                      icon: Icons.flip_camera_ios,
                      label: 'Flip',
                      onPressed: () => widget.service.flipCamera(),
                    ),
                    _controlButton(
                      icon: gridOverlay ? Icons.grid_on : Icons.grid_off,
                      label: 'Grid',
                      onPressed: () => setState(() => gridOverlay = !gridOverlay),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  '${widget.service.resolution} • ${adaptiveBitrate ? 'Adaptive' : 'Fixed'} • ${widget.service.durationText()}',
                  style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _controlButton({required IconData icon, required String label, required VoidCallback onPressed, bool primary = false}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          decoration: BoxDecoration(
            color: primary ? Theme.of(context).colorScheme.primary : Colors.white.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: Icon(icon, color: Colors.white),
            onPressed: onPressed,
            iconSize: 28,
          ),
        ),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(color: Colors.white, fontSize: 12)),
      ],
    );
  }

  Widget _statusLegend(Color color, String label, String desc) {
    return Row(
      children: [
        Container(
          width: 12, height: 12,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
              Text(desc, style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
            ],
          ),
        ),
      ],
    );
  }
  
  Color _getBatteryColor(int level) {
    if (level > 50) return Colors.green;
    if (level > 20) return Colors.orange;
    return Colors.red;
  }
}
