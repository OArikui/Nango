"""Tests for the run.py local launcher API. Run: python -m unittest test_or_future.test_run_api -v"""
import http.client
import http.server
import importlib.util
import json
import tempfile
import threading
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("nango_run", ROOT / "run.py")
run = importlib.util.module_from_spec(spec)
spec.loader.exec_module(run)

DOC = {"words": {"テスト": {"meanings": [{"definition": "定義"}]}}, "additional_data": []}


class LauncherApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.data_file = Path(cls.tmp.name) / "nango_data.json"
        cls.original = (run.DATA_FILE, run.DEFAULT_DATA_FILE, run.CONFIG_FILE)
        run.DATA_FILE = run.DEFAULT_DATA_FILE = cls.data_file
        run.CONFIG_FILE = Path(cls.tmp.name) / "settings.json"
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), run.QuietHandler)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        run.DATA_FILE, run.DEFAULT_DATA_FILE, run.CONFIG_FILE = cls.original
        cls.tmp.cleanup()

    def request(self, method, path, body=None, headers=None):
        base = {"Host": f"127.0.0.1:{self.port}"}
        base.update(headers or {})
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        connection.putrequest(method, path, skip_host=True)
        for name, value in base.items():
            connection.putheader(name, value)
        payload = body.encode("utf-8") if isinstance(body, str) else body
        if payload is not None:
            connection.putheader("Content-Length", str(len(payload)))
        connection.endheaders(payload)
        response = connection.getresponse()
        data = response.read()
        connection.close()
        return response.status, data

    def post_data(self, content_type="application/json; charset=utf-8", **headers):
        merged = {"Content-Type": content_type, **headers}
        return self.request("POST", "/api/data", json.dumps(DOC), merged)

    def test_same_origin_json_post_is_saved(self):
        status, _ = self.post_data(Origin=f"http://127.0.0.1:{self.port}")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(self.data_file.read_text(encoding="utf-8")), DOC)

    def test_simple_content_type_is_rejected(self):
        self.data_file.unlink(missing_ok=True)
        status, _ = self.post_data(content_type="text/plain;charset=UTF-8")
        self.assertEqual(status, 415)
        self.assertFalse(self.data_file.exists())

    def test_foreign_origin_is_rejected(self):
        self.data_file.unlink(missing_ok=True)
        status, _ = self.post_data(Origin="https://evil.example")
        self.assertEqual(status, 403)
        self.assertFalse(self.data_file.exists())

    def test_foreign_host_is_rejected(self):
        status, _ = self.request("GET", "/api/data", headers={"Host": "rebind.example"})
        self.assertEqual(status, 403)

    def test_data_path_change_requires_trusted_request(self):
        target = Path(self.tmp.name) / "elsewhere.json"
        body = json.dumps({"path": str(target), "data": DOC})
        status, _ = self.request("POST", "/api/data-path", body, {"Content-Type": "text/plain", "Origin": "https://evil.example"})
        self.assertEqual(status, 403)
        self.assertFalse(target.exists())

    def test_static_app_page_is_still_served(self):
        status, body = self.request("GET", run.ENTRY)
        self.assertEqual(status, 200)
        self.assertIn(b"NANGO-NEO", body)


if __name__ == "__main__":
    unittest.main()
