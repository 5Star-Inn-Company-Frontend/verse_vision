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
import 'package:shared_preferences/shared_preferences.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/cloud_api_service.dart';
import '../services/scripture_service.dart';
import '../services/local_transcription_service.dart';

class StandaloneScreen extends StatefulWidget {
  final VoidCallback onBack;

  const StandaloneScreen({super.key, required this.onBack});

  @override
  State<StandaloneScreen> createState() => _StandaloneScreenState();
}

class _StandaloneScreenState extends State<StandaloneScreen> {
  // Cloud API Service
  final CloudApiService _cloudService = CloudApiService();
  final ScriptureService _scriptureService = ScriptureService();
  final LocalTranscriptionService _localService = LocalTranscriptionService();
  final AudioRecorder _audioRecorder = AudioRecorder();

  bool _isListeningSession = false;
  bool _useCloud = false;
  // bool _isProcessingAudio = false; // Removed as we use _isProcessingCloud
  String _transcriptionBuffer = '';
  String _statusText = 'Tap mic to start';
  
  bool _isLoadingBible = true;
  
  // Detection State
  String? _detectedVerseText;
  String? _detectedReference;
  ScriptureResult? _currentScriptureResult;
  bool _isProcessingCloud = false;
  List<String> _savedScriptures = [];
  List<String> _sessionHistory = [];

  // Login State
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _isLoggingIn = false;
  bool _isLoggedIn = false;
  Timer? _restartTimer;

  @override
  void initState() {
    super.initState();
    _initServices();
    _loadBibleData();
    _loadSavedScriptures();
    _checkFirstTimeUser();
    WakelockPlus.enable();
  }

  Future<void> _checkFirstTimeUser() async {
    final prefs = await SharedPreferences.getInstance();
    final bool hasSeenGuide = prefs.getBool('has_seen_welcome_guide') ?? false;

    if (!hasSeenGuide && mounted) {
      // Delay slightly to ensure context is ready
      Future.delayed(const Duration(milliseconds: 500), () {
        _showWelcomeGuide();
      });
    }
  }

