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

class _QRScreenState extends State<QRScreen> {
  late MobileScannerController qrController;
  @override
  void initState() {
    super.initState();
    qrController = MobileScannerController(facing: CameraFacing.back, detectionSpeed: DetectionSpeed.noDuplicates);
  }
  @override
  void dispose() {
    qrController.dispose();
    super.dispose();
  }
  @override
  Widget build(BuildContext context) {
    return Stack(children: [
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
      Positioned.fill(child: IgnorePointer(child: CustomPaint(painter: ScanOverlayPainter()))),
      Positioned(
        bottom: 24,
        left: 24,
        right: 24,
        child: Column(children: [
          const Text('Align QR within the frame to connect', textAlign: TextAlign.center, style: TextStyle(color: Colors.white)),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () {
              final demo = 'server=${widget.service.server};token=demo-token-123;deviceId=demo-device;name=Demo Camera';
              widget.service.applyScannedText(demo);
            },
            child: const Text('Simulate Connection'),
          ),
        ]),
      ),
    ]);
  }
}
