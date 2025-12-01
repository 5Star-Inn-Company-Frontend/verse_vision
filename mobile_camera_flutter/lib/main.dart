import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:camera/camera.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const VerseVisionCameraApp());
}

enum AppScreen { welcome, qr, connecting, connected, camera, lock, settings }

class VerseVisionCameraApp extends StatelessWidget {
  const VerseVisionCameraApp({super.key});
  @override
  Widget build(BuildContext context) {
    return const MaterialApp(home: PairAndPreviewPage());
  }
}

class PairAndPreviewPage extends StatefulWidget {
  const PairAndPreviewPage({super.key});
  @override
  State<PairAndPreviewPage> createState() => _PairAndPreviewPageState();
}

class _PairAndPreviewPageState extends State<PairAndPreviewPage> {
  String server = 'http://localhost:3001';
  String token = '';
  String deviceId = '';
  String name = 'Mobile Camera';
  bool paired = false;
  CameraController? controller;
  Timer? heartbeatTimer;
  Timer? frameTimer;
  late TextEditingController serverController;
  late TextEditingController tokenController;
  late TextEditingController deviceController;
  late TextEditingController nameController;
  late MobileScannerController qrController;
  DateTime? streamStart;
  bool lockMode = false;
  bool autoExposure = true;
  bool gridOverlay = true;
  bool lowPowerMode = false;
  bool audioStreaming = false;
  bool adaptiveBitrate = true;
  String resolution = '1080p';
  String frameRate = '30 fps';
  String connectionStrength = 'Strong';
  int batteryLevel = 87;
  CameraDescription? backCam;
  CameraDescription? frontCam;
  CameraDescription? activeCam;
  AppScreen current = AppScreen.welcome;

  @override
  void initState() {
    super.initState();
    serverController = TextEditingController(text: server);
    tokenController = TextEditingController(text: token);
    deviceController = TextEditingController(text: deviceId);
    nameController = TextEditingController(text: name);
    qrController = MobileScannerController(facing: CameraFacing.back, detectionSpeed: DetectionSpeed.noDuplicates);
  }

