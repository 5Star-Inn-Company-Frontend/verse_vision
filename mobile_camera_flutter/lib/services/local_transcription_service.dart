import 'package:speech_to_text/speech_to_text.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:flutter/foundation.dart';

class LocalTranscriptionService {
  final SpeechToText _speechToText = SpeechToText();
  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;
  bool get isListening => _speechToText.isListening;
  Function(String)? _statusListener;

  Future<bool> init() async {
    if (_isInitialized) return true;
    try {
      _isInitialized = await _speechToText.initialize(
        onError: (error) => debugPrint('Local STT Error: $error'),
        onStatus: (status) {
          debugPrint('Local STT Status: $status');
          _statusListener?.call(status);
        },
      );
      return _isInitialized;
    } catch (e) {
      debugPrint('Local STT Init Exception: $e');
      return false;
    }
  }

  Future<void> startListening({
    required Function(String) onResult,
    required Function(String) onStatus,
  }) async {
    _statusListener = onStatus;
    if (!_isInitialized) await init();
    
    if (_isInitialized) {
      SpeechListenOptions options =SpeechListenOptions(
        listenMode: ListenMode.dictation,
        partialResults: true,
        cancelOnError: false
      );
      await _speechToText.listen(
        onResult: (SpeechRecognitionResult result) {
          if (result.finalResult || result.alternates.isNotEmpty) {
             onResult(result.recognizedWords);
          }
        },
        // listenFor: const Duration(seconds: 60),
        // pauseFor: const Duration(seconds: 10),
        listenOptions: options
      );
      // onStatus('Listening (Local)...'); // Removed as status is now handled via listener
    }
  }

  Future<void> stopListening() async {
    await _speechToText.stop();
  }
  
  Future<void> cancel() async {
    await _speechToText.cancel();
  }
}
