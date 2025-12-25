import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../widgets/overlays.dart';
import '../services/webrtc_service.dart';

class QRScreen extends StatefulWidget {
  final WebRTCService service;
  const QRScreen({super.key, required this.service});
  @override
  State<QRScreen> createState() => _QRScreenState();
}

class _QRScreenState extends State<QRScreen> with SingleTickerProviderStateMixin {
  late MobileScannerController qrController;
  late AnimationController _animationController;
  
  @override
  void initState() {
    super.initState();
    qrController = MobileScannerController(facing: CameraFacing.back, detectionSpeed: DetectionSpeed.noDuplicates);
    _animationController = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
  }
  
  @override
  void dispose() {
    qrController.dispose();
    _animationController.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        MobileScanner(
          controller: qrController,
          onDetect: (capture) {
            final code = capture.barcodes.isNotEmpty ? capture.barcodes.first.rawValue : null;
            if (code != null && code.isNotEmpty) {
              print("samji Scanned QR code: $code");
              widget.service.applyScannedText(code);
            }
          },
        ),
        
        Positioned.fill(child: IgnorePointer(child: AnimatedBuilder(
          animation: _animationController,
          builder: (_, __) => CustomPaint(painter: ScanOverlayPainter(value: _animationController.value)),
        ))),
        
        // Top Bar with Back Button
        Positioned(
          top: 0, left: 0, right: 0,
          child: Container(
            padding: const EdgeInsets.fromLTRB(8, 48, 8, 16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.black.withOpacity(0.7), Colors.transparent],
              ),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () => widget.service.setScreen(AppScreen.welcome),
                ),
                const Text(
                  'Scan QR Code',
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ),

        // Bottom Overlay
        Positioned(
          bottom: 48,
          left: 24,
          right: 24,
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'Align the QR code within the frame\nto connect automatically',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white, fontSize: 14),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
