# VOICEVOX TTS 導入計画

## Context
現在のOpenAI TTS APIをVOICEVOXに置き換え、ローカルでの音声合成を可能にする。
API代の削減とレイテンシ改善が目的。OpenAI TTSはフォールバックとして残す。

## 前提情報
- VOICEVOX ENGINEの公式Docker image: `voicevox/voicevox_engine:cpu-latest` (ARM64対応)
- API: `POST /audio_query` → `POST /synthesis` (port 50021)
- Phase 0スクリプト `app/scripts/04_speak.ts` に既存のVOICEVOX呼び出しコードあり
- RPi5: 8GB RAM、現在33.4%使用中（約5.3GB空き）

## 実装ステップ

### Step 1: api.ts — voice パイプラインの各ステップに所要時間ログを追加
- transcribe, chat, synthesize, 全体の各所要時間を計測してログ出力
- 例: `[voice] transcribe: 1200ms, chat: 800ms, synthesize: 600ms, total: 2600ms`
- VOICEVOX導入前後で比較するベースラインを取る

### Step 2: k8s — VOICEVOX Deployment + Service
- `k8s/base/voicevox-deployment.yaml` を新規作成
  - image: `voicevox/voicevox_engine:cpu-latest`
  - port: 50021
  - resources: requests 256Mi/200m, limits 2Gi/1000m（メモリ多め）
  - readiness probe: `GET /speakers`
- `k8s/base/voicevox-service.yaml` を新規作成
  - ClusterIP Service, port 50021
  - app コンテナから `http://voicevox:50021` でアクセス
- `k8s/base/kustomization.yaml` に追加

### Step 3: config.ts — TTS エンジン切り替え設定
- `TTS_ENGINE` 環境変数を追加（"voicevox" | "openai", デフォルト "voicevox"）
- `VOICEVOX_URL` 環境変数（デフォルト "http://voicevox:50021"）
- `VOICEVOX_SPEAKER` 環境変数（デフォルト "1" = ずんだもん）

### Step 4: tts.ts — VOICEVOX 対応 + フォールバック
- `04_speak.ts` の `synthesizeVoicevox()` ロジックを `tts.ts` に移植
- config.ttsEngine に応じて VOICEVOX / OpenAI を切り替え
- VOICEVOX 呼び出し失敗時に OpenAI にフォールバック（ログ出力）

### Step 5: ConfigMap — 環境変数追加
- `k8s/base/configmap.yaml` に `TTS_ENGINE`, `VOICEVOX_URL`, `VOICEVOX_SPEAKER` を追加

### Step 6: Grafana — メモリアラート設定
- RPi node のメモリ使用率が80%を超えたらSlackアラート
- 既存のGrafana dashboard に閾値ラインを追加

## 検証方法
1. OpenAI TTSでのベースライン計測（Step 1のログで各ステップの所要時間を確認）
2. VOICEVOX Pod が Running になることを確認
3. `kubectl exec` でapp コンテナから `curl http://voicevox:50021/speakers` が返ることを確認
4. wakeword → 応答がVOICEVOXの音声で返ることを確認
5. VOICEVOX導入後の所要時間ログとベースラインを比較
6. VOICEVOX Podを停止 → OpenAI TTSにフォールバックすることを確認
7. Grafana でメモリ使用率を確認、アラートが機能することを確認

## 実験結果 (2026-03-15)

### 計測データ
VOICEVOX ENGINE (cpu-latest, ARM64, RPi5 4コア, `--cpu_num_threads 4`):
```
[voice] transcribe: 1567ms, chat: 2465ms, synthesize: 18849ms, total: 22881ms
[voice] transcribe: 1316ms, chat: 3070ms, synthesize: 10994ms, total: 15380ms
```
- synthesize: 11〜19秒（応答テキストの長さに比例）
- `--cpu_num_threads 1`（デフォルト）では47秒かかっていた

### 比較
| ステップ | OpenAI API | VOICEVOX CPU (4thread) |
|---|---|---|
| transcribe (Whisper) | 1.3-1.6s | 同左 |
| chat (GPT-4o-mini) | 2.5-3s | 同左 |
| synthesize | 1-2s (推定) | 11-19s |
| **total** | **5-7s (推定)** | **15-23s** |

### 判断
- VOICEVOX CPUモードはRPi5では実用的な速度に達しない
- 4スレッド化で47秒→11-19秒に改善したが、OpenAI TTSの1-2秒と比較して大幅に遅い
- wakeword listenerのHTTPタイムアウト(30秒)にも引っかかるリスクがある
- → **OpenAI TTSに戻す**。VOICEVOX Deployment/Serviceは削除
- アプリ側のVOICEVOX対応コード (tts.ts, config.ts) は残す。将来GPU環境で再利用可能

### 発生した問題
1. VOICEVOX entrypoint.shが `exec "$@"` 形式のため、argsにフルコマンドパスが必要
2. イメージ内にpythonコマンドがなく `/opt/voicevox_engine/run` が正しいバイナリパス
3. デフォルト1スレッドでは47秒かかり、wakeword listenerが30秒でタイムアウト

## 重要ファイル
- `/home/fourside/dev/majel/app/src/services/tts.ts` — TTS実装
- `/home/fourside/dev/majel/app/src/config.ts` — 設定
- `/home/fourside/dev/majel/app/scripts/04_speak.ts` — 既存のVOICEVOX呼び出しコード
- `/home/fourside/dev/majel/k8s/base/app-deployment.yaml` — 既存のk8sデプロイ
- `/home/fourside/dev/majel/k8s/base/kustomization.yaml` — リソース一覧
- `/home/fourside/dev/majel/k8s/base/configmap.yaml` — 環境変数
