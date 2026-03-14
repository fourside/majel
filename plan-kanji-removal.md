# 漢字排除（カタカナ・英数字はOK）の導入計画

## Context

MAJELの音声パイプラインで、画面に表示されるテキスト（Whisper書き起こし + LLM応答）から**漢字のみを排除**する。カタカナ・英数字・記号はそのまま残す。決定的な結果を得るため、辞書ベースの形態解析ライブラリ `@patdx/kuromoji`（依存ゼロ、17.9MB）を使用する。

## 変換ロジック

kuromojiのトークンごとに:
- `reading`（カタカナ）がある場合 → `surface_form` に漢字が含まれていれば `reading` で置換
- `reading` がない場合 → `surface_form` をそのまま使用
- カタカナ・ひらがな・英数字・記号のみのトークン → そのまま

例: `"今日はいい天気ですね"` → `"キョウはいいテンキですね"`

## 変更箇所

### 1. `app/deno.json` — Deno設定変更
- `"nodeModulesDir": "auto"` を追加（辞書ファイルのパス解決に必要）
- `"@patdx/kuromoji": "npm:@patdx/kuromoji"` をimportsに追加

### 2. `app/src/services/kana.ts` — 新規: 変換サービス
- `@patdx/kuromoji` のTokenizerをラップする薄いモジュール
- 起動時に1回だけTokenizerを初期化（辞書ロード）
- `removeKanji(text: string): string` を公開
  - トークンの `surface_form` に漢字が含まれるかチェック（正規表現 `/[\u4E00-\u9FFF]/`）
  - 漢字を含むトークンのみ `reading`（カタカナ）で置換
  - それ以外はそのまま
- 将来的に別の実装に差し替えられるよう、インターフェースをシンプルに保つ

### 3. `app/src/routes/api.ts` — Whisper出力の変換
- `api.ts:81` の直後で `text = removeKanji(text)` を適用
- broadcastとLLMに渡るテキストがすべて漢字なしになる

### 4. `app/src/services/llm.ts` — LLM応答の変換
- 2つのアプローチを併用:
  - **システムプロンプト**: 「漢字を使わないでください。カタカナとひらがなで応答してください」を追加
  - **`chat()` の戻り値**: `removeKanji()` で変換（LLMが漢字を使った場合のフォールバック）

## 変更しない箇所
- TTS (`tts.ts`): 読み上げは漢字があっても問題ない。変換後テキストでも動作する
- フロントエンド (`majel-response.js`): バックエンドで変換済みなので変更不要

## 検証方法
1. `deno task start` でサーバー起動、辞書ロードのログ確認
2. `POST /api/ask` に漢字混じりテキストを送信 → 応答に漢字がないか確認
3. カタカナ・英数字がそのまま残っていることを確認