  Future<void> _pair() async {
    try {
      final uri = Uri.parse('$server/api/camera/register');
      final res = await http.post(uri, headers: {'Content-Type': 'application/json'}, body: jsonEncode({'token': token, 'deviceId': deviceId, 'name': name}));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        paired = true;
        _startHeartbeat();
        setState(() => current = AppScreen.connected);
      }
    } catch (_) {}
  }

  void _startHeartbeat() {
    heartbeatTimer?.cancel();
    heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (_) async {
      try {
        await http.post(Uri.parse('$server/api/camera/heartbeat'), headers: {'Content-Type': 'application/json'}, body: jsonEncode({'token': token}));
      } catch (_) {}
    });
  }

  Future<void> _initCamera() async {
    final cams = await availableCameras();
    backCam = cams.where((c) => c.lensDirection == CameraLensDirection.back).firstOrNull;
    frontCam = cams.where((c) => c.lensDirection == CameraLensDirection.front).firstOrNull;
    activeCam = backCam ?? cams.firstOrNull;
    final cam = activeCam;
    if (cam == null) return;
    controller = CameraController(cam, ResolutionPreset.medium, enableAudio: audioStreaming);
    await controller!.initialize();
    setState(() {});
    _startFrameUpload();
    streamStart = DateTime.now();
  }

  void _startFrameUpload() {
    frameTimer?.cancel();
    frameTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
      if (controller == null || !controller!.value.isInitialized) return;
      try {
        final pic = await controller!.takePicture();
        final file = File(pic.path);
        final req = http.MultipartRequest('POST', Uri.parse('$server/api/camera/frame'));
        req.fields['token'] = token;
        req.files.add(await http.MultipartFile.fromPath('frame', file.path, filename: 'frame.jpg'));
        await req.send();
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    heartbeatTimer?.cancel();
    frameTimer?.cancel();
    controller?.dispose();
    serverController.dispose();
    tokenController.dispose();
    deviceController.dispose();
    nameController.dispose();
    qrController.dispose();
    super.dispose();
  }

  void _applyScannedText(String text) {
    String? scannedServer;
    String? scannedToken;
    String? scannedDeviceId;
    String? scannedName;
    try {
      final uri = Uri.tryParse(text);
      if (uri != null) {
        final q = uri.queryParameters;
        scannedServer = q['server'] ?? (uri.scheme.startsWith('http') ? uri.toString() : null);
        scannedToken = q['token'] ?? (uri.fragment.isNotEmpty ? Uri.splitQueryString(uri.fragment)['token'] : null);
        scannedDeviceId = q['deviceId'] ?? q['device_id'];
        scannedName = q['name'];
      }
    } catch (_) {}
    if (scannedServer == null || scannedToken == null) {
      try {
        final obj = jsonDecode(text);
        if (obj is Map) {
          scannedServer = scannedServer ?? (obj['server'] as String?);
          scannedToken = scannedToken ?? (obj['token'] as String?);
          scannedDeviceId = scannedDeviceId ?? (obj['deviceId'] as String?) ?? (obj['device_id'] as String?);
          scannedName = scannedName ?? (obj['name'] as String?);
        }
      } catch (_) {}
    }
    if (scannedServer == null || scannedToken == null) {
      final parts = text.split(RegExp('[;&\n]'));
      for (final p in parts) {
        final i = p.indexOf('=');
        if (i > 0) {
          final k = p.substring(0, i).trim().toLowerCase();
          final v = p.substring(i + 1).trim();
          if (k == 'server') scannedServer = v;
          if (k == 'token') scannedToken = v;
          if (k == 'deviceid' || k == 'device_id') scannedDeviceId = v;
          if (k == 'name') scannedName = v;
        }
      }
    }
    if (scannedToken == null && text.isNotEmpty) {
      scannedToken = text.trim();
    }
    if (scannedServer != null) {
      server = scannedServer;
      serverController.text = scannedServer;
    }
    if (scannedToken != null) {
      token = scannedToken;
      tokenController.text = scannedToken;
    }
    if (scannedDeviceId != null) {
      deviceId = scannedDeviceId;
      deviceController.text = scannedDeviceId;
    }
    if (scannedName != null) {
      name = scannedName;
      nameController.text = scannedName;
    }
    setState(() {});
    if (!paired && server.isNotEmpty && token.isNotEmpty) {
      current = AppScreen.connecting;
      setState(() {});
      _pair();
    }
  }
  void _flipCamera() async {
    final target = activeCam?.lensDirection == CameraLensDirection.back ? frontCam : backCam;
    if (target == null) return;
    activeCam = target;
    final prev = controller;
    controller = CameraController(target, ResolutionPreset.medium, enableAudio: audioStreaming);
    await controller!.initialize();
    await prev?.dispose();
    setState(() {});
  }

  String _durationText() {
    if (streamStart == null) return '00:00:00';
    final d = DateTime.now().difference(streamStart!);
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(d.inHours)}:${two(d.inMinutes % 60)}:${two(d.inSeconds % 60)}';
  }

  @override
  Widget build(BuildContext context) {
    Widget body;
    if (current == AppScreen.welcome) {
      body = Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0.9, end: 1.1), duration: const Duration(seconds: 2), curve: Curves.easeInOut, builder: (c, v, _) {
                return Transform.scale(
                  scale: v,
                  child: ShaderMask(
                    shaderCallback: (r) => const LinearGradient(colors: [Colors.deepPurple, Colors.pink]).createShader(r),
                    child: const Icon(Icons.videocam, size: 96, color: Colors.white),
                  ),
                );
              },
              onEnd: () => setState(() {}),
            ),
            const SizedBox(height: 16),
            const Text('High-quality mobile streaming to VerseVision'),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: () => setState(() => current = AppScreen.qr), child: const Text('Connect to Platform')),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: () => setState(() => current = AppScreen.settings), child: const Text('Settings')),
          ],
        ),
      );
    } else if (current == AppScreen.qr) {
      body = Stack(children: [
        MobileScanner(
          controller: qrController,
          onDetect: (capture) {
            final code = capture.barcodes.isNotEmpty ? capture.barcodes.first.rawValue : null;
            if (code != null && code.isNotEmpty) {
              _applyScannedText(code);
            }
          },
        ),
        Positioned.fill(child: IgnorePointer(child: CustomPaint(painter: _ScanOverlayPainter()))),
        Positioned(
          bottom: 24,
          left: 24,
          right: 24,
          child: Column(children: [
            const Text('Align QR within the frame to connect', textAlign: TextAlign.center, style: TextStyle(color: Colors.white)),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () {
                final demo = 'server=$server;token=demo-token-123;deviceId=demo-device;name=Demo Camera';
                _applyScannedText(demo);
              },
              child: const Text('Simulate Connection'),
            ),
          ]),
        ),
      ]);
    } else if (current == AppScreen.connecting) {
      body = Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          TweenAnimationBuilder<double>(tween: Tween(begin: 0, end: 1), duration: const Duration(seconds: 2), builder: (c, v, _) {
            return Transform.rotate(angle: v * 6.283, child: const Icon(Icons.settings, size: 64));
          }),
          const SizedBox(height: 16),
          const Text('Connecting to Platform'),
        ]),
      );
    } else if (current == AppScreen.connected) {
      body = Column(children: [
        const SizedBox(height: 24),
        TweenAnimationBuilder<double>(tween: Tween(begin: 0.5, end: 1), duration: const Duration(milliseconds: 500), builder: (c, v, _) {
          return Transform.scale(scale: v, child: const Icon(Icons.check_circle, color: Colors.green, size: 72));
        }),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Camera: $name'),
            Text('Platform: $server'),
            Text('WiFi: $connectionStrength'),
            Text('Battery: $batteryLevel%'),
            Text('Resolution: $resolution'),
          ]))),
        ),
        const SizedBox(height: 16),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          ElevatedButton(
            onPressed: () async {
              await _initCamera();
              setState(() => current = AppScreen.camera);
            },
            child: const Text('Start Camera Feed'),
          ),
          const SizedBox(width: 12),
          OutlinedButton(
            onPressed: () {
              heartbeatTimer?.cancel();
              frameTimer?.cancel();
              controller?.dispose();
              controller = null;
              paired = false;
              setState(() => current = AppScreen.welcome);
            },
            child: const Text('Disconnect'),
          ),
        ]),
      ]);
    } else if (current == AppScreen.camera) {
      body = Stack(children: [
        Positioned.fill(child: controller?.value.isInitialized == true ? CameraPreview(controller!) : const Center(child: Text('Initializing camera...'))),
        Positioned(top: 24, left: 16, right: 16, child: Row(children: [
          TweenAnimationBuilder<double>(tween: Tween(begin: 0.6, end: 1), duration: const Duration(seconds: 1), curve: Curves.easeInOut, builder: (c, v, _) {
            return Transform.scale(scale: v, child: Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6), decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(16)), child: const Text('STREAMING', style: TextStyle(color: Colors.white))));
          }),
          const Spacer(),
          Text('Battery $batteryLevel%'),
          const SizedBox(width: 12),
          const Icon(Icons.wifi)
        ])),
        if (gridOverlay)
          Positioned.fill(child: IgnorePointer(child: CustomPaint(painter: _GridOverlayPainter()))),
        Positioned(bottom: 24, left: 16, right: 16, child: Column(children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            OutlinedButton(onPressed: () => setState(() => current = AppScreen.settings), child: const Text('Settings')),
            ElevatedButton(onPressed: () => setState(() => current = AppScreen.lock), child: const Text('Lock')),
            OutlinedButton(onPressed: _flipCamera, child: const Text('Flip')),
          ]),
          const SizedBox(height: 8),
          Text('Res $resolution • Bitrate ${adaptiveBitrate ? 'Adaptive' : 'Fixed'} • ${_durationText()}'),
        ])),
      ]);
    } else if (current == AppScreen.lock) {
      body = Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        TweenAnimationBuilder<double>(tween: Tween(begin: 0.8, end: 1), duration: const Duration(milliseconds: 800), builder: (c, v, _) {
          return Transform.scale(scale: v, child: const Icon(Icons.lock, size: 64));
        }),
        const SizedBox(height: 12),
        Text('Battery $batteryLevel%'),
        const SizedBox(height: 6),
        Text('Streaming ${_durationText()}'),
        const SizedBox(height: 12),
        const Text('Camera continues streaming in background'),
        const SizedBox(height: 16),
        ElevatedButton(onPressed: () => setState(() => current = AppScreen.camera), child: const Text('Unlock')),
      ]));
    } else {
      body = ListView(padding: const EdgeInsets.all(16), children: [
        const Text('Camera Settings', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        DropdownButton<String>(value: resolution, items: const [DropdownMenuItem(value: '1080p', child: Text('1080p')), DropdownMenuItem(value: '720p', child: Text('720p'))], onChanged: (v) => setState(() => resolution = v ?? resolution)),
        DropdownButton<String>(value: frameRate, items: const [DropdownMenuItem(value: '30 fps', child: Text('30 fps')), DropdownMenuItem(value: '60 fps', child: Text('60 fps'))], onChanged: (v) => setState(() => frameRate = v ?? frameRate)),
        SwitchListTile(value: autoExposure, onChanged: (v) => setState(() => autoExposure = v), title: const Text('Auto Exposure')),
        SwitchListTile(value: gridOverlay, onChanged: (v) => setState(() => gridOverlay = v), title: const Text('Grid Overlay')),
        const SizedBox(height: 16),
        const Text('Connection', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        TextField(decoration: const InputDecoration(labelText: 'Camera Name'), controller: nameController, onChanged: (v) => name = v),
        TextField(decoration: const InputDecoration(labelText: 'Server URL'), controller: serverController, onChanged: (v) => server = v),
        const SizedBox(height: 16),
        const Text('Performance', style: TextStyle(fontWeight: FontWeight.bold)),
        SwitchListTile(value: lowPowerMode, onChanged: (v) => setState(() => lowPowerMode = v), title: const Text('Low Power Mode')),
        SwitchListTile(value: audioStreaming, onChanged: (v) => setState(() => audioStreaming = v), title: const Text('Audio Streaming')),
        SwitchListTile(value: adaptiveBitrate, onChanged: (v) => setState(() => adaptiveBitrate = v), title: const Text('Adaptive Bitrate')),
        const SizedBox(height: 16),
        const Text('About', style: TextStyle(fontWeight: FontWeight.bold)),
        const ListTile(title: Text('App Version'), subtitle: Text('0.0.1')),
        const ListTile(title: Text('Help & Support')),
        const ListTile(title: Text('Privacy Policy')),
        const SizedBox(height: 24),
        Row(children: [
          ElevatedButton(onPressed: () => setState(() => current = AppScreen.welcome), child: const Text('Back')),
        ])
      ]);
    }

    return Scaffold(appBar: AppBar(title: const Text('VerseVision Camera')), body: body);
  }
}

