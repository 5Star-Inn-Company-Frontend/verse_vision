import 'package:flutter/material.dart';
import '../services/webrtc_service.dart';

class SettingsScreen extends StatefulWidget {
  final WebRTCService service;
  const SettingsScreen({super.key, required this.service});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController nameController;
  late TextEditingController serverController;
  bool lowPowerMode = false;
  bool audioStreaming = false;
  bool adaptiveBitrate = true;
  @override
  void initState() {
    super.initState();
    nameController = TextEditingController(text: widget.service.name);
    serverController = TextEditingController(text: widget.service.server);
    audioStreaming = widget.service.audioStreaming;
  }
  @override
  void dispose() {
    nameController.dispose();
    serverController.dispose();
    super.dispose();
  }
  @override
  Widget build(BuildContext context) {
    return ListView(padding: const EdgeInsets.all(16), children: [
      const Text('Camera Settings', style: TextStyle(fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      DropdownButton<String>(value: widget.service.resolution, items: const [DropdownMenuItem(value: '1080p', child: Text('1080p')), DropdownMenuItem(value: '720p', child: Text('720p'))], onChanged: (v) => setState(() => widget.service.resolution = v ?? widget.service.resolution)),
      DropdownButton<String>(value: widget.service.frameRate, items: const [DropdownMenuItem(value: '30 fps', child: Text('30 fps')), DropdownMenuItem(value: '60 fps', child: Text('60 fps'))], onChanged: (v) => setState(() => widget.service.frameRate = v ?? widget.service.frameRate)),
      const SizedBox(height: 16),
      const Text('Connection', style: TextStyle(fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      TextField(decoration: const InputDecoration(labelText: 'Camera Name'), controller: nameController, onChanged: (v) => widget.service.name = v),
      TextField(decoration: const InputDecoration(labelText: 'Server URL'), controller: serverController, onChanged: (v) => widget.service.server = v),
      const SizedBox(height: 16),
      const Text('Performance', style: TextStyle(fontWeight: FontWeight.bold)),
      SwitchListTile(value: lowPowerMode, onChanged: (v) => setState(() => lowPowerMode = v), title: const Text('Low Power Mode')),
      SwitchListTile(value: audioStreaming, onChanged: (v) => setState(() { audioStreaming = v; widget.service.audioStreaming = v; }), title: const Text('Audio Streaming')),
      SwitchListTile(value: adaptiveBitrate, onChanged: (v) => setState(() => adaptiveBitrate = v), title: const Text('Adaptive Bitrate')),
      const SizedBox(height: 24),
      Row(children: [
        ElevatedButton(onPressed: () => widget.service.setScreen(AppScreen.welcome), child: const Text('Back')),
      ])
    ]);
  }
}
