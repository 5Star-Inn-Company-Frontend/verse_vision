
import unittest
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import offline_server

class TestUserCase(unittest.TestCase):
    def setUp(self):
        # Mock Bible Data
        offline_server.bible_versions = {
            'kjv': [
                {'name': 'John', 'chapters': [[''], [''], ['verse 1', 'verse 2', 'verse 3', 'verse 4', 'verse 5', 'verse 6', 'verse 7', 'verse 8', 'verse 9', 'verse 10', 'verse 11', 'verse 12', 'verse 13', 'verse 14', 'verse 15', 'For God so loved the world...']]},
            ]
        }

    def test_dot_notation(self):
        text = "The following is a church service recording containing Bible verses, scripture readings, and sermons. The following is a church recording containing Bible verses, scripture readings, and sermons. The Bible is a group of John, Christ's team. The following is a church service recording containing Bible verses, scripture readings, and sermons. Don't you have a terrible system? We can just call it quick. The Bible is in the name of God. John 3.16, John chapter 3.16."
        results = offline_server.extract_references(text)
        print(f"\nResults found: {results}")
        
        found = False
        for res in results:
            if "John 3:16" in res['reference']:
                found = True
                break
        
        self.assertTrue(found, "Should detect John 3.16 or John chapter 3.16")

if __name__ == '__main__':
    unittest.main()
