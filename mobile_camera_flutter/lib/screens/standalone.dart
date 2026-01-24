import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/cloud_api_service.dart';

class StandaloneScreen extends StatefulWidget {
  final VoidCallback onBack;

  const StandaloneScreen({super.key, required this.onBack});

  @override
  State<StandaloneScreen> createState() => _StandaloneScreenState();
}

class _StandaloneScreenState extends State<StandaloneScreen> {
  // Cloud API Service
  final CloudApiService _cloudService = CloudApiService();
  final AudioRecorder _audioRecorder = AudioRecorder();

  bool _isListeningSession = false;
  // bool _isProcessingAudio = false; // Removed as we use _isProcessingCloud
  String _transcriptionBuffer = '';
  String _statusText = 'Tap mic to start';
  
  // Bible Data
  Map<String, dynamic> _bibleData = {};
  bool _isLoadingBible = true;
  
  // Detection State
  String? _detectedVerseText;
  String? _detectedReference;
  bool _isProcessingCloud = false;
  List<String> _savedScriptures = [];

  // Login State
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _isLoggingIn = false;
  bool _isLoggedIn = false;

  @override
  void initState() {
    super.initState();
    _initServices();
    _loadBibleData();
    WakelockPlus.enable();
  }

  @override
  void dispose() {
    _audioRecorder.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    WakelockPlus.disable();
    super.dispose();
  }

  Future<void> _initServices() async {
    await _cloudService.init();
    if (mounted) {
      setState(() {
        _isLoggedIn = _cloudService.isLoggedIn;
      });
    }
  }

