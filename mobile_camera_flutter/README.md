# VerseVision Mobile (Camera & Companion)

A dual-purpose mobile application for the VerseVision ecosystem. It serves as both a high-quality **WebRTC Camera Source** for the VerseVision desktop platform and a **Standalone Verse Companion** for personal scripture transcription and study.

## Features Overview

### 1. Verse Companion (Standalone Mode)
A personal assistant that listens to speech (sermons, conversations) and automatically detects and displays referenced Bible verses.

- **Real-time Transcription**:
  - **Local Mode (Default)**: Uses on-device speech recognition (offline, free, unlimited).
  - **Cloud Mode**: Uses advanced AI (ElevenLabs) for high-accuracy transcription (requires subscription).
- **Scripture Detection**: Automatically identifies Bible references (e.g., "John 3:16") and displays the text.
- **Multi-Version Support**: Switch between KJV, NKJV, NIV, ESV, and CSB.
- **Session History**:
  - View a log of all detected verses in the current session.
  - Save favorite verses to a persistent list.
  - Copy or share session summaries.
- **Smart Features**:
  - **Voice Activity Detection (VAD)**: Filters out silence to save battery and data.
  - **Continuous Listening**: Automatically restarts listening loop in local mode.
  - **Subscription Management**: Handles Free vs Professional plans with in-app upgrade flows.

### 2. VerseVision Camera (WebRTC Mode)
Turns your phone into a live camera source for the VerseVision desktop platform.

- **High-Quality Streaming**: WebRTC-based video/audio streaming.
- **Easy Pairing**: Scan a QR code from the desktop app to connect.
- **Remote Monitoring**: Reports battery level and Wi-Fi signal strength to the desktop.
- **Controls**: Toggle resolution (720p/1080p), frame rate (30/60fps), and camera facing.
- **OLED Saver**: "Lock" screen mode to save battery while streaming.

---

## Architecture & Flows

### Verse Companion (Standalone)
- **Transcription**:
  - **Local**: Uses `speech_to_text` package for continuous on-device recognition.
  - **Cloud**: Records audio chunks using `record`, filters silence via amplitude analysis, and sends to `POST /api/ai/transcribe`.
- **Scripture Lookup**:
  - Regex-based parsing of transcribed text.
  - Local JSON Bible data for instant text retrieval.
- **State Management**:
  - `StandaloneScreen` manages the listening state, UI updates, and mode switching.
  - `LocalTranscriptionService` handles the continuous speech recognition loop.

### VerseVision Camera (WebRTC)
- **Signaling**: Connects to `ws(s)://<server-host>/ws` for WebRTC negotiation.
- **Peer Connection**: Uses `flutter_webrtc` for media streaming.
- **Heartbeat**: Sends status updates every 15s via `POST /api/camera/heartbeat`.

---

## Dependencies

Key packages defined in `pubspec.yaml`:

- **Core**: `http`, `shared_preferences`, `permission_handler`
- **Camera/Streaming**: `camera`, `flutter_webrtc`, `mobile_scanner`, `wakelock_plus`
- **Transcription/Audio**: `speech_to_text`, `record`, `url_launcher`
- **System**: `battery_plus`, `flutter_launcher_icons`

---

## Setup & Installation

1. **Install Flutter SDK** (3.x).
2. **Get Dependencies**:
   ```bash
   flutter pub get
   ```
3. **Run on Device**:
   ```bash
   flutter run
   ```

### Permissions
The app requires the following permissions:
- **Microphone**: For transcription and audio streaming.
- **Camera**: For WebRTC streaming and QR scanning.
- **Internet**: For server communication and cloud transcription.
- **Wake Lock**: To keep the screen/process active during sessions.

---

## Usage Guide

### Verse Companion (Standalone)
1. **Start**: Launch app and tap "Verse Companion" (or "Standalone Mode").
2. **Listen**: Tap the microphone icon.
   - **Default**: Starts in **Local Mode** (offline icon).
   - **Switch**: Tap the Cloud/Local toggle button in the top bar to switch modes.
3. **Login**: Required for Cloud Mode. Enter credentials to access professional features.
4. **History**: Tap the History icon to view/save/share detected verses.

### VerseVision Camera (Pairing)
1. **Pairing**:
   - Open VerseVision Desktop > Camera Source > "Add Camera".
   - Scan the QR code with this app.
   - Or enter URL/Token manually in Settings.
2. **Streaming**:
   - Once connected, tap "Start Camera Feed".
   - Use "Flip" to switch cameras or "Lock" to save screen power.

---

## Build & Release

**Android (APK)**:
```bash
flutter build apk --release
```

**iOS**:
```bash
flutter build ios --release
```

## Troubleshooting

- **Microphone stops in Local Mode**: The app automatically attempts to restart the listening loop. Ensure the app is in the foreground.
- **Cloud Mode "Plan Limit"**: If you hit the Free tier limit, upgrade via the dialog or switch to Local Mode (unlimited).
- **Connection Issues**: Ensure phone and desktop are on the same network (for Camera mode) or have internet access (for Cloud transcription).

---

## Privacy & Data

- **Audio**:
  - **Local Mode**: Processed entirely on-device. No audio leaves your phone.
  - **Cloud Mode**: Short audio chunks are sent to the secure API for transcription and immediately discarded after processing.
- **Camera**: Video is streamed directly to your paired VerseVision desktop instance via WebRTC (P2P where possible).
- **Personal Data**: We store email/token for login and session history locally on your device.

---

## Code References

- **Standalone/Companion**: `lib/screens/standalone.dart`
- **Transcription Services**: `lib/services/local_transcription_service.dart`, `lib/services/cloud_api_service.dart`
- **WebRTC/Camera**: `lib/services/webrtc_service.dart`
- **Scripture Logic**: `lib/services/scripture_service.dart`
