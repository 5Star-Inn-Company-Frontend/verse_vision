import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ScriptureResult {
  final String reference;
  final String text;
  final String version;
  final String book;
  final String chapter;
  final int? startVerse;
  final int? endVerse;

  ScriptureResult({
    required this.reference,
    required this.text,
    required this.version,
    required this.book,
    required this.chapter,
    this.startVerse,
    this.endVerse,
  });
}

class ScriptureService {
  Map<String, dynamic> _bibleData = {};
  bool _isLoaded = false;
  String _currentVersion = 'kjv';

  static const List<String> availableVersions = [
    'abpe', 'amp', 'anderson', 'asv', 'blb', 'brenton', 'bsb', 'cev', 'cpdv',
    'csb', 'drb', 'erv', 'esv', 'gnt', 'godbey', 'gw', 'haweis', 'hcsb', 'isv',
    'jps', 'kjv', 'kjv_legacy', 'lamsa', 'lsb', 'lsv', 'mace', 'msb', 'nab',
    'nasb', 'nasb1977', 'nasb1995', 'net', 'nheb', 'niv', 'nkjv', 'nlt', 'nrsv',
    'peshitta', 'slt', 'wbt', 'web', 'weymouth', 'worrell', 'worsley', 'ylt'
  ];
  
  // Debounce tracking
  DateTime _lastDetection = DateTime.fromMillisecondsSinceEpoch(0);

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _currentVersion = prefs.getString('selected_bible_version') ?? 'kjv';
    await _loadBibleData(_currentVersion);
  }

  Future<void> setVersion(String version) async {
    if (!availableVersions.contains(version)) return;
    if (_currentVersion == version && _isLoaded) return;

    await _loadBibleData(version);
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('selected_bible_version', version);
    _currentVersion = version;
  }

  Future<void> _loadBibleData(String version) async {
    try {
      // Prioritize the new assets/bibles/ folder
      // KJV might be in both, but we prefer the standardized folder
      final String path = 'assets/bibles/$version.json';
      final String response = await rootBundle.loadString(path);
      _bibleData = json.decode(response);
      _isLoaded = true;
    } catch (e) {
      print('Error loading Bible data for $version: $e');
      // Fallback for original KJV location if needed, though we should move it
      if (version == 'kjv') {
         try {
            final String response = await rootBundle.loadString('assets/bible_kjv.json');
            _bibleData = json.decode(response);
            _isLoaded = true;
            return;
         } catch (e2) {
             print('Fallback failed: $e2');
         }
      }
      rethrow;
    }
  }

  bool get isLoaded => _isLoaded;
  String get currentVersion => _currentVersion;

  ScriptureResult? lookupScripture(String book, String chapter, int? start, int? end) {
    if (!_isLoaded || _bibleData.isEmpty) return null;
    
    // Normalize book just in case
    book = _normalizeBookName(book);
    
    if (!_bibleData.containsKey(book)) return null;
    if (!_bibleData[book].containsKey(chapter)) return null;

    final chapterData = _bibleData[book][chapter];

    // Whole chapter
    if (start == null) {
      final text = chapterData.values.join(' ');
      return ScriptureResult(
        reference: '$book $chapter',
        text: text,
        version: _currentVersion,
        book: book,
        chapter: chapter,
      );
    }

    final verseStart = start;
    final verseEnd = end ?? start;

    String combined = '';
    for (int v = verseStart; v <= verseEnd; v++) {
      if (chapterData.containsKey(v.toString())) {
        combined += '${chapterData[v.toString()]} ';
      }
    }

    if (combined.isNotEmpty) {
      return ScriptureResult(
        reference: '$book $chapter:$verseStart${end != null ? '-$end' : ''}',
        text: combined.trim(),
        version: _currentVersion,
        book: book,
        chapter: chapter,
        startVerse: verseStart,
        endVerse: end != null ? verseEnd : null,
      );
    }
    
    return null;
  }

  ScriptureResult? detectScripture(String text) {
    if (!_isLoaded || _bibleData.isEmpty) return null;

    // ⏱ Debounce detection (handled by caller or here? keep simple here for now, but maybe allow bypass)
    if (DateTime.now().difference(_lastDetection).inSeconds < 2) return null;
    
    // Normalize input
    final normalizedText = _normalizeSermonSyntax(
      _normalizeSpokenNumbers(text),
    );

    final RegExp scriptureRegex = RegExp(
      r'((?:[1-3]\s)?[a-zA-Z]+(?:\s[a-zA-Z]+)*)\s+'
      r'(?:chapter\s+)?(\d+)' // Chapter
      r'(?:[\s:]*(?:verse)?[\s:]*(\d+)(?:-(\d+))?)?', // Verse (handles : or space or "verse")
      caseSensitive: false,
    );

    final matches = scriptureRegex.allMatches(normalizedText).toList().reversed;

    for (final match in matches) {
      String bookRaw = match.group(1)?.trim() ?? '';
      final chapter = match.group(2);
      final verseStart = match.group(3);
      final verseEnd = match.group(4);

      final book = _normalizeBookName(bookRaw);

      if (chapter == null) continue;
      if (!_bibleData.containsKey(book)) continue;
      if (!_bibleData[book].containsKey(chapter)) continue;

      final chapterData = _bibleData[book][chapter];
      
      // Update last detection time only on success
      _lastDetection = DateTime.now();

      // Whole chapter
      if (verseStart == null) {
        final text = chapterData.values.join(' ');
        return ScriptureResult(
          reference: '$book $chapter',
          text: text,
          version: _currentVersion,
          book: book,
          chapter: chapter,
        );
      }

      final start = int.parse(verseStart);
      final end = verseEnd != null ? int.parse(verseEnd) : start;

      String combined = '';
      for (int v = start; v <= end; v++) {
        if (chapterData.containsKey(v.toString())) {
          combined += '${chapterData[v.toString()]} ';
        }
      }

      if (combined.isNotEmpty) {
        return ScriptureResult(
          reference: '$book $chapter:$start${verseEnd != null ? '-$end' : ''}',
          text: combined.trim(),
          version: _currentVersion,
          book: book,
          chapter: chapter,
          startVerse: start,
          endVerse: verseEnd != null ? end : null,
        );
      }
    }
    
    return null;
  }

  final Map<String, String> _bookAliases = {
    // Matthew (VERY common Nigerian variations)
    'mathew': 'Matthew',
    'matthew': 'Matthew',
    'matyu': 'Matthew',
    'mattiu': 'Matthew',
    'mathiu': 'Matthew',
    'mathiew': 'Matthew',

    // John
    'jn': 'John',
    'jhn': 'John',
    'joan': 'John',
    'jorn': 'John',

    // Psalms
    'psalm': 'Psalms',
    'sams': 'Psalms',
    'salms': 'Psalms',

    // Common Plurals/Variations
    'revelations': 'Revelation',
    'songs': 'Song of Solomon',
    'song of songs': 'Song of Solomon',
    
    // Abbreviations
    'gen': 'Genesis',
    'ex': 'Exodus',
    'lev': 'Leviticus',
    'num': 'Numbers',
    'deut': 'Deuteronomy',
    'josh': 'Joshua',
    'judg': 'Judges',
    'sam': 'Samuel', // Handled by regex logic mostly but good to have base
    'kgs': 'Kings',
    'chr': 'Chronicles',
    'neh': 'Nehemiah',
    'esth': 'Esther',
    'prov': 'Proverbs',
    'ecc': 'Ecclesiastes',
    'isa': 'Isaiah',
    'jer': 'Jeremiah',
    'lam': 'Lamentations',
    'eze': 'Ezekiel',
    'dan': 'Daniel',
    'hos': 'Hosea',
    'obad': 'Obadiah',
    'hab': 'Habakkuk',
    'zeph': 'Zephaniah',
    'hag': 'Haggai',
    'zech': 'Zechariah',
    'mal': 'Malachi',
    'mat': 'Matthew',
    'matt': 'Matthew',
    'mk': 'Mark',
    'lk': 'Luke',
    'jn': 'John',
    'rom': 'Romans',
    'cor': 'Corinthians',
    'gal': 'Galatians',
    'eph': 'Ephesians',
    'phil': 'Philippians',
    'col': 'Colossians',
    'thess': 'Thessalonians',
    'tim': 'Timothy',
    'tit': 'Titus',
    'phlm': 'Philemon',
    'heb': 'Hebrews',
    'jas': 'James',
    'pet': 'Peter',
    'rev': 'Revelation',
  };

  String _normalizeBookName(String input) {
    input = input.toLowerCase().trim();

    if (_bookAliases.containsKey(input)) {
      return _bookAliases[input]!;
    }

    if (RegExp(r'^\d').hasMatch(input)) {
      final parts = input.split(' ');
      if (parts.length > 1) {
        return '${parts[0]} ${parts.sublist(1).map(_cap).join(' ')}';
      }
    }

    return _cap(input);
  }

  String _cap(String w) =>
      w.isEmpty ? w : w[0].toUpperCase() + w.substring(1).toLowerCase();

  final Map<String, String> _spokenNumbers = {
    'one': '1',
    'two': '2',
    'three': '3',
    'four': '4',
    'five': '5',
    'six': '6',
    'seven': '7',
    'eight': '8',
    'nine': '9',
    'ten': '10',
    'eleven': '11',
    'twelve': '12',
    'thirteen': '13',
    'fourteen': '14',
    'fifteen': '15',
    'sixteen': '16',
    'seventeen': '17',
    'eighteen': '18',
    'nineteen': '19',
    'twenty': '20',
    'thirty': '30',
    'forty': '40',
    'fifty': '50',
  };

  String _normalizeSpokenNumbers(String text) {
    var result = text;
    _spokenNumbers.forEach((k, v) {
      result = result.replaceAllMapped(
        RegExp(r'\b$k\b', caseSensitive: false),
        (_) => v,
      );
    });
    return result;
  }

  String _normalizeSermonSyntax(String text) {
    text = text.toLowerCase();

    // Remove common prefixes
    text = text.replaceAll(RegExp(r'\bbook of\b'), '');
    text = text.replaceAll(RegExp(r'\bgospel of\b'), '');
    text = text.replaceAll(RegExp(r'\bepistle of\b'), '');
    text = text.replaceAll(RegExp(r'\bopen your bibles? to\b'), '');
    text = text.replaceAll(RegExp(r'\bturn your bibles? to\b'), '');
    text = text.replaceAll(RegExp(r'\bturn to\b'), '');
    text = text.replaceAll(RegExp(r'\bopen to\b'), '');
    
    // Normalize verse keywords
    text = text.replaceAll(RegExp(r'\bvs\.?\b'), 'verse');
    text = text.replaceAll(RegExp(r'\bv\.?\b'), 'verse');

    // Normalize range language
    text = text.replaceAll(RegExp(r'\bto\b'), '-');
    text = text.replaceAll(RegExp(r'\bdown to\b'), '-');
    text = text.replaceAll(RegExp(r'\bup to\b'), '-');
    text = text.replaceAll(RegExp(r'\bthrough\b'), '-');

    // Normalize "from verse"
    text = text.replaceAll(RegExp(r'from\s+verse'), 'verse');

    // Normalize dash spacing
    text = text.replaceAll(RegExp(r'\s*-\s*'), '-');

    return text.trim();
  }
}
