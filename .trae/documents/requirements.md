# VerseVision - AI-Powered Worship Media Platform

## Project Overview

VerseVision is an intelligent worship media management platform that combines production capabilities similar to OBS Studio with presentation features like EasyWorship, enhanced by AI/ML for automated scripture detection, multi-camera management, and real-time multilingual translation.

## Core Value Proposition

- **Reduced operational complexity**: AI automation minimizes manual scripture lookup
- **Cost-effective production**: Smartphone camera integration eliminates expensive equipment needs  
- **Inclusive worship**: Real-time multi-language translation breaks language barriers
- **Professional output**: Broadcast-quality video mixing and presentation management

## Target Users

- Church media teams and volunteers
- Worship leaders and technical directors
- Multi-lingual congregations
- Churches with limited technical budgets

## Core Features & Technical Specifications

### 1. AI-Powered Scripture Detection & Display

#### Speech Recognition Engine
- **Functionality**: Continuous audio monitoring with real-time speech-to-text transcription
- **Technical Requirements**:
  - Audio input: Multiple sources (microphones, audio mixer feed)
  - Latency: <500ms from speech to detection
  - Accuracy: 95%+ for biblical reference detection
  - Support for various accents and speaking styles
- **Detection Patterns**:
  - Explicit references: "Turn to John 3:16"
  - Implicit references: "As Jesus said in Matthew..."
  - Contextual understanding for biblical vs casual speech

#### Scripture Database & Retrieval
- **Database Specifications**:
  - Complete Bible texts in multiple translations (NIV, KJV, NKJV, ESV, NLT)
  - Structured data format: Book > Chapter > Verse
  - Fast retrieval: <100ms query response time
  - Offline capability: Full local database storage
- **Display Format**: Book name, chapter, verse range with translation name

#### Approval Workflow
- **Manual Approval Mode (Default)**:
  1. AI detects reference and retrieves verse
  2. Preview appears on operator's primary screen
  3. Operator reviews and clicks "Approve" or "Reject"
  4. Approved verses display on output screen
  5. Rejected verses are logged for AI training
- **Auto-Approve Mode**: Toggle with configurable delay (0.5s-5s)

### 2. Multi-Camera Management System

#### Smartphone Camera Integration
- **Platform Support**: iOS 14.0+, Android 10.0+
- **Connection Methods**:
  - WiFi (Primary): QR code pairing, 50-150ms latency
  - USB Tethering (Backup): 20-50ms latency
- **Security**: Encrypted video streams (AES-256), device authentication

#### Camera Management Interface
- **Live Camera Grid View**: 2x2, 3x3, or 4x4 grid with real-time status indicators
- **Camera Controls**: Primary output selection, picture-in-picture, scene presets
- **Video Mixing Features**: Split screen, chroma key, overlays, zoom/pan, audio mixing

### 3. Real-Time Multi-Language Translation

#### Speech-to-Text Translation Pipeline
- **Processing Flow**: Audio capture → Real-time STT → Parallel translation → On-screen display
- **Translation Engine**: ML-based neural machine translation with religious terminology specialization
- **Target Languages**: Yoruba, Hausa, Igbo, French
- **Performance Requirements**: <1 second latency, 90%+ accuracy

#### Translation Display Configuration
- **Layout Options**: Subtitle style, split screen, ticker style
- **Customization**: Font size/style, background transparency, positioning
- **Quality Assurance**: Confidence scores, manual correction interface, translation memory

### 4. Traditional Media Control Features

#### Presentation Management
- PowerPoint/Keynote import and display
- PDF document presentation
- Image/video media library
- Song lyrics display with search
- Countdown timers and clocks
- Lower thirds and announcement overlays

#### Scene Management
- Pre-configured scenes for service segments
- One-click scene transitions
- Automated scene progression (optional)

#### Output Management
- Multiple output destinations (HDMI/SDI, streaming, recording, overflow rooms)
- Independent output configurations
- Preview vs Program output separation

### 5. Cloud Integration & User Management

#### Authentication & User Accounts
- **Requirement**: Mandatory login/signup before accessing Operator UI.
- **Backend**: Laravel-based cloud platform (`website_backend_laravel`).
- **Data Sync**: Option to sync settings and presets to cloud.

