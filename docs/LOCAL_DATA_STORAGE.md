# Nango-NEO ローカル保存

- `RUN_NANGO.bat` または `python run.py` で起動してください。
- 登録・編集・削除・インポートなどの変更は `user_data/nango_data.json` に自動保存されます。
- 次回起動時はこのファイルの内容を優先して読み込みます。
- `user_data` フォルダーをバックアップすれば、登録データを保管できます。
- HTMLを直接開いた場合、Python側のファイル保存機能は使われません。
- ブラウザーの `localStorage` にも予備として保存します。
