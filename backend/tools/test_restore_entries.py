"""Tests of restore_entries.py: python -B -m unittest discover -s tools -p "test_*.py" (from backend/)."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOL = Path(__file__).with_name("restore_entries.py")
ENTRY = {
    "id": 7, "tmdbId": 900000001, "mediaType": "TV", "category": "SERIAL", "title": "It's a Test",
    "originalTitle": None, "releaseYear": 2026, "countries": ["KR"], "genreIds": [18, 35],
    "cast": ["A B", "C D"], "overview": "First line.\n\nSecond line.",
    "posterUrl": "https://image.tmdb.org/t/p/w500/abc.jpg", "tmdbRating": 8.6, "myRating": 9,
    "review": "Вельмі добра", "titleBe": "Гэта тэст", "overviewBe": None,
    "createdAt": "2026-11-01T10:00:00Z",
}


class RestoreEntriesTest(unittest.TestCase):
    def run_tool(self, folder, *extra):
        source = Path(folder, "entries.json")
        source.write_text(json.dumps([ENTRY], ensure_ascii=False), encoding="utf-8")
        return subprocess.run([sys.executable, "-B", str(TOOL), str(source), *extra], capture_output=True)

    def check_sql(self, raw):
        # UTF-8 without a byte order mark, no zero bytes of UTF-16, line feeds only
        self.assertFalse(raw.startswith((b"\xff\xfe", b"\xfe\xff", b"\xef\xbb\xbf")))
        self.assertNotIn(b"\x00", raw)
        self.assertNotIn(b"\r", raw)
        text = raw.decode("utf-8")
        self.assertIn("'Вельмі добра'", text)
        self.assertIn("'Гэта тэст'", text)
        self.assertIn("'It''s a Test'", text)
        self.assertIn("E'First line.\\n\\nSecond line.'", text)
        self.assertIn("'/abc.jpg'", text)
        self.assertTrue(text.startswith("-- Generated"))
        self.assertTrue(text.endswith("COMMIT;\n"))
        self.assertEqual(text.count("INSERT INTO entry"), 1)

    def test_writes_the_named_file_as_utf8_itself(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder, "restore.sql")
            result = self.run_tool(folder, str(target))
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout, b"")
            self.check_sql(target.read_bytes())

    def test_standard_output_is_utf8_whatever_the_console_code_page(self):
        with tempfile.TemporaryDirectory() as folder:
            result = self.run_tool(folder)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.check_sql(result.stdout)

    def test_wrong_arguments_explain_the_usage(self):
        result = subprocess.run([sys.executable, "-B", str(TOOL)], capture_output=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn(b"usage:", result.stderr)


if __name__ == "__main__":
    unittest.main()
