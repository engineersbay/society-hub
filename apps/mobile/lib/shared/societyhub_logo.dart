import 'package:flutter/material.dart';

import '../core/theme.dart';

/// SocietyHub mark — stacked society blocks + courtyard diamond.
class SocietyHubLogo extends StatelessWidget {
  const SocietyHubLogo({super.key, this.size = 40});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _SocietyHubLogoPainter()),
    );
  }
}

class _SocietyHubLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.shortestSide;
    final r = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, s, s),
      Radius.circular(s * 0.23),
    );

    final bg = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFF2A65A), AppColors.saffron, AppColors.leafDark],
        stops: [0.0, 0.45, 1.0],
      ).createShader(Rect.fromLTWH(0, 0, s, s));
    canvas.drawRRect(r, bg);

    final sheen = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.center,
        colors: [
          Colors.white.withValues(alpha: 0.2),
          Colors.white.withValues(alpha: 0),
        ],
      ).createShader(Rect.fromLTWH(0, 0, s, s));
    canvas.drawRRect(r, sheen);

    final white = Paint()..color = Colors.white;
    final u = s / 64;

    RRect block(double x, double y, double w, double h) =>
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x * u, y * u, w * u, h * u),
          Radius.circular(2.5 * u),
        );

    canvas.drawRRect(block(24, 14, 16, 11), white);
    canvas.drawRRect(block(17, 26, 14.5, 11), white);
    canvas.drawRRect(block(32.5, 26, 14.5, 11), white);
    canvas.drawRRect(block(15, 38, 16, 12), white);
    canvas.drawRRect(block(33, 38, 16, 12), white);

    final diamond = Path()
      ..moveTo(32 * u, 42.2 * u)
      ..lineTo(37.2 * u, 47.4 * u)
      ..lineTo(32 * u, 52.6 * u)
      ..lineTo(26.8 * u, 47.4 * u)
      ..close();
    canvas.drawPath(diamond, white);

    final hub = Path()
      ..moveTo(32 * u, 44.6 * u)
      ..cubicTo(32.55 * u, 45.95 * u, 33.7 * u, 47.1 * u, 35.05 * u, 47.65 * u)
      ..cubicTo(33.7 * u, 48.2 * u, 32.55 * u, 49.35 * u, 32 * u, 50.7 * u)
      ..cubicTo(31.45 * u, 49.35 * u, 30.3 * u, 48.2 * u, 28.95 * u, 47.65 * u)
      ..cubicTo(30.3 * u, 47.1 * u, 31.45 * u, 45.95 * u, 32 * u, 44.6 * u)
      ..close();
    canvas.drawPath(hub, bg);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