class _ScanOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = const Color.fromARGB(200, 0, 0, 0)
      ..style = PaintingStyle.fill;
    final frame = Rect.fromCenter(center: Offset(size.width / 2, size.height / 2), width: size.width * 0.7, height: size.height * 0.4);
    final bg = Path()..addRect(Offset.zero & size);
    bg.addRect(frame);
    canvas.saveLayer(Offset.zero & size, Paint());
    canvas.drawPath(bg, p);
    final clear = Paint()..blendMode = BlendMode.clear;
    canvas.drawRect(frame, clear);
    canvas.restore();
    final g = Paint()..color = Colors.white..strokeWidth = 3;
    final c = 16.0;
    canvas.drawLine(frame.topLeft, frame.topLeft + Offset(c, 0), g);
    canvas.drawLine(frame.topLeft, frame.topLeft + Offset(0, c), g);
    canvas.drawLine(frame.topRight, frame.topRight + Offset(-c, 0), g);
    canvas.drawLine(frame.topRight, frame.topRight + Offset(0, c), g);
    canvas.drawLine(frame.bottomLeft, frame.bottomLeft + Offset(c, 0), g);
    canvas.drawLine(frame.bottomLeft, frame.bottomLeft + Offset(0, -c), g);
    canvas.drawLine(frame.bottomRight, frame.bottomRight + Offset(-c, 0), g);
    canvas.drawLine(frame.bottomRight, frame.bottomRight + Offset(0, -c), g);
    final t = DateTime.now().millisecondsSinceEpoch / 1000.0;
    final y = frame.top + (frame.height) * ((t % 2) / 2);
    canvas.drawLine(Offset(frame.left, y), Offset(frame.right, y), Paint()..color = Colors.redAccent..strokeWidth = 2);
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class _GridOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..color = Colors.white24..strokeWidth = 1;
    final w = size.width;
    final h = size.height;
    canvas.drawLine(Offset(w / 3, 0), Offset(w / 3, h), p);
    canvas.drawLine(Offset(2 * w / 3, 0), Offset(2 * w / 3, h), p);
    canvas.drawLine(Offset(0, h / 3), Offset(w, h / 3), p);
    canvas.drawLine(Offset(0, 2 * h / 3), Offset(w, 2 * h / 3), p);
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
