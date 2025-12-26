import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter/services.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

enum AppScreen { welcome, qr, connecting, connected, camera, lock, settings }

class WebRTCService extends ChangeNotifier {
  String server = 'http://192.168.1.184:3001';
  String token = '';
  String deviceId = '';
  String name = 'Mobile Camera';
  bool paired = false;
  AppScreen current = AppScreen.welcome;

  final RTCVideoRenderer renderer = RTCVideoRenderer();
  MediaStream? localStream;
  RTCPeerConnection? pc;
  WebSocket? ws;
  String remoteId = '';
  Timer? heartbeatTimer;
  DateTime? streamStart;
  bool audioStreaming = false;
  String resolution = '1080p';
  String frameRate = '30 fps';
  bool useBackCamera = true;
  int batteryLevel = 0;
  String connectionType = 'Unknown';
  Timer? statusTimer;

  bool _hasSaved = false;
  bool get hasSaved => _hasSaved;

  WebRTCService() {
    renderer.initialize();
    _loadSaved();
  }

  Future<void> _loadSaved() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final s = prefs.getString('server');
      final t = prefs.getString('token');
      final d = prefs.getString('deviceId');
      final n = prefs.getString('name');
      if (s != null && s.isNotEmpty && t != null && t.isNotEmpty) {
        server = s;
        token = t;
        if (d != null) deviceId = d;
        if (n != null) name = n;
        _hasSaved = true;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> _saveConnection() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('server', server);
      await prefs.setString('token', token);
      await prefs.setString('deviceId', deviceId);
      await prefs.setString('name', name);
      _hasSaved = true;
      notifyListeners();
    } catch (_) {}
  }


  Future<void> _clearConnection() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('server');
      await prefs.remove('token');
      await prefs.remove('deviceId');
      await prefs.remove('name');
      _hasSaved = false;
      notifyListeners();
    } catch (_) {}
  }


  @override
  void dispose() {
    heartbeatTimer?.cancel();
    statusTimer?.cancel();
    WakelockPlus.disable();
    try { renderer.dispose(); } catch (_) {}
    try { pc?.close(); } catch (_) {}
    try { ws?.close(); } catch (_) {}
    super.dispose();
  }

  void setScreen(AppScreen s) {
    current = s;
    notifyListeners();
  }

  Future<void> pair() async {
    print("samji Pairing with server: $server");
    try {
      final uri = Uri.parse('$server/api/camera/register');
      final res = await http.post(uri, headers: {'Content-Type': 'application/json'}, body: jsonEncode({'token': token, 'deviceId': deviceId, 'name': name}));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        print("samji Pairing successful");
        print(res.body);
        try {
          final obj = jsonDecode(res.body);
          final data = obj is Map ? obj['data'] : null;
          if (data is Map && data['id'] is String) {
            deviceId = data['id'] as String;
          }
        } catch (_) {}
        paired = true;
        _startHeartbeat();
        await _ensureWs();
        await _initStatus();
        setScreen(AppScreen.connected);
      }
    } catch (_) {
      print("samji Pairing failed");
    }
  }

  Future<void> _initStatus() async {
    await _updateBattery();
    await _updateConnectivity();
    statusTimer?.cancel();
    statusTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
      await _updateBattery();
      await _updateConnectivity();
    });
  }

  static const _channel = MethodChannel('versevision/device');
  final Battery _battery = Battery();

  Future<void> _updateBattery() async {
    try {
      final lvl = await _battery.batteryLevel;
      batteryLevel = (lvl).clamp(0, 100);
      notifyListeners();
    } catch (_) {
      try {
         final lvl = await _channel.invokeMethod<int>('batteryLevel');
         batteryLevel = (lvl ?? 0).clamp(0, 100);
         notifyListeners();
      } catch (_) {}
    }
  }

  Future<void> _updateConnectivity() async {
    try {
      final rssi = await _channel.invokeMethod<int>('wifiRssi');
      if (rssi != null) {
        connectionType = rssi > -55 ? 'WiFi Strong' : rssi > -70 ? 'WiFi Medium' : 'WiFi Weak';
      } else {
        connectionType = 'Unknown';
      }
      notifyListeners();
    } catch (_) {}
  }

  void _startHeartbeat() {
    heartbeatTimer?.cancel();
    heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (_) async {
      print("samji Sending heartbeat");
      try {
        final signal = _getSignalStrength();
        await http.post(
          Uri.parse('$server/api/camera/heartbeat'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'token': token,
            'battery': batteryLevel,
            'signal': signal
          })
        );
      } catch (_) {}
    });
  }

  int _getSignalStrength() {
    if (connectionType == 'WiFi Strong') return 4;
    if (connectionType == 'WiFi Medium') return 3;
    if (connectionType == 'WiFi Weak') return 2;
    return 0;
  }

  Future<void> initWebRTC() async {
    print("samji Initializing WebRTC");
    await WakelockPlus.enable();
    await _ensureWs();
    final facing = useBackCamera ? 'environment' : 'user';
    final dims = resolution == '1080p' ? {'ideal': 1920} : {'ideal': 1280};
    final fps = frameRate.contains('60') ? {'ideal': 60} : {'ideal': 30};
    localStream = await navigator.mediaDevices.getUserMedia({
      'audio': audioStreaming,
      'video': {'facingMode': facing, 'width': dims, 'height': resolution == '1080p' ? {'ideal': 1080} : {'ideal': 720}, 'frameRate': fps}
    });
    renderer.srcObject = localStream;
    final rtcConfig = await _loadRtcConfig();
    pc = await createPeerConnection(rtcConfig);
    for (final track in localStream!.getTracks()) { pc!.addTrack(track, localStream!); }
    pc!.onIceCandidate = (c) {
      if (remoteId.isNotEmpty) {
        _sendSig({'type': 'candidate', 'to': remoteId, 'from': _peerId(), 'candidate': {'candidate': c.candidate, 'sdpMid': c.sdpMid, 'sdpMLineIndex': c.sdpMLineIndex}});
      }
    };
    streamStart = DateTime.now();
  }

  Future<Map<String, dynamic>> _loadRtcConfig() async {
    try {
      final res = await http.get(Uri.parse('$server/api/webrtc/config'));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        print("samji Loading RTC config successful ${res.body}");
        final json = jsonDecode(res.body);
        final iceServers = (json['data']?['iceServers'] as List?) ?? [];
        return {'iceServers': iceServers};
      }
    } catch (_) {}
    return {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};
  }

  String _sigUrl() {
    final u = Uri.parse(server);
    final scheme = u.scheme == 'https' ? 'wss' : 'ws';
    final host = u.host.isNotEmpty ? u.host : u.toString();
    final port = u.hasPort ? ':${u.port}' : '';
    return '$scheme://$host$port/ws';
  }

  String _peerId() {
    if (deviceId.isNotEmpty) return deviceId;
    deviceId = 'mobile-${DateTime.now().millisecondsSinceEpoch.toString().substring(9)}';
    return deviceId;
  }

  Future<void> _ensureWs() async {
    if (ws != null) return;
    try {
      ws = await WebSocket.connect(_sigUrl());
      _sendSig({'type': 'register', 'id': _peerId()});
      ws!.listen((data) async {
        try {
          final msg = jsonDecode(data as String);
          final t = msg['type'] as String?;
          if (t == 'disconnect') {
            print("samji Remote disconnect received");
            remoteId = '';
            try { await pc?.close(); } catch (_) {}
            pc = null;
            try { localStream?.getTracks().forEach((t) => t.stop()); } catch (_) {}
            localStream = null;
            renderer.srcObject = null;
            _clearConnection();
            disconnect();
          } else if (t == 'connect' && msg['from'] is String) {
            remoteId = msg['from'] as String;
          } else if (t == 'offer' && msg['from'] is String && msg['sdp'] != null && pc != null) {
            remoteId = msg['from'] as String;
            final sdp = msg['sdp'];
            await pc!.setRemoteDescription(RTCSessionDescription(sdp['sdp'] as String, sdp['type'] as String));
            final ans = await pc!.createAnswer();
            await pc!.setLocalDescription(ans);
            _sendSig({'type': 'answer', 'to': remoteId, 'from': _peerId(), 'sdp': {'type': ans.type, 'sdp': ans.sdp}});
          } else if (t == 'candidate' && msg['candidate'] != null && pc != null) {
            final c = msg['candidate'];
            await pc!.addCandidate(RTCIceCandidate(c['candidate'] as String?, c['sdpMid'] as String?, c['sdpMLineIndex'] as int?));
          }
        } catch (_) {}
      });
    } catch (_) {}
  }

  void _sendSig(Map<String, dynamic> payload) {
    print("samji Sending signal: $payload");
    try { ws?.add(jsonEncode(payload)); } catch (_) {}
  }

  void applyScannedText(String text) {
    String? scannedServer;
    String? scannedToken;
    String? scannedDeviceId;
    String? scannedName;
    try {
      final uri = Uri.tryParse(text);
      if (uri != null) {
        final q = uri.queryParameters;
        scannedServer = q['server'] ?? (uri.scheme.startsWith('http') ? uri.toString() : null);
        scannedToken = q['token'] ?? (uri.fragment.isNotEmpty ? Uri.splitQueryString(uri.fragment)['token'] : null);
        scannedDeviceId = q['deviceId'] ?? q['device_id'];
        scannedName = q['name'];
      }
    } catch (_) {}
    if (scannedServer == null || scannedToken == null) {
      try {
        final obj = jsonDecode(text);
        if (obj is Map) {
          scannedServer = scannedServer ?? (obj['server'] as String?);
          scannedToken = scannedToken ?? (obj['token'] as String?);
          scannedDeviceId = scannedDeviceId ?? (obj['deviceId'] as String?) ?? (obj['device_id'] as String?);
          scannedName = scannedName ?? (obj['name'] as String?);
        }
      } catch (_) {}
    }
    if (scannedServer == null || scannedToken == null) {
      final parts = text.split(RegExp('[;&\n]'));
      for (final p in parts) {
        final i = p.indexOf('=');
        if (i > 0) {
          final k = p.substring(0, i).trim().toLowerCase();
          final v = p.substring(i + 1).trim();
          if (k == 'server') scannedServer = v;
          if (k == 'token') scannedToken = v;
          if (k == 'deviceid' || k == 'device_id') scannedDeviceId = v;
          if (k == 'name') scannedName = v;
        }
      }
    }
    if (scannedToken == null && text.isNotEmpty) scannedToken = text.trim();
    if (scannedServer != null) server = scannedServer;
    if (scannedToken != null) token = scannedToken;
    if (scannedDeviceId != null) deviceId = scannedDeviceId;
    if (scannedName != null) name = scannedName;
    _saveConnection();
    notifyListeners();
    if (!paired && server.isNotEmpty && token.isNotEmpty) {
      setScreen(AppScreen.connecting);
      pair();
    }
  }

  void connectSaved() {
    if (_hasSaved && !paired) {
      setScreen(AppScreen.connecting);
      pair();
    }
  }

  Future<void> flipCamera() async {
    useBackCamera = !useBackCamera;
    final nextFacing = useBackCamera ? 'environment' : 'user';
    final dims = resolution == '1080p' ? {'ideal': 1920} : {'ideal': 1280};
    final fps = frameRate.contains('60') ? {'ideal': 60} : {'ideal': 30};
    final prev = localStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        'audio': audioStreaming,
        'video': {'facingMode': nextFacing, 'width': dims, 'height': resolution == '1080p' ? {'ideal': 1080} : {'ideal': 720}, 'frameRate': fps}
      });
      renderer.srcObject = localStream;
      if (pc != null) {
        for (final track in prev?.getTracks() ?? []) { try { track.stop(); } catch (_) {} }
        final senders = await pc!.getSenders();
        for (final s in senders) {
          final kind = s.track?.kind;
          MediaStreamTrack? replacement;
          for (final t in localStream!.getTracks()) { if (t.kind == kind) { replacement = t; break; } }
          if (replacement != null) { await s.replaceTrack(replacement); }
        }
      }
    } catch (_) {}
  }

  void disconnect() {
    print("samji Disconnecting");
    heartbeatTimer?.cancel();
    try { pc?.close(); } catch (_) {}
    pc = null;
    try { renderer.srcObject = null; } catch (_) {}
    try { ws?.close(); } catch (_) {}
    paired = false;
    setScreen(AppScreen.welcome);
  }

  String durationText() {
    if (streamStart == null) return '00:00:00';
    final d = DateTime.now().difference(streamStart!);
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(d.inHours)}:${two(d.inMinutes % 60)}:${two(d.inSeconds % 60)}';
  }
}
