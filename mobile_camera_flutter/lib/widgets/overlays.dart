import 'package:flutter/material.dart';

class ScanOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..color = const Color.fromARGB(200, 0, 0, 0)..style = PaintingStyle.fill;
    final frame = Rect.fromCenter(center: Offset(size.width / 2, size.height / 2), width: size.width * 0.7, height: size.height * 0.4);
    final bg = Path()..addRect(Offset.zero & size);
    bg.addRect(frame);
    canvas.saveLayer(Offset.zero & size, Paint());
    canvas.drawPath(bg, p);
    final clear = Paint()..blendMode = BlendMode.clear;
    canvas.drawRect(frame, clear);
    canvas.restore();
    final g = Paint()..color = Colors.white..strokeWidth = 3;
    const c = 16.0;
    canvas.drawLine(frame.topLeft, frame.topLeft + const Offset(c, 0), g);
    canvas.drawLine(frame.topLeft, frame.topLeft + const Offset(0, c), g);
    canvas.drawLine(frame.topRight, frame.topRight + const Offset(-c, 0), g);
    canvas.drawLine(frame.topRight, frame.topRight + const Offset(0, c), g);
    canvas.drawLine(frame.bottomLeft, frame.bottomLeft + const Offset(c, 0), g);
    canvas.drawLine(frame.bottomLeft, frame.bottomLeft + const Offset(0, -c), g);
    canvas.drawLine(frame.bottomRight, frame.bottomRight + const Offset(-c, 0), g);
    canvas.drawLine(frame.bottomRight, frame.bottomRight + const Offset(0, -c), g);
    final t = DateTime.now().millisecondsSinceEpoch / 1000.0;
    final y = frame.top + (frame.height) * ((t % 2) / 2);
    canvas.drawLine(Offset(frame.left, y), Offset(frame.right, y), Paint()..color = Colors.redAccent..strokeWidth = 2);
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class GridOverlayPainter extends CustomPainter {
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