  void _showWelcomeGuide() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E1B4B), // Indigo 950
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF7C3AED), width: 1)),
        title: Text(
          'Welcome to Verse Companion',
          style: GoogleFonts.inter(
              color: Colors.white, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildGuideItem(Icons.mic, 'Tap the microphone to start listening (Local mode is default).'),
            const SizedBox(height: 12),
            _buildGuideItem(Icons.cloud_off, 'Toggle between Cloud and Local transcription using the cloud icon.'),
            const SizedBox(height: 12),
            _buildGuideItem(Icons.record_voice_over,
                'Speak a scripture reference (e.g., "John 3:16").'),
            const SizedBox(height: 12),
            _buildGuideItem(Icons.auto_stories,
                'The app will transcribe and display the verse automatically.'),
            const SizedBox(height: 12),
            _buildGuideItem(Icons.book,
                'Change Bible versions using the book icon at the top.'),
            const SizedBox(height: 12),
            _buildGuideItem(Icons.bookmark,
                'Save your favorite detected verses for later.'),
            const SizedBox(height: 12),
            _buildGuideItem(Icons.history,
                'View and share your session history anytime.'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () async {
              final prefs = await SharedPreferences.getInstance();
              await prefs.setBool('has_seen_welcome_guide', true);
              if (context.mounted) Navigator.pop(context);
            },
            child: Text(
              'Get Started',
              style: GoogleFonts.inter(
                color: const Color(0xFFA78BFA), // Violet 400
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGuideItem(IconData icon, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: const Color(0xFFA78BFA), size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: GoogleFonts.inter(color: Colors.white70, fontSize: 14),
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _localService.cancel();
    _audioRecorder.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    WakelockPlus.disable();
    super.dispose();
  }

  Future<void> _initServices() async {
    await _cloudService.init();
    await _localService.init();
    if (mounted) {
      setState(() {
        _isLoggedIn = _cloudService.isLoggedIn;
      });
    }
  }

  Future<void> _loadBibleData() async {
    try {
      await _scriptureService.init();
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
      await _localService.stopListening();
      
      if (mounted) {
        _showSessionSummary();
      }
    } else {
      // Start the loop
      if (await Permission.microphone.request().isGranted) {
        setState(() {
          _isListeningSession = true;
          _transcriptionBuffer = ''; // Clear buffer on new session
          _sessionHistory = [];
        });

        if (_useCloud) {
          setState(() => _statusText = 'Listening (Cloud)...');
          _recordLoop();
        } else {
          _startLocalListening();
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Microphone permission required')),
        );
      }
    }
  }

  Future<void> _startLocalListening() async {
    await _localService.startListening(
      onResult: (text) {
        if (!mounted || !_isListeningSession) return;
        setState(() {
          _transcriptionBuffer = text;
          _statusText = '...$text';
        });
        _detectScripture(text);
      },
      onStatus: (status) {
        if (!mounted) return;
        
        if (_isListeningSession) {
           if (status == 'listening') {
             setState(() => _statusText = 'Listening (Local)...');
           } else if (status == 'notListening' || status == 'done') {
             // Restart loop if session is still active
             if (_isListeningSession && !_useCloud) {
                // Cancel any pending restart to prevent double-firing
                _restartTimer?.cancel();
                _restartTimer = Timer(const Duration(milliseconds: 1000), () {
                  if (mounted && _isListeningSession && !_useCloud) {
                    debugPrint('Auto-restarting local listening...');
                    _startLocalListening();
                  }
                });
             }
           }
        }
      },
    );
  }

  Future<void> _recordLoop() async {
  if (!_isListeningSession) return;

  try {
    final tempDir = await getTemporaryDirectory();
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final filePath = '${tempDir.path}/chunk_$timestamp.m4a';

    const config = RecordConfig(
      encoder: AudioEncoder.aacLc,
      sampleRate: 44100,
      bitRate: 64000,
    );

    await _audioRecorder.start(config, path: filePath);

    double maxAmplitude = -160.0;

    // 5 seconds
    for (int i = 0; i < 50; i++) {
      if (!_isListeningSession) break;
      
      try {
        final amp = await _audioRecorder.getAmplitude();
        if (amp.current > maxAmplitude) maxAmplitude = amp.current;
      } catch (_) {}

      await Future.delayed(const Duration(milliseconds: 100));
    }

    final path = await _audioRecorder.stop();

    if (_isListeningSession) {
      _recordLoop(); // immediately restart
    }

    if (path != null) {
      final file = File(path);

      // VAD: Skip silence (threshold approx -45 dB)
      if (maxAmplitude > -45.0 && file.lengthSync() > 4000) {
        _processAudioChunk(file);
      } else {
        await file.delete();
      }
    }
  } catch (e) {
    debugPrint('Record loop error: $e');
    if (_isListeningSession) {
      await Future.delayed(const Duration(seconds: 1));
      _recordLoop();
    }
  }
}


  Future<void> _processAudioChunk(File audioFile) async {
  try {
    final text =
        await _cloudService.transcribe(audioFile, engine: 'elevenlabs');

    await audioFile.delete();

    if (!mounted) return;

    if (text == null || text.trim().isEmpty) return;

    setState(() {
      _transcriptionBuffer += ' $text';

      final words =
          _transcriptionBuffer.trim().split(RegExp(r'\s+'));
      if (words.length > 60) {
        _transcriptionBuffer =
            words.sublist(words.length - 50).join(' ');
      }

      _statusText = '...${text.trim()}';
    });

    _detectScripture(_transcriptionBuffer);
  } on CloudTranscriptionException catch (e) {
      if (!mounted) return;
      setState(() {
        _isListeningSession = false;
        _statusText = 'Plan limit reached';
      });
      await _audioRecorder.stop();
      showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E1B4B),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF7C3AED), width: 1),
          ),
          title: Text(
            'Upgrade Required',
            style: GoogleFonts.inter(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Text(
            e.message,
            style: GoogleFonts.inter(color: Colors.white70),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: const Text('Close', style: TextStyle(color: Colors.white)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                // Use the next plan slug from the exception, or fallback
                final upgradePlanSlug = e.nextPlanSlug ?? 'professional'; 
                
                final url = await _cloudService.initializeSubscription(upgradePlanSlug);
                if (url != null) {
                  final uri = Uri.parse(url);
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  } else {
                     if (!context.mounted) return;
                     ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Could not launch payment page')),
                    );
                  }
                } else {
                   if (!context.mounted) return;
                   ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to initialize upgrade')),
                  );
                }
              },
              child: const Text('Upgrade Now'),
            ),
          ],
        );
      },
    );
  } catch (e) {
    debugPrint('Chunk processing error: $e');
  }
}


  void _detectScripture(String text) {
    if (!_scriptureService.isLoaded) return;

    final result = _scriptureService.detectScripture(text);
    if (result != null) {
      _updateVerse(result);
    }
  }

  void _updateVerse(ScriptureResult result) {
    if (_detectedReference == result.reference && 
        _currentScriptureResult?.version == result.version) return;

    setState(() {
      _detectedReference = result.reference;
      _detectedVerseText = result.text;
      _currentScriptureResult = result;
      if (result.reference.isNotEmpty) {
        if (_sessionHistory.isEmpty || _sessionHistory.last != result.reference) {
          _sessionHistory.add(result.reference);
        }
      }
    });
  }

  Future<void> _loadSavedScriptures() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _savedScriptures = prefs.getStringList('saved_scriptures') ?? [];
    });
  }

  Future<void> _saveScripturesToPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('saved_scriptures', _savedScriptures);
  }

  void _saveScripture() {
    if (_detectedReference != null && !_savedScriptures.contains(_detectedReference)) {
      setState(() {
        _savedScriptures.add(_detectedReference!);
      });
      _saveScripturesToPrefs();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Scripture saved to list')),
      );
    }
  }

  String _buildSessionSummaryText() {
    final seen = <String>{};
    final ordered = <String>[];
    for (final r in _sessionHistory) {
      if (!seen.contains(r)) {
        seen.add(r);
        ordered.add(r);
      }
    }
    return ordered.isEmpty ? '' : 'VerseVision heard these: ${ordered.join(', ')}';
  }

  Future<void> _saveCurrentSession() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getStringList('session_history_saved') ?? [];
    final now = DateTime.now().toIso8601String();
    final entry = jsonEncode({'time': now, 'items': _sessionHistory});
    existing.add(entry);
    await prefs.setStringList('session_history_saved', existing);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Session saved')),
      );
    }
  }

  void _showSessionSummary() {
    if (_sessionHistory.isEmpty) return;

    final summary = _buildSessionSummaryText();
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E1B4B),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF7C3AED), width: 1),
          ),
          title: Text(
            'Session Summary',
            style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          content: SizedBox(
            width: double.maxFinite,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (summary.isNotEmpty)
                  Text(summary, style: GoogleFonts.inter(color: Colors.white70)),
                const SizedBox(height: 12),
                Expanded(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: _sessionHistory.length,
                    itemBuilder: (context, index) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Text(
                          _sessionHistory[index],
                          style: GoogleFonts.inter(color: Colors.white),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                _saveCurrentSession();
              },
              child: const Text('Save'),
            ),
            TextButton(
              onPressed: () {
                final text = _buildSessionSummaryText();
                if (text.isNotEmpty) {
                  Clipboard.setData(ClipboardData(text: text));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Copied to clipboard')),
                  );
                }
              },
              child: const Text('Copy'),
            ),
            TextButton(
              onPressed: () {
                final text = _buildSessionSummaryText();
                if (text.isNotEmpty) {
                  Share.share(text);
                }
              },
              child: const Text('Share'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
              },
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _changeBibleVersion(String version) async {
    setState(() => _isLoadingBible = true);
    try {
      await _scriptureService.setVersion(version);
      
      // Re-fetch current scripture in new version if exists
      if (_currentScriptureResult != null) {
        final newResult = _scriptureService.lookupScripture(
          _currentScriptureResult!.book,
          _currentScriptureResult!.chapter,
          _currentScriptureResult!.startVerse,
          _currentScriptureResult!.endVerse,
        );
        
        if (newResult != null) {
          _updateVerse(newResult);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading $version: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoadingBible = false);
      }
    }
  }

  // Removed _toggleRecording as it is replaced by _toggleListeningSession

  @override
  Widget build(BuildContext context) {
    final bool isPortrait = MediaQuery.of(context).orientation == Orientation.portrait;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Slate 900
      appBar: !isPortrait ? null  :AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: widget.onBack,
        ),
        title: Text(
          'V. Companion',
          style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.book, color: Colors.white),
            onSelected: _changeBibleVersion,
            itemBuilder: (context) {
              return ScriptureService.availableVersions.map((v) {
                final isSelected = v == _scriptureService.currentVersion;
                return PopupMenuItem<String>(
                  value: v,
                  child: Row(
                    children: [
                      Text(v.toUpperCase()),
                      if (isSelected) ...[
                        const SizedBox(width: 8),
                        const Icon(Icons.check, size: 16, color: Colors.blue),
                      ],
                    ],
                  ),
                );
              }).toList();
            },
          ),
          if (_isLoggedIn)
            IconButton(
              icon: Icon(_useCloud ? Icons.cloud : Icons.cloud_off, color: Colors.white),
              tooltip: _useCloud ? 'Switch to Local' : 'Switch to Cloud',
              onPressed: () {
                setState(() {
                  _useCloud = !_useCloud;
                  if (_isListeningSession) {
                     _isListeningSession = false;
                     _audioRecorder.stop(); 
                     _localService.stopListening();
                     _statusText = 'Mode changed. Tap mic to start.';
                  }
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Switched to ${_useCloud ? "Cloud" : "Local"} Transcription')),
                );
              },
            ),
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
          IconButton(
            icon: const Icon(Icons.history, color: Colors.white),
            onPressed: () {
              _showSessionSummary();
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
            Text("New user? An account will be automatically created. Please remember your password.", style: TextStyle(color: Colors.white70, fontSize: 12)),
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
                                '${_detectedReference!} (${_scriptureService.currentVersion.toUpperCase()})',
                                style: GoogleFonts.inter(
                                  fontSize: isPortrait ? 24 : 32,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFFA78BFA), // Violet 400
                                ),
                              ),
                              const SizedBox(height: 16),
                                Flexible(
                                  child: SingleChildScrollView(
                                    child: Text(
                                      _detectedVerseText!,
                                      textAlign: TextAlign.left,
                                      style: GoogleFonts.merriweather(
                                        fontSize: isPortrait ? 20 : 24,
                                        color: Colors.white,
                                        height: 1.5,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 24),
                              !isPortrait ? Container() : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  PopupMenuButton<String>(
                                  icon: const Icon(Icons.book, color: Colors.white),
                                  onSelected: _changeBibleVersion,
                                  itemBuilder: (context) {
                                    return ScriptureService.availableVersions.map((v) {
                                      final isSelected = v == _scriptureService.currentVersion;
                                      return PopupMenuItem<String>(
                                        value: v,
                                        child: Row(
                                          children: [
                                            Text(v.toUpperCase()),
                                            if (isSelected) ...[
                                              const SizedBox(width: 8),
                                              const Icon(Icons.check, size: 16, color: Colors.blue),
                                            ],
                                          ],
                                        ),
                                      );
                                    }).toList();
            },
          ),
          const SizedBox(width: 16),
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
            _detectedVerseText != null ? Container() :  Expanded(
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
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.copy, color: Colors.white54),
                                  onPressed: () {
                                    Clipboard.setData(ClipboardData(text: _savedScriptures[index]));
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Scripture reference copied')),
                                    );
                                  },
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete, color: Colors.white54),
                                  onPressed: () {
                                    setState(() {
                                      _savedScriptures.removeAt(index);
                                    });
                                    _saveScripturesToPrefs();
                                    Navigator.pop(context);
                                    _showSavedScriptures(context); // Refresh
                                  },
                                ),
                              ],
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
