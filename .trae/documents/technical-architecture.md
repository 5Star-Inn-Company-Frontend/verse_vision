# VerseVision Technical Architecture

## System Overview

VerseVision is built as a cross-platform desktop application with a modular architecture that supports AI-powered features, real-time video processing, and multi-device integration.

## Architecture Components

### 1. Core Application Layer

#### Desktop Application (Electron + React)
- **Framework**: Electron for cross-platform compatibility
- **UI Library**: React with TypeScript for type safety
- **State Management**: Zustand for lightweight state management
- **Styling**: Tailwind CSS for consistent design system
- **Video Processing**: WebRTC for real-time streaming, FFmpeg for processing

#### Key Modules:
```
src/
├── components/          # Reusable UI components
├── pages/              # Main application screens
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── services/           # Core business logic
├── types/              # TypeScript type definitions
└── stores/             # Zustand state management
```

### 2. AI/ML Services Layer

#### Speech Recognition Service
- **Engine**: `faster-whisper` (optimized implementation of OpenAI Whisper).
- **Model**: `medium` or `large-v3` (quantized for CPU/GPU inference).
- **Processing**: Real-time audio streaming with VAD (Voice Activity Detection).
- **Performance**: <500ms latency on standard consumer hardware.

#### Scripture Detection Service
- **NLP Framework**: Regex pattern matching + Contextual keyword analysis.
- **Pattern Matching**: Detects "Book Chapter:Verse" patterns in transcribed text.
- **Context Analysis**: Filters false positives based on surrounding context.
- **Data**: Local SQLite database for rapid verse retrieval.

#### Translation Service
- **Engine**: Marian NMT models running on `ctranslate2`.
- **Architecture**: **On-Demand Download**. Models are not bundled to save space.
- **Process**: 
  1. User selects a language (e.g., French).
  2. System checks for local model presence.
  3. If missing, downloads model components from Hugging Face.
  4. Initializes translator in a separate thread.
- **Performance**: <1 second latency, offline capability after download.

### 3. Video Processing Layer

#### Camera Integration
- **Protocol**: WebRTC for low-latency streaming
- **Mobile Apps**: Native iOS/Android apps for camera streaming
- **Connection**: WiFi (primary) + USB tethering (backup)
- **Security**: AES-256 encryption with token-based authentication

#### Video Mixing Engine
- **Library**: FFmpeg with hardware acceleration
- **Features**: 
  - Multi-camera switching and mixing
  - Picture-in-picture composition
  - Lower thirds and overlays
  - Real-time effects and transitions
- **Performance**: 60fps at 1080p minimum

### 4. Data Layer

#### Scripture Database
- **Engine**: SQLite for local storage
- **Schema**: Optimized for fast verse retrieval
- **Content**: Multiple Bible translations (NIV, KJV, NKJV, ESV, NLT)
- **Performance**: <100ms query response time

#### Configuration Storage
- **Engine**: PostgreSQL (if cloud features enabled)
- **Local Storage**: Electron store for offline settings
- **Sync**: Optional cloud synchronization

### 5. Communication Layer

#### Real-time Communication
- **Protocol**: WebSocket for bidirectional communication
- **Fallback**: HTTP polling for restrictive networks
- **Mobile Integration**: QR code-based pairing system

#### API Layer
- **REST API**: For scripture retrieval and configuration
- **GraphQL**: For complex queries (optional)
- **WebRTC Signaling**: For camera connection management

### 6. Cloud Services Layer (New)

#### Laravel Backend (`website_backend_laravel`)
- **Role**: Central authentication, subscription management, and AI proxy.
- **Database**: MySQL (Users, Subscriptions, AI Logs).
- **Payment Gateway**: Paystack (via API).
- **AI Proxy**: Intercepts OpenAI requests from desktop clients, logs them, and forwards to OpenAI.

#### Cloud Sync
- **Settings Sync**: JSON-based sync of user preferences.
- **Auth Flow**: JWT-based authentication for desktop client access.

## Technology Stack Details

