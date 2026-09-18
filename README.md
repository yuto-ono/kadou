# kadou

稼働時間記録・作業報告書出力ツール。

日々の稼働時間を YAML ファイルへ記録し、月次の作業報告書を A4 縦 1 ページの PDF として出力する。

- 仕様: [SPEC.md](SPEC.md)（唯一の正）
- 実装上の約束: [CLAUDE.md](CLAUDE.md)

## 起動

```sh
pnpm install
pnpm dev
```

`http://127.0.0.1:5173/` を開く。本番用にビルドして起動する場合は次のとおり。

```sh
pnpm build
pnpm start
```

いずれも `127.0.0.1` にのみバインドする。ファイルを書き込む権限を持つため、外部から到達できる状態にしない（SPEC.md §4.5）。

## データディレクトリ

作業記録はこのリポジトリで管理する。配置は次のとおり。

```
contract.yaml     契約設定
months/
  2026-09.yaml    月次データ
```

場所を変えたい場合は環境変数 `KADOU_DATA_DIR` を指定する。本番の記録に触れずに動作を試すときに使う。

```sh
KADOU_DATA_DIR=/tmp/kadou-trial pnpm dev
```

`contract.yaml` はアプリから書き込まない。存在しない場合は雛形を画面に表示するので、内容を確認して自分で作成する。

## 開発

```sh
pnpm test     # Vitest
pnpm check    # 型検査
pnpm lint     # ESLint（層の境界を含む）
```
