import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:path_provider/path_provider.dart';

class CloudApiService {
  static const String _baseUrl = 'https://versevision.5starcompany.com.ng/api';
  static const String _tokenKey = 'cloud_auth_token';
  static const String _userKey = 'cloud_user_data';

  String? _token;
  Map<String, dynamic>? _user;

  bool get isLoggedIn => _token != null;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(_tokenKey);
    final userStr = prefs.getString(_userKey);
    if (userStr != null) {
      _user = jsonDecode(userStr);
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _token = data['token']; // Adjust based on actual API response structure
        _user = data['user'];
        
        final prefs = await SharedPreferences.getInstance();
        if (_token != null) await prefs.setString(_tokenKey, _token!);
        if (_user != null) await prefs.setString(_userKey, jsonEncode(_user));
        return true;
      }
      return false;
    } catch (e) {
      print('Login error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }

  Future<String?> transcribe(File audioFile, {String engine = 'openai'}) async {
    if (_token == null) return null;

    try {
      final uri = Uri.parse('$_baseUrl/ai/transcribe');
      final request = http.MultipartRequest('POST', uri);
      
      request.headers['Authorization'] = 'Bearer $_token';
      request.headers['Accept'] = 'application/json';
      
      request.files.add(await http.MultipartFile.fromPath(
        'file',
        audioFile.path,
      ));
      
      if (engine.isNotEmpty) {
        request.fields['engine'] = engine;
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['text']; 
      }

      if (response.statusCode == 403) {
        dynamic data;
        try {
          data = jsonDecode(response.body);
        } catch (_) {}

        if (data is Map && data['code'] == 'TRANSCRIPTION_NOT_ALLOWED') {
          throw CloudTranscriptionException(
            message: data['error'] ?? 'Cloud transcription not available on your plan.',
            code: data['code'],
            nextPlanSlug: data['next_plan_slug'],
          );
        }
      }

      print('Transcribe error: ${response.statusCode} ${response.body}');
      return null;
    } catch (e) {
      if (e is CloudTranscriptionException) rethrow;
      print('Transcribe exception: $e');
      return null;
    }
  }

  Future<String?> initializeSubscription(String planSlug) async {
    if (_token == null) return null;

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/subscription/initialize'),
        headers: {
          'Authorization': 'Bearer $_token',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({'plan_slug': planSlug}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['authorization_url'];
      }

      print('Subscription init error: ${response.statusCode} ${response.body}');
      return null;
    } catch (e) {
      print('Subscription init exception: $e');
      return null;
    }
  }
}

class CloudTranscriptionException implements Exception {
  final String message;
  final String? code;
  final String? nextPlanSlug;

  CloudTranscriptionException({required this.message, this.code, this.nextPlanSlug});

  @override
  String toString() => 'CloudTranscriptionException($code): $message';
}
