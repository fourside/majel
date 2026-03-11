# sensors

RPi 上で動作するセンサー読み取り＋ウェイクワード検出コンテナ。

## 構成

| ファイル | 役割 |
|---------|------|
| `main.py` | I2C センサー読み取り (HTU21D, BMP180, BH1750) → `/tmp/majel/majel_sensors.json` に書き出し |
| `wakeword_listener.py` | ALSA マイクからウェイクワード ("hey majel") を検出 → 録音 → app の `/api/voice` へ POST |
| `entrypoint.sh` | 上記 2 プロセスをバックグラウンド起動し、どちらかが終了したら全体を停止 |
| `Dockerfile` | マルチステージビルド (uv + python:3.12-slim) |

## Python バージョン: 3.12

`Dockerfile` で `python:3.12-slim` を使用している。3.12 を選択した理由:

- openwakeword, pyalsaaudio, smbus2 など C 拡張を含む依存が 3.12 で動作確認済み
- 3.13+ では C 拡張のビルドで問題が出るリスクがある

### uv.lock とローカル Python バージョンの不一致に注意

`uv lock` はローカルの Python バージョンを基準にロックファイルを生成する。ローカルが 3.14 など Docker と異なるバージョンの場合、ビルドが失敗する。

```bash
# Docker 内の Python バージョンに合わせてロックファイルを生成する
uv lock --python 3.12
```

## openwakeword のバージョン

PyPI 版 (v0.4.0) は Python 3.12 で動作しないため、GitHub main ブランチ (v0.6.0 相当) を直接参照している。

```toml
"openwakeword @ git+https://github.com/dscripka/openWakeWord.git"
```

v0.6.0 での主な変更点:

- `tflite-runtime` → `ai-edge-litert` に移行 (Python 3.12 対応)
- デフォルトの推論フレームワークが `tflite` のため、ONNX モデルを使う場合は明示指定が必要:

```python
Model(wakeword_models=[...], inference_framework="onnx")
```

## RPi オーディオデバイス

- スピーカー: `plughw:2,0` (card 2)
- マイク: `plughw:3,0` (card 3)

`hw:` ではなく `plughw:` を使うこと（フォーマット変換を自動で行う）。
環境変数 `ALSA_CAPTURE_DEVICE` で変更可能。
