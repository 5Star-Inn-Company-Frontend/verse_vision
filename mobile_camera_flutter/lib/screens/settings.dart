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
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 100, 16, 16),
      children: [
        _buildSectionHeader(theme, 'Camera & Video'),
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.high_quality),
                title: const Text('Resolution'),
                trailing: DropdownButton<String>(
                  value: widget.service.resolution,
                  underline: Container(),
                  items: const [
                    DropdownMenuItem(value: '1080p', child: Text('1080p')),
                    DropdownMenuItem(value: '720p', child: Text('720p')),
                  ],
                  onChanged: (v) => setState(() => widget.service.resolution = v ?? widget.service.resolution),
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.speed),
                title: const Text('Frame Rate'),
                trailing: DropdownButton<String>(
                  value: widget.service.frameRate,
                  underline: Container(),
                  items: const [
                    DropdownMenuItem(value: '30 fps', child: Text('30 fps')),
                    DropdownMenuItem(value: '60 fps', child: Text('60 fps')),
                  ],
                  onChanged: (v) => setState(() => widget.service.frameRate = v ?? widget.service.frameRate),
                ),
              ),
            ],
          ),
        ),
        
        const SizedBox(height: 24),
        _buildSectionHeader(theme, 'Connection'),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Camera Name',
                    prefixIcon: Icon(Icons.camera_alt_outlined),
                    border: OutlineInputBorder(),
                  ),
                  controller: nameController,
                  onChanged: (v) => widget.service.name = v,
                ),
                const SizedBox(height: 16),
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Server URL',
                    prefixIcon: Icon(Icons.link),
                    border: OutlineInputBorder(),
                  ),
                  controller: serverController,
                  onChanged: (v) => widget.service.server = v,
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 24),
        _buildSectionHeader(theme, 'Performance'),
        Card(
          child: Column(
            children: [
              SwitchListTile(
                secondary: const Icon(Icons.battery_saver),
                value: lowPowerMode,
                onChanged: (v) => setState(() => lowPowerMode = v),
                title: const Text('Low Power Mode'),
              ),
              const Divider(height: 1),
              SwitchListTile(
                secondary: const Icon(Icons.mic),
                value: audioStreaming,
                onChanged: (v) => setState(() { audioStreaming = v; widget.service.audioStreaming = v; }),
                title: const Text('Audio Streaming'),
              ),
              const Divider(height: 1),
              SwitchListTile(
                secondary: const Icon(Icons.network_check),
                value: adaptiveBitrate,
                onChanged: (v) => setState(() => adaptiveBitrate = v),
                title: const Text('Adaptive Bitrate'),
              ),
            ],
          ),
        ),
        
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: FilledButton.icon(
            onPressed: () => widget.service.setScreen(AppScreen.welcome),
            icon: const Icon(Icons.check),
            label: const Text('Save & Return'),
          ),
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildSectionHeader(ThemeData theme, String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: theme.textTheme.titleMedium?.copyWith(
          color: theme.colorScheme.primary,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
