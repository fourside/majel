# ArgoCD Slack通知の修復記録

## Context

ArgoCD のデプロイ通知が Slack に届かなくなっていた。PR #75 で導入した Slack 通知機能が動作しない状態。

## 発生していた問題

### 1. `argocd-notifications-secret` の揮発（PR #82）

- `slack-webhook-url` を手動で `kubectl create secret` していたが、ArgoCD の selfHeal による sync で空の upstream Secret に上書きされていた
- notifications-controller のログに `config referenced '$slack-webhook-url', but key does not exist in secret` の警告

**対処**: SOPS で暗号化し、KSOPS generator で Git 管理に移行。既存の `majel-secrets` と同じパターン。

### 2. KSOPS generator と upstream Secret の ID 衝突（PR #90）

- upstream ArgoCD マニフェストに空の `argocd-notifications-secret` が含まれている
- KSOPS generator が同名の Secret を生成すると、kustomize の namespace transformation 時に `ID conflict` エラー
- ArgoCD repo-server の `kustomize build` が失敗し、argocd Application 自体が sync 不能に

**対処**: KSOPS generator 定義に `behavior: merge` を追加。generator 出力を upstream の空 Secret にマージする形にして衝突を解消。

### 3. kuromoji 辞書の gzip 解凍漏れ（PR #83）

- PR #80 で追加した漢字→カタカナ変換のカスタムローダーが `.dat.gz` ファイルを解凍せずに読み込んでいた
- `Uint32Array` のバイト長エラーで app コンテナが起動時にクラッシュ

**対処**: `DecompressionStream("gzip")` で解凍してからバッファを返すように修正。

### 4. app コンテナ OOMKilled（PR #89）

- kuromoji 辞書の解凍で 100MB 超のメモリを消費
- app コンテナのメモリリミット 256Mi では不足し、OOMKilled で再起動ループ

**対処**: メモリリミットを 256Mi → 512Mi、requests を 64Mi → 128Mi に引き上げ。

## テスト追加（PR #84）

kuromoji 関連のバグが テスト不足で見逃されていたため、テスト可能な設計にリファクタリング:

- `_decompressGzip()` を独立関数として抽出 → gzip ラウンドトリップテスト + 実辞書ファイルのバイト長検証
- `_replaceKanjiWithReading()` を純粋関数として抽出 → 漢字・ひらがな・カタカナ・ASCII のユニットテスト
- 実 tokenizer を使った統合テスト（`removeKanji("東京は晴れです")` → `"トウキョウはハレです"`）

## 現在の構成

```
k8s/argocd/overlays/prod/
  kustomization.yaml          — generators: で KSOPS を参照
  patches/
    argocd-notifications-cm.yaml  — webhook service + templates + triggers
  secrets/
    notifications-secret-generator.yaml  — KSOPS generator (behavior: merge)
    notifications-secret.yaml            — SOPS 暗号化 Secret (slack-webhook-url)

.sops.yaml  — k8s/argocd/overlays/prod/secrets/ 用の creation_rule 追加済み
```

## 教訓

- 手動作成の Secret は ArgoCD selfHeal で消える → SOPS + KSOPS で Git 管理すべき
- KSOPS generator 出力が upstream リソースと同名の場合は `behavior: merge` が必要
- 辞書ファイル等の大きなデータを扱う場合はコンテナのメモリリミットを考慮する
- 新機能追加時はテストも一緒に書く。特に外部データの読み込みは統合テストが有効
