
import unittest
import sys
import os

# Add current directory to path so we can import offline_server
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import offline_server

class TestNigerianLogic(unittest.TestCase):
    def setUp(self):
        # Mock Bible Data
        offline_server.bible_versions = {
            'kjv': [
                {'name': 'Genesis', 'chapters': [['Gen 1:1 text']]},
                {'name': 'John', 'chapters': [[''], [''], ['verse 1', 'verse 2', 'verse 3', 'verse 4', 'verse 5', 'verse 6', 'verse 7', 'verse 8', 'verse 9', 'verse 10', 'verse 11', 'verse 12', 'verse 13', 'verse 14', 'verse 15', 'For God so loved the world...']]},
                {'name': 'Psalms', 'chapters': [['']]*150},
                {'name': '1 Samuel', 'chapters': [['']]*31},
                {'name': '1 Thessalonians', 'chapters': [['']]*5},
            ]
        }
        # Populate chapters properly for Psalms to avoid index errors if checked deep
        offline_server.bible_versions['kjv'][2]['chapters'][22] = ['The Lord is my shepherd...'] # Psalm 23

    def test_number_conversion(self):
        self.assertEqual(offline_server.convert_spoken_numbers("chapter three"), "chapter 3")
        self.assertEqual(offline_server.convert_spoken_numbers("twenty three"), "23")
        self.assertEqual(offline_server.convert_spoken_numbers("one hundred fifty"), "150")
        self.assertEqual(offline_server.convert_spoken_numbers("first samuel"), "1 samuel")

    def test_nigerian_aliases(self):
        self.assertEqual(offline_server.normalize_book_name("Joan"), "John")
        self.assertEqual(offline_server.normalize_book_name("Jorn"), "John")
        self.assertEqual(offline_server.normalize_book_name("Sams"), "Psalms")
        self.assertEqual(offline_server.normalize_book_name("Gen"), "Genesis")
        self.assertEqual(offline_server.normalize_book_name("Tessalonians"), "Thessalonians")

    def test_extraction_simple(self):
        text = "Open your bible to John 3:16"
        results = offline_server.extract_references(text)
        self.assertTrue(len(results) > 0)
        self.assertEqual(results[0]['reference'], "John 3:16")

    def test_extraction_nigerian_accent(self):
        text = "Let us read from Joan chapter three verse sixteen"
        results = offline_server.extract_references(text)
        self.assertTrue(len(results) > 0)
        self.assertEqual(results[0]['reference'], "John 3:16")

    def test_extraction_pidgin(self):
        text = "Make we read Gen one one"
        results = offline_server.extract_references(text)
        self.assertTrue(len(results) > 0)
        self.assertEqual(results[0]['reference'], "Genesis 1:1")

    def test_extraction_spoken_numbers(self):
        text = "Psalm twenty three"
        results = offline_server.extract_references(text)
        self.assertTrue(len(results) > 0)
        self.assertEqual(results[0]['reference'], "Psalms 23")

    def test_extraction_ambiguous_first(self):
        text = "First Sam chapter three"
        results = offline_server.extract_references(text)
        self.assertTrue(len(results) > 0)
        self.assertEqual(results[0]['reference'], "1 Samuel 3")

if __name__ == '__main__':
    unittest.main()
