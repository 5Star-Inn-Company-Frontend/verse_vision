# VerseVision

VerseVision is an AI-powered tool designed for Bible study, teaching, and live worship broadcasting. It leverages advanced speech recognition and translation models to provide real-time captions and scripture detection, completely offline.

## Features

- **Real-time Transcription**: Uses OpenAI's Whisper model (running locally) to transcribe speech to text with high accuracy.
- **Offline Operation**: All core features, including transcription and scripture detection, run locally on your machine without requiring an internet connection (after initial setup).
- **Optional Translation**: Support for offline translation (e.g., English to French) using Marian NMT models.
  - *Note: Translation models are downloaded on-demand to keep the initial app size small.*
- **Scripture Detection**: Automatically detects Bible references in speech and displays the corresponding verses.
- **Broadcasting Support**: 
  - **OBS Studio**: Capture the window or use the browser source URL.
  - **EasyWorship**: Integration via web media item or chroma key.
  - **Lower Thirds**: Transparent background mode for professional overlays.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python 3.10+
- `pip` (Python package manager)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-repo/versevision.git
    cd versevision
    ```

2.  Install Node.js dependencies:
    ```bash
    npm install
    ```

3.  Install Python dependencies:
    ```bash
    pip install -r python/requirements.txt
    ```

### Development

To run the application in development mode:

```bash
npm run dev
```

This command concurrently starts:
- The React frontend (Vite)
- The Electron main process
- The Python offline server (if configured for dev)

### Building the Application

To build the standalone application for your platform:

**Windows:**
```bash
npm run electron:win
```

**macOS:**
```bash
npm run electron:mac
```

**Linux:**
```bash
npm run electron:linux
```

**General Build Command:**
```bash
npm run app:build
```
*This command builds the Python backend, the React frontend, and prepares the Electron assets.*

## Architecture

VerseVision uses a hybrid architecture:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS.
- **Backend**: Python (Flask/FastAPI-like structure) running `faster-whisper` and `ctranslate2` for AI tasks.
- **Electron**: Wraps everything into a native desktop application.

### Model Management

- **Whisper (Transcription)**: The base model is downloaded during the build process and bundled with the app.
- **Marian (Translation)**: These models are **optional**. Users can trigger the download from within the application interface. This reduces the installer size by ~300MB per language pair.

## License

MIT
