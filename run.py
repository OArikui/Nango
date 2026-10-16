#!/usr/bin/env python3
"""Launch Nango-neo v2.10.0 locally using only Python's standard library.

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
from urllib.parse import parse_qs, urlparse

PROJECT_ROOT = Path(__file__).resolve().parent
ROOT = PROJECT_ROOT / "Nango-neo"
ENTRY = "/Nango-neo.v02.10.0.html"
DATA_DIR = PROJECT_ROOT / "user_data"
DEFAULT_DATA_FILE = DATA_DIR / "nango_data.json"
CONFIG_FILE = DATA_DIR / "settings.json"
DATA_FILE = DEFAULT_DATA_FILE
MAX_DATA_BYTES = 10 * 1024 * 1024
FORMAT_FILES = {
    "schema": ROOT / "DTformats.neo.v5.17" / "DF-FMT_schema.v01.17.json",
    "instruction": ROOT / "DTformats.neo.v5.17" / "DT-FMT_instruction_AI.v01.17.json",
    "template": ROOT / "DTformats.neo.v5.17" / "DT-FMT_template.v02.17.json",
}


def configure_data_file() -> None:
    """Load the configured JSON path, falling back to the project-local default."""
    global DATA_FILE
    try:
        with CONFIG_FILE.open("r", encoding="utf-8") as file:
            config = json.load(file)
        value = config.get("data_file") if isinstance(config, dict) else None
        if isinstance(value, str) and value.strip():
            candidate = Path(value).expanduser()
            if candidate.is_absolute() and (not candidate.exists() or candidate.is_file()):
                DATA_FILE = candidate.resolve()
    except (OSError, json.JSONDecodeError, ValueError):
        DATA_FILE = DEFAULT_DATA_FILE


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

    @staticmethod
    def _write_json_atomically(target: Path, payload: object) -> None:
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix(target.suffix + ".tmp")
        with temporary.open("w", encoding="utf-8", newline="\n") as file:
            json.dump(payload, file, ensure_ascii=False, indent=2)
            file.write("\n")
        temporary.replace(target)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/data-path":
            self._send_json(200, {"path": str(DATA_FILE), "is_default": DATA_FILE == DEFAULT_DATA_FILE})
            return
        if parsed.path == "/api/format":
            name = parse_qs(parsed.query).get("name", [""])[0]
            format_path = FORMAT_FILES.get(name)
            if format_path is None:
                self._send_json(400, {"error": "未知のフォーマット名です"})
                return
            try:
                with format_path.open("r", encoding="utf-8") as file:
                    payload = json.load(file)
                self._send_json(200, payload)
            except (OSError, json.JSONDecodeError) as error:
                self._send_json(500, {"error": f"DT-FMT を読み込めません: {error}"})
            return
        if parsed.path == "/api/data":
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

    def _change_data_path(self, request: object) -> None:
        global DATA_FILE
        if not isinstance(request, dict):
            self._send_json(400, {"error": "保存先設定の形式が不正です"})
            return
        raw_path = request.get("path")
        data = request.get("data")
        if not isinstance(raw_path, str) or not raw_path.strip():
            self._send_json(400, {"error": "保存先の絶対パスを入力してください"})
            return
        target = Path(raw_path.strip()).expanduser()
        if not target.is_absolute() or (target.exists() and target.is_dir()):
            self._send_json(400, {"error": "保存先には有効なファイルの絶対パスを指定してください"})
            return
        target = target.resolve()
        if target == DATA_FILE:
            self._send_json(200, {"ok": True, "path": str(DATA_FILE), "unchanged": True})
            return
        if target.exists():
            self._send_json(409, {"error": "指定先には既存ファイルがあります。既存データを上書きしないため、別のファイル名を指定してください。"})
            return
        if not isinstance(data, dict) or not isinstance(data.get("words"), dict):
            self._send_json(400, {"error": "現在の辞書データが不正なため、保存先を変更できません"})
            return
        try:
            self._write_json_atomically(target, data)
            self._write_json_atomically(CONFIG_FILE, {"data_file": str(target)})
            DATA_FILE = target
        except OSError as error:
            self._send_json(500, {"error": f"保存先を変更できません: {error}"})
            return
        self._send_json(200, {"ok": True, "path": str(DATA_FILE)})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path not in ("/api/data", "/api/data-path"):
            self._send_json(404, {"error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_DATA_BYTES:
                self._send_json(413, {"error": "データサイズが不正か、上限を超えています"})
                return
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if parsed.path == "/api/data-path":
                self._change_data_path(payload)
                return
            if not isinstance(payload, dict) or not isinstance(payload.get("words"), dict):
                self._send_json(400, {"error": "Nango形式のJSONではありません"})
                return
            self._write_json_atomically(DATA_FILE, payload)
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
    configure_data_file()
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
