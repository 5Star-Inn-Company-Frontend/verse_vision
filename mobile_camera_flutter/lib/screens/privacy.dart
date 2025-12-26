import 'package:flutter/material.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Data Usage & Privacy'),
        backgroundColor: const Color(0xFF0F172A),
      ),
      backgroundColor: const Color(0xFF0F172A),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          _buildSection(
            context,
            'What We Collect',
            '• Video & Audio: Captured locally and streamed to VerseVision via WebRTC.\n'
            '• Device Info: Name, Server URL, Token, and a generated Device ID.\n'
            '• Metrics: Battery level (0-100%) and Wi-Fi signal strength (0-4).',
            Icons.data_usage,
          ),
          _buildSection(
            context,
            'Where Data is Stored',
            '• On Device: Connection details are saved in secure local storage for convenience.\n'
            '• On Server: Camera registration and latest status metrics are stored for monitoring.',
            Icons.storage,
          ),
          _buildSection(
            context,
            'Transmission & Security',
            '• Streaming: WebRTC uses DTLS-SRTP encryption for media streams.\n'
            '• Signaling: WebSocket and HTTPS are used for control messages.\n'
            '• Auth: Tokens are used to authenticate all communications.',
            Icons.security,
          ),
          _buildSection(
            context,
            'What We DO NOT Collect',
            '• No contacts, messages, or files.\n'
            '• No GPS location data.\n'
            '• No background data when the app is closed.',
            Icons.privacy_tip,
          ),
          _buildSection(
            context,
            'Purpose of Collection',
            '• To enable live streaming functionality.\n'
            '• To allow operators to monitor camera battery and connectivity health.',
            Icons.assignment,
          ),
           _buildSection(
            context,
            'Retention & Control',
            '• Local data persists until you clear app data.\n'
            '• Server data is retained while the camera is registered.',
            Icons.delete_forever,
          ),
        ],
      ),
    );
  }

  Widget _buildSection(BuildContext context, String title, String content, IconData icon) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      color: const Color(0xFF1E293B),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: const Color(0xFF7C3AED), size: 24),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              content,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[300],
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
