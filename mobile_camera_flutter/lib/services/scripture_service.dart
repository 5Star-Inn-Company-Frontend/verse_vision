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

  // State for context
  String? _lastContextBook;
  String? _lastContextChapter;
  int? _lastContextVerseEnd;
  DateTime _lastContextTime = DateTime.fromMillisecondsSinceEpoch(0);

  final Set<String> _singleChapterBooks = {
    'obadiah', 'philemon', '2 john', '3 john', 'jude'
  };

  ScriptureResult? detectScripture(String text) {
    if (!_isLoaded || _bibleData.isEmpty) return null;

    // ⏱ Debounce detection
    if (DateTime.now().difference(_lastDetection).inSeconds < 2) return null;
    
    // Normalize input
    final normalizedText = _normalizeSermonSyntax(
      _normalizeSpokenNumbers(text),
    );

    // 0a. "Next Verse" Command
    if (normalizedText.contains('next verse') && 
        _lastContextBook != null && 
        _lastContextChapter != null &&
        _lastContextVerseEnd != null) {
          
       final book = _lastContextBook!;
       final chapter = _lastContextChapter!;
       final nextVerse = _lastContextVerseEnd! + 1;

       if (_bibleData.containsKey(book) && _bibleData[book].containsKey(chapter)) {
          final chapterData = _bibleData[book][chapter];
          if (chapterData.containsKey(nextVerse.toString())) {
             _lastDetection = DateTime.now();
             _lastContextVerseEnd = nextVerse; // Update context
             
             return ScriptureResult(
                reference: '$book $chapter:$nextVerse',
                text: chapterData[nextVerse.toString()],
                version: _currentVersion,
                book: book,
                chapter: chapter,
                startVerse: nextVerse,
                endVerse: nextVerse,
             );
          }
       }
    }

    // 0b. "Previous Verse" Command
    if ((normalizedText.contains('previous verse') || normalizedText.contains('go back a verse')) && 
        _lastContextBook != null && 
        _lastContextChapter != null &&
        _lastContextVerseEnd != null) {
          
       final book = _lastContextBook!;
       final chapter = _lastContextChapter!;
       final prevVerse = _lastContextVerseEnd! - 1;

       if (prevVerse > 0 && _bibleData.containsKey(book) && _bibleData[book].containsKey(chapter)) {
          final chapterData = _bibleData[book][chapter];
          if (chapterData.containsKey(prevVerse.toString())) {
             _lastDetection = DateTime.now();
             _lastContextVerseEnd = prevVerse; // Update context
             
             return ScriptureResult(
                reference: '$book $chapter:$prevVerse',
                text: chapterData[prevVerse.toString()],
                version: _currentVersion,
                book: book,
                chapter: chapter,
                startVerse: prevVerse,
                endVerse: prevVerse,
             );
          }
       }
    }

    // 0c. "Next Chapter" Command
    if (normalizedText.contains('next chapter') && 
        _lastContextBook != null && 
        _lastContextChapter != null) {
          
       final book = _lastContextBook!;
       final nextChap = int.parse(_lastContextChapter!) + 1;
       final nextChapStr = nextChap.toString();

       if (_bibleData.containsKey(book) && _bibleData[book].containsKey(nextChapStr)) {
          final chapterData = _bibleData[book][nextChapStr];
          final text = chapterData.values.join(' ');
          
          _lastDetection = DateTime.now();
          _lastContextChapter = nextChapStr;
          _lastContextVerseEnd = null; // Reset verse context
          
          return ScriptureResult(
            reference: '$book $nextChapStr',
            text: text,
            version: _currentVersion,
            book: book,
            chapter: nextChapStr,
          );
       }
    }

    // 0d. "Previous Chapter" Command
    if ((normalizedText.contains('previous chapter') || normalizedText.contains('last chapter')) && 
        _lastContextBook != null && 
        _lastContextChapter != null) {
          
       final book = _lastContextBook!;
       final prevChap = int.parse(_lastContextChapter!) - 1;
       final prevChapStr = prevChap.toString();

       if (prevChap > 0 && _bibleData.containsKey(book) && _bibleData[book].containsKey(prevChapStr)) {
          final chapterData = _bibleData[book][prevChapStr];
          final text = chapterData.values.join(' ');
          
          _lastDetection = DateTime.now();
          _lastContextChapter = prevChapStr;
          _lastContextVerseEnd = null;
          
          return ScriptureResult(
            reference: '$book $prevChapStr',
            text: text,
            version: _currentVersion,
            book: book,
            chapter: prevChapStr,
          );
       }
    }

    // 0e. "Whole Chapter" Command
    if ((normalizedText.contains('whole chapter') || normalizedText.contains('full chapter')) && 
        _lastContextBook != null && 
        _lastContextChapter != null) {
          
       final book = _lastContextBook!;
       final chapter = _lastContextChapter!;
       
       if (_bibleData.containsKey(book) && _bibleData[book].containsKey(chapter)) {
          final chapterData = _bibleData[book][chapter];
          final text = chapterData.values.join(' ');
          
          _lastDetection = DateTime.now();
          _lastContextVerseEnd = null;
          
          return ScriptureResult(
            reference: '$book $chapter',
            text: text,
            version: _currentVersion,
            book: book,
            chapter: chapter,
          );
       }
    }

    final RegExp scriptureRegex = RegExp(
      r'((?:[1-3]\s)?[a-zA-Z]+(?:\s(?!chapter\b)[a-zA-Z]+)*)\s+'
      r'(?:chapter\s+)?(\d+)' // Chapter
      r'(?:[\s:.,]*(?:verse)?[\s:.,]*(\d+)(?:-(\d+))?)?', // Verse
      caseSensitive: false,
    );

    final matches = scriptureRegex.allMatches(normalizedText).toList().reversed;

    // 1. Standard Detection
    for (final match in matches) {
      String bookRaw = match.group(1)?.trim() ?? '';
      
      // Use var because we might modify them for single-chapter books
      var chapter = match.group(2);
      var verseStart = match.group(3);
      var verseEnd = match.group(4);

      if (chapter != null) chapter = int.parse(chapter).toString(); // Strip leading zeros

      var book = _normalizeBookName(bookRaw);

      if (chapter == null) continue;

      // Handle Single Chapter Books (e.g. "Jude 5" parsed as Jude Ch 5)
      // If Ch 5 doesn't exist, treat it as Verse 5 of Chapter 1
      if (_singleChapterBooks.contains(book.toLowerCase()) && 
          !_bibleData[book]?.containsKey(chapter) &&
          verseStart == null) {
            verseStart = chapter;
            chapter = '1';
      }

      if (!_bibleData.containsKey(book)) continue;
      if (!_bibleData[book].containsKey(chapter)) continue;

      final chapterData = _bibleData[book][chapter];
      
      // Update Context on Success
      _lastDetection = DateTime.now();
      _lastContextBook = book;
      _lastContextChapter = chapter;
      _lastContextTime = DateTime.now();

      // Whole chapter
      if (verseStart == null) {
        _lastContextVerseEnd = null; // Whole chapter has no specific end verse context
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
      // If "to the end" was used, end might be 999. We rely on the loop to find actual end.
      final end = verseEnd != null ? int.parse(verseEnd) : start;

      String combined = '';
      int actualEnd = start;

      for (int v = start; v <= end; v++) {
        if (chapterData.containsKey(v.toString())) {
          combined += '${chapterData[v.toString()]} ';
          actualEnd = v;
        }
      }
      
      _lastContextVerseEnd = actualEnd;

      if (combined.isNotEmpty) {
        return ScriptureResult(
          reference: '$book $chapter:$start${verseEnd != null ? '-$actualEnd' : ''}',
          text: combined.trim(),
          version: _currentVersion,
          book: book,
          chapter: chapter,
          startVerse: start,
          endVerse: verseEnd != null ? actualEnd : null,
        );
      }
    }

    // 2. Contextual Detection
    if (_lastContextBook != null && 
        DateTime.now().difference(_lastContextTime).inMinutes < 5) { // 5 min context window
        
        // A. Chapter Switch (e.g. "Chapter 5") - Context is BOOK only
        // Matches "Chapter 5" or "Chapter 5 Verse 1"
        final chapterRegex = RegExp(r'chapter\s+(\d+)(?:[\s:.,]*(?:verse)?[\s:.,]*(\d+)(?:-(\d+))?)?', caseSensitive: false);
        final chMatch = chapterRegex.firstMatch(normalizedText);

        if (chMatch != null) {
           final chapter = chMatch.group(1);
           final verseStart = chMatch.group(2);
           final verseEnd = chMatch.group(3);

           if (chapter != null) {
              final book = _lastContextBook!;
              
              if (_bibleData.containsKey(book) && _bibleData[book].containsKey(chapter)) {
                  final chapterData = _bibleData[book][chapter];
                  
                  // Update Context
                  _lastDetection = DateTime.now();
                  _lastContextChapter = chapter;
                  _lastContextVerseEnd = null;
                  _lastContextTime = DateTime.now();

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
           }
        }

        // B. Verse Switch (e.g. "Verse 5") - Context is BOOK & CHAPTER
        if (_lastContextChapter != null) {
            // Look for explicit "verse X" pattern
            final verseRegex = RegExp(r'verse\s+(\d+)(?:-(\d+))?', caseSensitive: false);
            final match = verseRegex.firstMatch(normalizedText);

            if (match != null) {
               final verseStart = match.group(1);
               final verseEnd = match.group(2);
    
               if (verseStart != null) {
                  final book = _lastContextBook!;
                  final chapter = _lastContextChapter!;
                  
                  // Validate context still valid
                  if (_bibleData.containsKey(book) && _bibleData[book].containsKey(chapter)) {
                      final chapterData = _bibleData[book][chapter];
                      final start = int.parse(verseStart);
                      final end = verseEnd != null ? int.parse(verseEnd) : start;
                      
                      // Check if verse exists
                      if (chapterData.containsKey(start.toString())) {
                          _lastDetection = DateTime.now(); // Update debounce
                          _lastContextTime = DateTime.now(); // Refresh context
                          
                          String combined = '';
                          int actualEnd = start;
                          
                          for (int v = start; v <= end; v++) {
                            if (chapterData.containsKey(v.toString())) {
                              combined += '${chapterData[v.toString()]} ';
                              actualEnd = v;
                            }
                          }
                          
                          _lastContextVerseEnd = actualEnd;

                          return ScriptureResult(
                            reference: '$book $chapter:$start${verseEnd != null ? '-$actualEnd' : ''}',
                            text: combined.trim(),
                            version: _currentVersion,
                            book: book,
                            chapter: chapter,
                            startVerse: start,
                            endVerse: verseEnd != null ? actualEnd : null,
                          );
                      }
                  }
               }
            }
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
    'song of solomon': 'Song of Solomon',
    
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

    // Fuzzy Match against loaded Bible books
    if (_bibleData.isNotEmpty) {
      String? bestMatch;
      int minDistance = 100;

      for (final book in _bibleData.keys) {
        final bookLower = book.toLowerCase();
        final dist = _levenshtein(input, bookLower);
        
        // Adaptive threshold: 1 for short words, 2 for longer
        int threshold = input.length < 4 ? 1 : 2;
        
        if (dist <= threshold && dist < minDistance) {
          minDistance = dist;
          bestMatch = book;
        }
      }

      if (bestMatch != null) {
        return bestMatch;
      }
    }

    if (RegExp(r'^\d').hasMatch(input)) {
      final parts = input.split(' ');
      if (parts.length > 1) {
        return '${parts[0]} ${parts.sublist(1).map(_cap).join(' ')}';
      }
    }

    return _cap(input);
  }

  int _levenshtein(String s, String t) {
    if (s == t) return 0;
    if (s.isEmpty) return t.length;
    if (t.isEmpty) return s.length;

    List<int> v0 = List<int>.filled(t.length + 1, 0);
    List<int> v1 = List<int>.filled(t.length + 1, 0);

    for (int i = 0; i < t.length + 1; i++) v0[i] = i;

    for (int i = 0; i < s.length; i++) {
      v1[0] = i + 1;

      for (int j = 0; j < t.length; j++) {
        int cost = (s.codeUnitAt(i) == t.codeUnitAt(j)) ? 0 : 1;
        v1[j + 1] = (v1[j] + 1 < v0[j + 1] + 1)
            ? (v1[j] + 1 < v0[j] + cost ? v1[j] + 1 : v0[j] + cost)
            : (v0[j + 1] + 1 < v0[j] + cost ? v0[j + 1] + 1 : v0[j] + cost);
      }

      for (int j = 0; j < t.length + 1; j++) v0[j] = v1[j];
    }

    return v1[t.length];
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
    'sixty': '60',
    'seventy': '70',
    'eighty': '80',
    'ninety': '90',
    'ii': '2',
    'iii': '3',
    'first': '1',
    'second': '2',
    'third': '3',
    '1st': '1',
    '2nd': '2',
    '3rd': '3',
  };

  String _normalizeSpokenNumbers(String text) {
    var result = text;
    _spokenNumbers.forEach((k, v) {
      result = result.replaceAllMapped(
        RegExp(r'\b' + k + r'\b', caseSensitive: false),
        (_) => v,
      );
    });

    // Fix "twenty one" -> "20 1" -> "21" (merging split tens and ones)
    // Matches "20 1" ... "90 9" with optional hyphen or space
    result = result.replaceAllMapped(
      RegExp(r'\b([2-9]0)[\s-]+([1-9])\b'), 
      (Match m) {
        int tens = int.parse(m.group(1)!);
        int ones = int.parse(m.group(2)!);
        return (tens + ones).toString();
      }
    );

    // Handle Hundreds (e.g. "1 hundred and 50" -> "150")
    // This runs after single digits are normalized (one->1), so we look for "1 hundred"
    result = result.replaceAllMapped(
      RegExp(r'\b(\d+)\s*hundred(?:\s+and)?(?:\s+(\d+))?\b', caseSensitive: false),
      (Match m) {
        int hundreds = int.parse(m.group(1)!);
        int remainder = m.group(2) != null ? int.parse(m.group(2)!) : 0;
        return (hundreds * 100 + remainder).toString();
      }
    );
    
    // Support "Verse 5 and 6" -> "Verse 5-6"
    // Only applies if "and" is between two numbers
    result = result.replaceAllMapped(
      RegExp(r'(\d+)\s+and\s+(\d+)', caseSensitive: false),
      (Match m) => '${m.group(1)}-${m.group(2)}',
    );

    return result;
  }

  String _normalizeSermonSyntax(String text) {
    text = text.toLowerCase();

    // Remove punctuation that interferes with parsing (commas, periods)
    text = text.replaceAll(RegExp(r'[,\.]'), ' ');

    // Handle "Saint" / "St." (e.g. "St. John" -> "John")
    text = text.replaceAll(RegExp(r'\bst\.?\s+', caseSensitive: false), ' ');
    text = text.replaceAll(RegExp(r'\bsaint\s+', caseSensitive: false), ' ');
    
    // Handle "to the end" phrases (map to -999 so regex picks it up as a range)
    text = text.replaceAll(RegExp(r'\bto\s+the\s+end\b'), '-999');
    text = text.replaceAll(RegExp(r'\bthrough\s+the\s+end\b'), '-999');
    text = text.replaceAll(RegExp(r'\band\s+following\b'), '-999');
    text = text.replaceAll(RegExp(r'\bff\b'), '-999');

    // Handle "starting at", "beginning at"
    text = text.replaceAll(RegExp(r'\bstarting\s+at\b'), 'verse');
    text = text.replaceAll(RegExp(r'\bbeginning\s+at\b'), 'verse');
    text = text.replaceAll(RegExp(r'\bcommencing\s+at\b'), 'verse');

    // Handle "The", "Read", "Letter to", "Go to", "Jump to"
    text = text.replaceAll(RegExp(r'\bthe\b'), ' ');
    text = text.replaceAll(RegExp(r'\bread\b'), ' ');
    text = text.replaceAll(RegExp(r'\bgo to\b'), ' ');
    text = text.replaceAll(RegExp(r'\bjump to\b'), ' ');
    text = text.replaceAll(RegExp(r'\bletter\s+(?:of\s+|to\s+)?'), ' ');

    // Handle "Jude verse 5" -> "Jude 5" (strip 'verse' for single chapter books to help parser)
    // "3 John verse 4" -> "3 John 4"
    text = text.replaceAllMapped(
      RegExp(r'\b(obadiah|philemon|jude|2 john|3 john)\s+verse\s+(\d+)', caseSensitive: false),
      (m) => '${m.group(1)} ${m.group(2)}'
    );

    // Handle "I" as "1" only before specific multi-part books (e.g. "I Peter")
    // (We don't want to replace "I" globally as it matches the pronoun)
    text = text.replaceAllMapped(
      RegExp(r'\bi\s+(?=(?:samuel|kings|chronicles|corinthians|thessalonians|timothy|peter|john)\b)', caseSensitive: false),
      (match) => '1 ',
    );

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
    text = text.replaceAll(RegExp(r'\s*-\s*'), '-'); // Collapse spaces around hyphens
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
