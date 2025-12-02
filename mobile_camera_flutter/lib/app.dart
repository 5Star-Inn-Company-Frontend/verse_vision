import 'package:flutter/material.dart';
import 'services/webrtc_service.dart';
import 'screens/welcome.dart';
import 'screens/qr.dart';
import 'screens/connected.dart';
import 'screens/camera.dart';
import 'screens/lock.dart';
import 'screens/settings.dart';

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
  late final WebRTCService svc;

  @override
  void initState() {
    super.initState();
    svc = WebRTCService();
    svc.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    svc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Widget body;
    switch (svc.current) {
      case AppScreen.welcome:
        body = WelcomeScreen(onConnect: () => svc.setScreen(AppScreen.qr), onSettings: () => svc.setScreen(AppScreen.settings));
        break;
      case AppScreen.qr:
        body = QRScreen(service: svc);
        break;
      case AppScreen.connecting:
        body = const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.settings, size: 64), SizedBox(height: 16), Text('Connecting to Platform')]));
        break;
      case AppScreen.connected:
        body = ConnectedScreen(service: svc);
        break;
      case AppScreen.camera:
        body = CameraScreen(service: svc);
        break;
      case AppScreen.lock:
        body = LockScreen(service: svc);
        break;
      case AppScreen.settings:
        body = SettingsScreen(service: svc);
        break;
    }
    return Scaffold(appBar: AppBar(title: const Text('VerseVision Camera')), body: body);
  }
}
