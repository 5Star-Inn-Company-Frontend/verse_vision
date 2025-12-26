# VerseVision Camera (Mobile)

High-quality mobile camera app for VerseVision. Streams over WebRTC, pairs via QR code or manual settings, and reports battery and signal to the VerseVision platform.

## Overview

The app turns a phone into a live camera source for VerseVision:
- Pair to the VerseVision server (QR or manual)
- Start the camera feed (WebRTC)
- Send heartbeats with battery and Wi‑Fi signal strength
- Control resolution, frame rate, audio, and camera facing

## Architecture & Flow

1. Pairing
   - Scan a QR code or enter server URL/token manually.
   - Registers with backend: `POST /api/camera/register` with `token`, `deviceId`, `name`.
   - Persists connection info using `shared_preferences`.

2. Status & Heartbeat
   - Reads battery via `battery_plus` or platform channel fallback.
   - Reads Wi‑Fi RSSI via platform `MethodChannel('versevision/device')`.
   - Sends heartbeat every 15s: `POST /api/camera/heartbeat` with `{ token, battery, signal }`.

3. Signaling & Streaming
   - Fetches ICE servers: `GET /api/webrtc/config`.
   - Connects to the signaling WebSocket at `ws(s)://<server-host>/ws`.
   - Responds to offers with answers; sends ICE candidates.
   - Captures media with chosen resolution and frame rate and streams via `flutter_webrtc`.

## UI Screens

- Welcome: connect via QR or go to Settings; reconnect if a saved connection exists.
- QR Scan: uses `mobile_scanner` to parse server/token/device/name from QR.
- Connected: shows server, battery, network, resolution; start feed.
- Camera: live preview with overlays, controls (Settings, Lock, Flip, Grid), stats, duration.
- Lock: black screen to save battery (OLED‑friendly).
- Settings: camera name, server URL, resolution (1080p/720p), frame rate (30/60 fps), audio streaming toggle.

## Dependencies

Defined in `pubspec.yaml`:
- `camera`, `flutter_webrtc`, `http`, `mobile_scanner`, `shared_preferences`, `battery_plus`, `wakelock_plus`, `flutter_launcher_icons`

## Setup

1. Install Flutter SDK (3.x).
2. Fetch packages:
   ```bash
   flutter pub get
   ```
3. Optional: generate launcher icons (uses `assets/icon.png`):
   ```bash
   flutter pub run flutter_launcher_icons
   ```
4. Run the app on a device:
   ```bash
   flutter run
   ```

## Pairing Instructions

### Option A: QR Code (Recommended)
- Open the VerseVision desktop app and show the camera pairing QR.
- The QR may encode either a URL with query params or JSON. Supported formats:
  - URL: `https://host:port?server=http://<server>&token=<token>&deviceId=<id>&name=<cameraName>`
  - JSON: `{ "server": "http://<server>", "token": "<token>", "deviceId": "<id>", "name": "<cameraName>" }`
- Scan the code; the app will save the connection and attempt pairing automatically.

### Option B: Manual
- Go to Settings and set:
  - `Camera Name`
  - `Server URL` (e.g., `http://192.168.1.184:3001`)
- Return to Welcome and tap `Connect to Platform` to scan a token or provide one as text.

## Starting a Live Feed

1. After pairing, open `Connected` and tap `Start Camera Feed`.
2. The app will:
   - Enable wakelock
   - Open WebSocket signaling (`/ws`)
   - Capture media with chosen constraints
   - Create a `RTCPeerConnection` and send tracks
   - Handle remote offer and reply with an answer
3. Use `Flip` to switch front/back cameras, `Grid` to toggle overlay, `Lock` to save battery.

## Heartbeat & Status Reporting

- Interval: 15 seconds
- Payload: `{ token, battery: 0-100, signal: 0-4 }`
- Signal mapping:
  - `WiFi Strong` → `4`
  - `WiFi Medium` → `3`
  - `WiFi Weak` → `2`
  - Unknown/Other → `0`
- Battery is read via `battery_plus` with a platform channel fallback.

## Permissions

Android `AndroidManifest.xml` includes:
- `ACCESS_WIFI_STATE`, `ACCESS_NETWORK_STATE`

In addition, the app requires (typically added by plugins or should be added if missing):
- `INTERNET` (streaming, signaling)
- `CAMERA` (capture)
- `RECORD_AUDIO` (if audio streaming is enabled)
- `WAKE_LOCK` (prevent sleep during streaming)

## Build & Release

Android (APK):
```bash
flutter build apk --release
```

iOS:
- Open `ios/` in Xcode and configure signing.
- Build via Xcode or:
```bash
flutter build ios --release
```

## Troubleshooting

- Cannot connect:
  - Verify `Server URL` is reachable from the phone (same network).
  - Check firewall rules for `HTTP` and `WebSocket` ports.
  - Confirm token is valid and not expired.
- No video:
  - Ensure camera permission is granted.
  - Try switching camera (`Flip`).
- No audio:
  - Enable `Audio Streaming` in Settings and grant microphone permission.
- Signal shows `0`:
  - Wi‑Fi RSSI may be unavailable on some devices; move closer to AP.

## Data Usage & Privacy

What the app collects and uses:
- Video and optionally audio: captured locally and streamed to VerseVision via WebRTC.
- Device info you provide: `name`, `server URL`, `token`, and generated `deviceId` to identify the camera.
- Operational metrics: battery level (0–100) and Wi‑Fi signal (0–4) sent in heartbeats.

Where data is stored:
- On device: `server`, `token`, `deviceId`, and `name` in `SharedPreferences` for reconnect convenience.
- On server: camera registration details and latest battery/signal in the platform database for monitoring.

How data is transmitted and protected:
- Streaming uses WebRTC with DTLS‑SRTP encryption between peers; signaling occurs over WebSocket.
- Tokens authenticate camera registration and heartbeats.

What we do NOT collect:
- No contacts, messages, GPS location, or files from your device.
- No background data beyond heartbeats and streaming while the app is active.

Usage purpose:
- Operate live streaming and provide status monitoring to operators (battery, connectivity).
- Improve reliability by adjusting settings and identifying connection issues.

Retention & control:
- Device‑side settings persist until you clear app data.
- Server‑side metrics are retained to show camera status; you may request removal by clearing the camera registration.

Third parties:
- Data is not sold to third parties. WebRTC may use public STUN/TURN services for connectivity if configured.

## Code References

- Heartbeat & status: `lib/services/webrtc_service.dart` (pairing, heartbeat, battery, connectivity)
- WebRTC setup: `lib/services/webrtc_service.dart` (ICE config, signaling, peer connection)
- UI screens: `lib/screens/*` (`welcome.dart`, `qr.dart`, `connected.dart`, `camera.dart`, `lock.dart`, `settings.dart`)
