# Preact + CSS Modules 移行計画

## Context
フロントエンドをvanilla JS Web ComponentsからPreact (JSX) + CSS Modulesに移行する。
ビルドツールはesbuild（CSS Modules組み込み対応）。状態管理は@preact/signals。
rolldown RC版はCSS bundlingを廃止済み（issue #4271）のため、esbuildにフォールバック。
目的：JSXによるテンプレートの見通し改善、CSS Modulesによるスタイルスコープの確保。

## CSS Modules 方針
rolldown RC版はCSS bundlingの実験的サポートを削除済み（issue #4271）。
unplugin-lightningcss を試みたが、rolldown が .css import を検出した時点で
プラグイン実行前にエラーになるため回避不可。
esbuild v0.25 の組み込み CSS Modules（local-css）を使用。

## ファイル構成

```
app/
  ui/                              # NEW: Preact ソース
    main.tsx                       # エントリ: render(<App />)
    app.tsx                        # <App />: WebSocket接続, レイアウト
    signals.ts                     # 共有signals定義
    ws.ts                          # WebSocketメッセージハンドラ (テスト可能)
    ws_test.ts                     # wsハンドラのテスト
    components/
      Clock.tsx + Clock.module.css
      Weather.tsx + Weather.module.css
      Sensors.tsx + Sensors.module.css
      Response.tsx + Response.module.css
      Status.tsx + Status.module.css
    build.ts                       # esbuildビルド設定
  dist/                            # NEW: ビルド出力 (.gitignored)
    bundle.js
    bundle.css
  static/
    index.html                     # 変更: dist/bundle.js + dist/bundle.css を参照
    global.css                     # NEW: style.css からグローバル部分を抽出
    fonts/, images/                # 変更なし
    lib/                           # 変更なし (テスト含む)
  src/
    server.ts                      # 変更: serveStatic に dist/ を追加
  deno.json                        # 変更: imports, tasks, compilerOptions
```

## 実装ステップ

### Step 1: deno.json 設定
- imports に preact, @preact/signals, rolldown, unplugin-lightningcss を追加
- compilerOptions に jsx 設定
- tasks に `build`, `dev` を追加
- fmt/lint exclude に `dist/` を追加

### Step 2: rolldown.config.ts
- input: `./ui/main.tsx`
- output: `./dist/` (format: esm)
- unplugin-lightningcss プラグインで CSS Modules 処理
- `.css` ファイルは moduleTypes: `"empty"` で rolldown 側のCSS処理を無効化
- `--watch` 引数で watch モード対応

### Step 3: server.ts 変更
- `/dist/*` 用の serveStatic を追加 (`root: "./dist"`)
- 既存の `./static` 配信はそのまま

### Step 4: signals.ts
```ts
import { signal } from "@preact/signals";
export const statusPhase = signal("done");
export const isDisconnected = signal(false);
export const sensorData = signal(null);
export const lastTranscription = signal("");
export const responseText = signal(null);
export const responseError = signal(null);
```

### Step 5: ws.ts — WebSocketメッセージハンドラ
- WebSocket onmessage のメッセージ解析・signal更新ロジックを純粋関数として切り出す
- `handleWsMessage(msg: unknown): void` — メッセージ種別に応じてsignalを更新
- テスト可能: メッセージを渡してsignalの値が期待通り変わることを検証

### Step 6: app.tsx + main.tsx
- WebSocket接続・再接続ロジックを app.js から移植
- onmessage で ws.ts の handleWsMessage を呼ぶ
- レイアウトは既存の .dashboard grid を利用
- main.tsx で `render(<App />, document.querySelector(".dashboard"))`

### Step 7: コンポーネント移行 (5つ)

| Component | 元ファイル | ポイント |
|-----------|-----------|---------|
| Clock | majel-clock.js (40行) | useEffect + useRef で1s interval、flip animation |
| Weather | majel-weather.js (53行) | useEffect で10min fetch、lib/weather.js を利用 |
| Sensors | majel-sensors.js (96行) | sensorData signal を購読、lib/format.js + graph.js 利用 |
| Response | majel-response.js (74行) | typewriter: useState(charIndex) + 30ms setInterval |
| Status | majel-status.js (51行) | statusPhase signal 購読、thinking 時の ellipsis animation |

### Step 8: CSS分割
- style.css → global.css (フォント、CSS変数、リセット、body背景、dashboard grid、keyframes)
- 各コンポーネント固有スタイル → *.module.css
- マイクボタン関連CSS (.mic-button, @keyframes mic-pulse) は削除
- ステータスバーの grid-template-columns を `auto 1fr` に変更

### Step 9: index.html 更新
- カスタム要素タグ、マイクボタンを削除
- `<div class="dashboard"></div>` のみ残す
- `/dist/bundle.js` と `/dist/bundle.css` と `/global.css` を参照

### Step 10: ws_test.ts — WebSocketハンドラのテスト
- `handleWsMessage` に各種メッセージを渡し、signalの値を検証
- テストケース: sensors メッセージ、status メッセージ (各phase)、不正なメッセージ

### Step 11: CI — ビルドチェック追加
- `.github/workflows/ci.yaml` の App (Deno) ジョブに `deno task build` ステップを追加（Test の前）
- ビルドエラーの早期検知

### Step 12: Dockerfile — ビルドステップ追加
- `COPY ui/ ui/` を追加
- `RUN deno task build` を `deno cache` の前に追加
- `COPY dist/ dist/` は不要（Dockerfile内でビルドするため）

### Step 13: クリーンアップ
- static/app.js, static/components/, static/style.css を削除
- .gitignore に `app/dist/` を追加

## テスト
- `static/lib/` の既存テストは変更なし、そのまま動作
- `ui/ws_test.ts` を新規追加: WebSocketメッセージハンドラのユニットテスト
- deno.json の test タスクに `ui/` を追加: `deno test --allow-read --allow-env src/ static/lib/ ui/`
- コンポーネントのテストは不要（ブラウザで確認）

## 検証方法
1. `cd app && deno task build` でビルド成功を確認
2. `deno task start` でサーバー起動
3. ブラウザで http://localhost:3000 を開き、全コンポーネントの表示を確認
4. `deno task test` で既存テストがパスすることを確認
5. WebSocket 経由のセンサーデータ・ステータス更新が動作することを確認

## ビルドタイミング
- **開発時**: `deno task dev` (rolldown watch) を別ターミナルで起動
- **CI**: `deno task build` を fmt/lint/test の前に実行しビルドエラーを検知
- **CD (Docker)**: Dockerfile 内で `deno task build` を実行し、イメージにビルド成果物を含める

## 重要ファイル (参照用)
- `/home/fourside/dev/majel/app/static/app.js` — WebSocket + マイクボタンロジック
- `/home/fourside/dev/majel/app/static/style.css` — 全スタイル (426行)
- `/home/fourside/dev/majel/app/static/components/*.js` — 5コンポーネント
- `/home/fourside/dev/majel/app/static/lib/*.js` — ユーティリティ (テスト付き)
- `/home/fourside/dev/majel/app/src/server.ts` — Hono + serveStatic
- `/home/fourside/dev/majel/app/deno.json` — タスク・インポート設定
