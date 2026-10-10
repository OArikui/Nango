#!/usr/bin/env python3
"""Launch Nango-neo v2.6.0 locally using only Python's standard library.

Usage: python run.py [--port 8765] [--no-browser]
"""
from __future__ import annotations
import argparse
import json
import http.server
import socket
import threading
import webbrowser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent / "Nango-neo"
ENTRY = "/Nango-neo.v02.6.0.html"
DATA_DIR = Path(__file__).resolve().parent / "user_data"
DATA_FILE = DATA_DIR / "nango_data.json"
MAX_DATA_BYTES = 10 * 1024 * 1024

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send_json(self, status: int, payload: object) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if urlparse(self.path).path == "/api/data":
            if DATA_FILE.is_file():
                try:
                    with DATA_FILE.open("r", encoding="utf-8") as file:
                        data = json.load(file)
                    self._send_json(200, {"exists": True, "data": data})
                except (OSError, json.JSONDecodeError) as error:
                    self._send_json(500, {"error": f"保存データを読み込めません: {error}"})
            else:
                self._send_json(200, {"exists": False, "data": None})
            return
        super().do_GET()

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/data":
            self._send_json(404, {"error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_DATA_BYTES:
                self._send_json(413, {"error": "データサイズが不正か、上限を超えています"})
                return
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict) or not isinstance(payload.get("words"), dict):
                self._send_json(400, {"error": "Nango形式のJSONではありません"})
                return
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            temporary = DATA_FILE.with_suffix(".json.tmp")
            with temporary.open("w", encoding="utf-8", newline="\n") as file:
                json.dump(payload, file, ensure_ascii=False, indent=2)
                file.write("\n")
            temporary.replace(DATA_FILE)
            self._send_json(200, {"ok": True})
        except (UnicodeDecodeError, json.JSONDecodeError, OSError, ValueError) as error:
            self._send_json(400, {"error": f"保存に失敗しました: {error}"})

    def log_message(self, fmt, *args):
        if args and (str(args[1]).startswith("4") or str(args[1]).startswith("5")):
            super().log_message(fmt, *args)


def find_port(preferred: int) -> int:
    for port in range(preferred, preferred + 20):
        with socket.socket() as sock:
            try:
                sock.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("空いているポートが見つかりませんでした。")

def main() -> None:
    parser = argparse.ArgumentParser(description="Nango-neo をローカルで起動します")
    parser.add_argument("--port", type=int, default=8765, help="ポート番号（既定: 8765）")
    parser.add_argument("--no-browser", action="store_true", help="ブラウザーを自動で開かない")
    args = parser.parse_args()
    if not (ROOT / ENTRY.lstrip("/")).is_file():
        raise SystemExit(f"アプリのHTMLが見つかりません: {ROOT / ENTRY.lstrip('/')}")
    port = find_port(args.port)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), QuietHandler)
    url = f"http://127.0.0.1:{port}{ENTRY}"
    print(f"Nango-neo を起動しました: {url}")
    print("終了するには、このウィンドウで Ctrl+C を押してください。")
    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nNango-neo を終了します。")
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
