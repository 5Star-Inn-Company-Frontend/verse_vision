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
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'VerseVision Camera',
      themeMode: ThemeMode.dark,
      theme: ThemeData.dark(useMaterial3: true).copyWith(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF7C3AED),
          brightness: Brightness.dark,
          primary: const Color(0xFF7C3AED),
          secondary: const Color(0xFF0EA5E9),
          surface: const Color(0xFF1E293B),
        ),
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0F172A),
          elevation: 0,
          centerTitle: true,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF7C3AED),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            elevation: 4,
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFFE2E8F0),
            side: const BorderSide(color: Color(0xFF475569)),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
      ),
      home: const PairAndPreviewPage(),
    );
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
    bool showAppBar = true;
    switch (svc.current) {
      case AppScreen.welcome:
        body = WelcomeScreen(
          onConnect: () => svc.setScreen(AppScreen.qr), 
          onSettings: () => svc.setScreen(AppScreen.settings),
          hasSaved: svc.hasSaved,
          onReconnect: () => svc.connectSaved(),
        );
        showAppBar = false;
        break;
      case AppScreen.qr:
        body = QRScreen(service: svc);
        showAppBar = false;
        break;
      case AppScreen.connecting:
        body = const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.settings, size: 64), SizedBox(height: 16), Text('Connecting to Platform')]));
        break;
      case AppScreen.connected:
        body = ConnectedScreen(service: svc);
        break;
      case AppScreen.camera:
        body = CameraScreen(service: svc);
        showAppBar = false;
        break;
      case AppScreen.lock:
        body = LockScreen(service: svc);
        showAppBar = false;
        break;
      case AppScreen.settings:
        body = SettingsScreen(service: svc);
        break;
    }
    return Scaffold(
      appBar: showAppBar ? AppBar(title: const Text('VerseVision Camera')) : null,
      body: body,
      extendBodyBehindAppBar: true,
    );
  }
}