#### Subscription Plans & Feature Gating
- **Starter (Free)**
  - 1 Smartphone Camera
  - Basic Scripture Detection
  - Manual Approval Only
  - 2 Translation Languages
  - 720p Output
- **Standard (₦45,000/mo)**
  - Up to 5 Smartphone Cameras
  - Full AI Scripture Detection
  - Auto-Approve Enabled
  - 4 Translation Languages
  - 1080p Full HD Output
  - Cloud Recording (50GB)
- **Professional (₦122,450/mo)**
  - Unlimited Cameras
  - Advanced AI Features & Custom Vocabulary
  - Unlimited Translations
  - 4K Ultra HD Output
  - Cloud Recording (500GB)
  - Multi-campus Sync
- **Enterprise (Custom)**
  - Custom AI Training
  - On-premise Options
  - White-labeling

#### Centralized AI Processing
- **Architecture**: All desktop client requests to OpenAI (transcription, detection) must route through the Cloud Backend.
- **Logging**: Cloud logs all AI requests for usage tracking and model improvement.
- **Payment**: Paystack integration for subscription upgrades directly within the Operator UI.

## System Architecture

### Technology Stack Recommendations

#### Backend
- **Application Framework**: Electron (main process) + Python (AI subprocess)
- **AI/ML Framework**: 
  - Speech Recognition: `faster-whisper` (optimized local inference)
  - NLP for scripture detection: Regex + Keyword matching (Python)
  - Translation: Marian NMT via `ctranslate2` (Offline capable)
- **Database**: SQLite (scripture database), Electron Store (settings)
- **Video Processing**: FFmpeg, WebRTC

#### Frontend
- **UI Framework**: React or Vue.js (if using Electron), Qt (if native)
- **Graphics**: OpenGL/WebGL for real-time video compositing
- **Styling**: Tailwind CSS or Material Design

#### Mobile App (Camera)
- **iOS**: Swift, AVFoundation
- **Android**: Kotlin, Camera2 API
- **Streaming**: WebRTC or custom RTMP implementation

### System Requirements

#### Minimum Specifications
- **OS**: Windows 10/11, macOS 11+, Ubuntu 20.04+
- **CPU**: Intel i5 8th gen / AMD Ryzen 5 3600
- **RAM**: 16GB
- **GPU**: Dedicated GPU with 4GB VRAM
- **Storage**: 10GB free space
- **Network**: 
  - 100 Mbps LAN for camera streaming
  - **Internet Access**: Required for initial app install and **one-time download of translation models**.


#### Recommended Specifications
- **CPU**: Intel i7 10th gen / AMD Ryzen 7 5800X
- **RAM**: 32GB
- **GPU**: NVIDIA RTX 3060 / AMD RX 6700 XT (8GB VRAM)
- **Storage**: 256GB SSD
- **Network**: Gigabit LAN + 5GHz WiFi 6

## UI/UX Design Guidelines

### Design Principles
1. **Clarity Over Complexity**: Prioritize essential controls, advanced features in collapsible panels
2. **Confidence Through Feedback**: Immediate visual confirmation, status indicators, clear error messages
3. **Speed of Operation**: Keyboard shortcuts, one-click access, minimal clicks to execution
4. **Forgiveness**: Undo/redo, preview before output, auto-save
5. **Accessibility**: High contrast mode, scalable UI, screen reader compatibility

### Layout Structure
- **Main Operator Interface**: Primary screen with camera grid, scripture preview, translation controls
- **Secondary Screens**: Output preview, media library, scene management
- **Mobile Interface**: Camera control app with streaming status and positioning guides

## Development Phases

### Phase 1: Core Infrastructure
1. Project setup and development environment
2. Basic UI framework and navigation
3. Scripture database setup with multiple translations
4. Basic camera integration framework

### Phase 2: AI Integration
1. Speech recognition implementation
2. Scripture detection and retrieval system
3. Approval workflow interface
4. Basic translation pipeline

### Phase 3: Advanced Features
1. Multi-camera management with smartphone integration
2. Real-time translation display
3. Scene management system
4. Output configuration and streaming

### Phase 4: Polish & Optimization
1. Performance optimization
2. UI/UX refinements
3. Mobile app development
4. Testing and quality assurance