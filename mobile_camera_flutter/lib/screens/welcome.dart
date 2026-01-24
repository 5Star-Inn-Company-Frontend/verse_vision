import 'package:flutter/material.dart';
import 'package:versevision_camera/screens/standalone.dart';

class WelcomeScreen extends StatelessWidget {
  final VoidCallback onConnect;
  final VoidCallback onSettings;
  final VoidCallback? onReconnect;
  final bool hasSaved;

  const WelcomeScreen({
    super.key, 
    required this.onConnect, 
    required this.onSettings,
    this.onReconnect,
    this.hasSaved = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF0F172A), Color(0xFF1E1B4B)], // Slate 900 to Indigo 950
        ),
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              // Logo Animation
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0.8, end: 1.0),
                duration: const Duration(milliseconds: 800),
                curve: Curves.easeOutBack,
                builder: (c, v, _) {
                  return Transform.scale(
                    scale: v,
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF7C3AED).withOpacity(0.3),
                            blurRadius: 40,
                            spreadRadius: 10,
                          ),
                        ],
                      ),
                      child: Image.asset('assets/icon.png', width: 120, height: 120, errorBuilder: (c, e, s) => const Icon(Icons.videocam, size: 96, color: Color(0xFF7C3AED))),
                    ),
                  );
                },
              ),
              const SizedBox(height: 32),
              
              // Title
              Text(
                'VerseVision',
                style: Theme.of(context).textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'High-quality mobile streaming',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.grey[400],
                ),
              ),
              
              const Spacer(),
              
              // Actions
              if (hasSaved && onReconnect != null) ...[
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: onReconnect,
                    child: const Text('Start Camera Feed'),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: onConnect,
                    child: const Text('Scan New QR Code'),
                  ),
                ),
              ] else ...[
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: onConnect,
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.qr_code_scanner),
                        SizedBox(width: 12),
                        Text('Connect to Platform'),
                      ],
                    ),
                  ),
                ),
              ],
              
              const SizedBox(height: 24),
              
              // Standalone Mode Button
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => StandaloneScreen(
                          onBack: () => Navigator.pop(context),
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.mic, color: Color(0xFFA78BFA)), // Violet 400
                  label: const Text(
                    'Verse Companion',
                    style: TextStyle(color: Color(0xFFA78BFA), fontSize: 16),
                  ),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: const Color(0xFF1E1B4B).withOpacity(0.5),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: BorderSide(color: const Color(0xFF7C3AED).withOpacity(0.3)),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 12),
              TextButton(
                onPressed: onSettings,
                style: TextButton.styleFrom(foregroundColor: Colors.grey[500]),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.settings, size: 16),
                    SizedBox(width: 8),
                    Text('Settings'),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
