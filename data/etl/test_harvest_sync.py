
import unittest
import sys
from unittest.mock import MagicMock

# Mock requests and pandas before importing harvest_api_sync
sys.modules["requests"] = MagicMock()
sys.modules["pandas"] = MagicMock()

from harvest_api_sync import clean_nans

class TestHarvestSync(unittest.TestCase):
    def test_clean_nans_float(self):
        self.assertIsNone(clean_nans(float('nan')))
        self.assertEqual(clean_nans(1.5), 1.5)
        self.assertEqual(clean_nans(0.0), 0.0)

    def test_clean_nans_list(self):
        data = [1, float('nan'), 3]
        expected = [1, None, 3]
        self.assertEqual(clean_nans(data), expected)

    def test_clean_nans_dict(self):
        data = {'a': 1, 'b': float('nan'), 'c': {'d': float('nan')}}
        expected = {'a': 1, 'b': None, 'c': {'d': None}}
        self.assertEqual(clean_nans(data), expected)

    def test_clean_nans_mixed(self):
        data = [{'a': float('nan')}, [float('nan'), 2]]
        expected = [{'a': None}, [None, 2]]
        self.assertEqual(clean_nans(data), expected)

if __name__ == '__main__':
    unittest.main()