### Frontend Technologies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0",
    "lucide-react": "^0.263.0",
    "react-router-dom": "^6.14.0"
  }
}
```

### Backend & AI Technologies
```json
{
  "dependencies": {
    "python": "^3.10.0",
    "faster-whisper": "^1.0.0",
    "ctranslate2": "^4.0.0",
    "transformers": "^4.30.0",
    "torch": "^2.0.0",
    "ffmpeg-static": "^5.2.0",
    "sqlite3": "^5.1.0",
    "websocket": "^1.0.34"
  }
}
```

### Development Tools
```json
{
  "devDependencies": {
    "vite": "^4.4.0",
    "electron-builder": "^24.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.45.0",
    "prettier": "^3.0.0"
  }
}
```

## System Integration Architecture

### 1. Audio Processing Pipeline
```
Audio Input → Preprocessing → Whisper STT → Text Analysis → Scripture Detection → Verse Retrieval → Display
```

### 2. Video Processing Pipeline
```
Camera Streams → WebRTC → Video Mixer → Effects/Overlays → Output → Multiple Destinations
```

### 3. Translation Pipeline
```
Speech → STT → Translation Engine → Text Formatting → Display Overlay → Screen Output
```

## Security Architecture

### Data Protection
- **Encryption**: AES-256 for all data transmission
- **Authentication**: JWT tokens for API access
- **Local Storage**: Encrypted configuration files
- **Network Security**: Isolated network for camera streams

### Privacy Considerations
- **Offline-First**: All AI processing done locally
- **No Cloud Required**: Core functionality works without internet
- **Optional Cloud**: Only for advanced features like analytics
- **Data Retention**: User-configurable data retention policies

## Performance Optimization

### Memory Management
- **Video Streams**: Efficient buffer management for multiple cameras
- **AI Models**: Model quantization for faster inference
- **Database**: Indexed queries for scripture lookup
- **Caching**: Aggressive caching for frequently accessed data

### Latency Optimization
- **Audio Pipeline**: Chunk-based processing for real-time STT
- **Video Pipeline**: Hardware acceleration for video mixing
- **Network**: Local network prioritization for camera streams
- **UI**: Virtualized lists for large media libraries

## Scalability Considerations

### Horizontal Scaling
- **Camera Support**: Up to 8 simultaneous camera streams
- **Translation**: 4 languages processed in parallel
- **Outputs**: Multiple simultaneous output destinations
- **Users**: Single operator interface (multi-user in future)

### Resource Management
- **CPU**: Multi-threaded processing for AI and video
- **GPU**: Hardware acceleration for video processing
- **Memory**: Dynamic allocation based on active features
- **Storage**: Configurable local storage limits

## Deployment Architecture

### Desktop Application
- **Packaging**: Electron Builder for cross-platform builds
- **Distribution**: Direct download + auto-updater
- **Installation**: One-click installer with dependencies
- **Updates**: Automatic background updates

### Mobile Companion Apps
- **iOS**: App Store distribution
- **Android**: Google Play Store + APK download
- **Features**: Camera streaming + basic controls
- **Pairing**: QR code-based secure pairing

## Monitoring & Analytics

### Performance Monitoring
- **Metrics**: Latency, accuracy, resource usage
- **Logging**: Structured logging for debugging
- **Error Tracking**: Sentry integration for crash reporting
- **User Analytics**: Optional usage analytics (privacy-compliant)

### Health Checks
- **System Status**: Real-time system health dashboard
- **Camera Status**: Connection and stream quality monitoring
- **AI Performance**: Accuracy and processing time tracking
- **Network**: Bandwidth and latency monitoring

## Future Enhancements

### Cloud Integration
- **Sync**: Cross-device configuration synchronization
- **Backup**: Cloud backup of settings and media
- **Analytics**: Advanced usage analytics and insights
- **Updates**: Cloud-based model updates

### Advanced AI Features
- **Speaker Recognition**: Multi-speaker support
- **Context Awareness**: Better biblical context understanding
- **Predictive Display**: Anticipate scripture needs
- **Voice Commands**: Hands-free operation

### Extended Platform Support
- **Web Interface**: Browser-based control panel
- **Tablet Apps**: iPad/Android tablet control apps
- **Remote Operation**: Internet-based remote control
- **API Integration**: Third-party integrations