  Future<void> _loadBibleData() async {
    try {
      final String response = await rootBundle.loadString('assets/bible_kjv.json');
      _bibleData = json.decode(response);
    } catch (e) {
      print('Error loading Bible data: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading Bible data: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingBible = false;
        });
      }
    }
  }

  Future<void> _login() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter email and password')),
      );
      return;
    }

    setState(() => _isLoggingIn = true);
    
    final success = await _cloudService.login(
      _emailController.text.trim(), 
      _passwordController.text.trim()
    );

    if (mounted) {
      setState(() {
        _isLoggingIn = false;
        if (success) {
          _isLoggedIn = true;
          _statusText = 'Login Successful. Tap mic to record.';
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Login Failed. Check credentials.')),
          );
        }
      });
    }
  }

  Future<void> _logout() async {
    await _cloudService.logout();
    if (mounted) {
      setState(() {
        _isLoggedIn = false;
        _emailController.clear();
        _passwordController.clear();
      });
    }
  }

  Future<void> _toggleListeningSession() async {
    if (_isListeningSession) {
      // Stop the loop
      setState(() {
        _isListeningSession = false;
        _statusText = 'Stopping...';
      });
      await _audioRecorder.stop();
    } else {
      // Start the loop
      if (await Permission.microphone.request().isGranted) {
        setState(() {
          _isListeningSession = true;
          _statusText = 'Listening...';
          _transcriptionBuffer = ''; // Clear buffer on new session
        });
        _recordLoop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Microphone permission required')),
        );
      }
    }
  }

  Future<void> _recordLoop() async {
    if (!_isListeningSession) return;

    try {
      final tempDir = await getTemporaryDirectory();
      // Use timestamp to avoid file locking issues
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final filePath = '${tempDir.path}/chunk_$timestamp.m4a';

      const config = RecordConfig(
        encoder: AudioEncoder.aacLc,
        sampleRate: 44100,
        bitRate: 64000, // Lower bitrate for faster upload
      );

      // Start Recording
      await _audioRecorder.start(config, path: filePath);

      // Wait for chunk duration (e.g., 4 seconds)
      // We check _isListeningSession every second to allow faster stopping
      for (int i = 0; i < 40; i++) {
        if (!_isListeningSession) break;
        await Future.delayed(const Duration(milliseconds: 100));
      }

      // Stop Recording
      final path = await _audioRecorder.stop();

      // If we are still listening, immediately start next loop
      // The processing happens in background
      if (_isListeningSession) {
        _recordLoop();
      } else {
        setState(() => _statusText = 'Tap mic to start');
      }

      // Process the chunk
      if (path != null) {
        _processAudioChunk(File(path));
      }

    } catch (e) {
      print('Record loop error: $e');
      if (_isListeningSession) {
        // Retry after short delay if error
        await Future.delayed(const Duration(seconds: 1));
        _recordLoop();
      }
    }
  }

  Future<void> _processAudioChunk(File audioFile) async {
    if (!await audioFile.exists()) return;

    try {
      setState(() => _isProcessingCloud = true);
      
      // Upload to Cloud
      final text = await _cloudService.transcribe(audioFile, engine: 'elevenlabs');

      // Delete temp file to save space
      await audioFile.delete();

      if (mounted && text != null && text.trim().isNotEmpty) {
        // Update Buffer
        setState(() {
          _transcriptionBuffer += " $text";
          
          // Smart Buffer Management: Keep last ~50 words
          // This ensures we have enough context (e.g. "John" ... "3:16") 
          // but prevents the buffer from growing indefinitely.
          List<String> words = _transcriptionBuffer.trim().split(RegExp(r'\s+'));
          if (words.length > 60) {
            _transcriptionBuffer = words.sublist(words.length - 50).join(' ');
          }
          
          _statusText = '...${text.trim()}'; // Show latest words
        });

        // Detect Scripture
        _detectScripture(_transcriptionBuffer);
      }

    } catch (e) {
      print('Chunk processing error: $e');
    } finally {
      if (mounted) {
        setState(() => _isProcessingCloud = false);
      }
    }
  }

  // Simple Regex for "Book Chapter:Verse" or "Book Chapter Verse"
  void _detectScripture(String text) {
    if (_bibleData.isEmpty) return;

    // Pattern: (1-3)? (BookName) (Chapter) (:) (Verse)
    final RegExp scriptureRegex = RegExp(
      r'(\d?\s?[a-zA-Z]+)\s+(\d+)\s?[:v]?\s?(\d+)',
      caseSensitive: false,
    );

    // Find ALL matches to ensure we process the latest one
    final matches = scriptureRegex.allMatches(text);
    
    // Iterate in reverse to prioritize the most recently spoken scripture
    for (final match in matches.toList().reversed) {
      String book = match.group(1)?.trim() ?? '';
      String chapter = match.group(2) ?? '';
      String verse = match.group(3) ?? '';

      book = _normalizeBookName(book);

      if (_bibleData.containsKey(book)) {
        var bookData = _bibleData[book];
        if (bookData.containsKey(chapter)) {
          var chapterData = bookData[chapter];
          if (chapterData.containsKey(verse)) {
            String scriptureText = chapterData[verse];
            
            // Only update if it's a new reference
            if (_detectedReference != '$book $chapter:$verse') {
              setState(() {
                _detectedReference = '$book $chapter:$verse';
                _detectedVerseText = scriptureText;
              });
            }
            return; // Found the latest valid scripture, stop searching
          }
        }
      }
    }
  }

  String _normalizeBookName(String input) {
    if (input.isEmpty) return input;
    
    if (RegExp(r'^\d').hasMatch(input)) {
       var parts = input.split(' ');
       if (parts.length > 1) {
         return '${parts[0]} ${parts.sublist(1).map((w) => w[0].toUpperCase() + w.substring(1).toLowerCase()).join(' ')}';
       }
    }
    
    return input[0].toUpperCase() + input.substring(1).toLowerCase();
  }

  void _saveScripture() {
    if (_detectedReference != null && !_savedScriptures.contains(_detectedReference)) {
      setState(() {
        _savedScriptures.add(_detectedReference!);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Scripture saved to list')),
      );
    }
  }

  // Removed _toggleRecording as it is replaced by _toggleListeningSession

  @override
  Widget build(BuildContext context) {
    final bool isPortrait = MediaQuery.of(context).orientation == Orientation.portrait;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Slate 900
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: widget.onBack,
        ),
        title: Text(
          'VerseVision Cloud',
          style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        actions: [
          if (_isLoggedIn)
            IconButton(
              icon: const Icon(Icons.logout, color: Colors.white),
              onPressed: _logout,
            ),
          IconButton(
            icon: const Icon(Icons.bookmarks, color: Colors.white),
            onPressed: () {
              _showSavedScriptures(context);
            },
          ),
        ],
      ),
      body: !_isLoggedIn ? _buildLoginView() : _buildMainView(isPortrait),
    );
  }

  Widget _buildLoginView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Login Required',
              style: GoogleFonts.inter(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold
              ),
            ),
            const SizedBox(height: 32),
            TextField(
              controller: _emailController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Email',
                labelStyle: const TextStyle(color: Colors.white70),
                enabledBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: Colors.white30),
                  borderRadius: BorderRadius.circular(8),
                ),
                focusedBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: Color(0xFF7C3AED)),
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              obscureText: true,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Password',
                labelStyle: const TextStyle(color: Colors.white70),
                enabledBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: Colors.white30),
                  borderRadius: BorderRadius.circular(8),
                ),
                focusedBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: Color(0xFF7C3AED)),
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoggingIn ? null : _login,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: _isLoggingIn
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Login', style: TextStyle(fontSize: 16, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMainView(bool isPortrait) {
    return Stack(
      children: [
        // Background Visualizer (Simple Pulse Animation)
        if (_isListeningSession)
          Center(
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 1.0, end: 1.5),
              duration: const Duration(milliseconds: 1000),
              curve: Curves.easeInOut,
              builder: (context, value, child) {
                return Container(
                  width: 200 * value,
                  height: 200 * value,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF7C3AED).withOpacity(0.1 / value),
                  ),
                );
              },
              onEnd: () {}, 
            ),
          ),

        Column(
          children: [
            // Detected Scripture Display Area
            Expanded(
              flex: 3,
              child: Center(
                child: _detectedVerseText != null
                    ? Dismissible(
                        key: Key(_detectedReference!),
                        direction: DismissDirection.horizontal,
                        onDismissed: (_) {
                          setState(() {
                            _detectedVerseText = null;
                            _detectedReference = null;
                          });
                        },
                        child: Container(
                          margin: const EdgeInsets.all(24),
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E1B4B).withOpacity(0.9), // Indigo 950
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFF7C3AED), width: 1),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.3),
                                blurRadius: 20,
                                spreadRadius: 5,
                              ),
                            ],
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _detectedReference!,
                                style: GoogleFonts.inter(
                                  fontSize: isPortrait ? 24 : 32,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFFA78BFA), // Violet 400
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                _detectedVerseText!,
                                textAlign: TextAlign.center,
                                style: GoogleFonts.merriweather(
                                  fontSize: isPortrait ? 20 : 28,
                                  color: Colors.white,
                                  height: 1.5,
                                ),
                              ),
                              const SizedBox(height: 24),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.bookmark_border, color: Colors.white70),
                                    onPressed: _saveScripture,
                                  ),
                                  const SizedBox(width: 16),
                                  IconButton(
                                    icon: const Icon(Icons.close, color: Colors.white70),
                                    onPressed: () {
                                      setState(() {
                                        _detectedVerseText = null;
                                        _detectedReference = null;
                                      });
                                    },
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.cloud_upload, 
                            size: 64, 
                            color: Colors.white.withOpacity(0.1)
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _statusText,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.5),
                              fontSize: 18,
                            ),
                          ),
                        ],
                      ),
              ),
            ),

            // Bottom Controls
            Expanded(
              flex: 1,
              child: Container(
                padding: const EdgeInsets.only(bottom: 32),
                child: Center(
                  child: GestureDetector(
                    onTap: _toggleListeningSession,
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: _isListeningSession 
                              ? [const Color(0xFFEF4444), const Color(0xFFB91C1C)] // Red for Stop
                              : [const Color(0xFF7C3AED), const Color(0xFF4C1D95)], // Violet for Start
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: (_isListeningSession ? Colors.red : const Color(0xFF7C3AED)).withOpacity(0.4),
                            blurRadius: 20,
                            spreadRadius: 5,
                          ),
                        ],
                      ),
                      child: _isProcessingCloud && !_isListeningSession
                          ? const Padding(
                              padding: EdgeInsets.all(22.0),
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3),
                            )
                          : Icon(
                              _isListeningSession ? Icons.stop : Icons.mic,
                              color: Colors.white,
                              size: 36,
                            ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  void _showSavedScriptures(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E1B4B),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Saved Scriptures',
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: _savedScriptures.isEmpty
                    ? Center(child: Text('No saved scriptures yet', style: TextStyle(color: Colors.white54)))
                    : ListView.builder(
                        itemCount: _savedScriptures.length,
                        itemBuilder: (context, index) {
                          return ListTile(
                            title: Text(
                              _savedScriptures[index],
                              style: const TextStyle(color: Colors.white),
                            ),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete, color: Colors.white54),
                              onPressed: () {
                                setState(() {
                                  _savedScriptures.removeAt(index);
                                });
                                Navigator.pop(context);
                                _showSavedScriptures(context); // Refresh
                              },
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}
