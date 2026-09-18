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

読み書きするファイルの場所は環境変数 `KADOU_DATA_DIR` で指定する。既定はカレントディレクトリ。

```sh
KADOU_DATA_DIR=~/work/kadou-records pnpm dev
```

アプリのソースと作業記録を別のリポジトリに置けるようにするための仕組みで、作業記録側は git で管理することを前提としている（SPEC.md §4.5）。配置は次のとおり。

```
contract.yaml     契約設定
months/
  2026-09.yaml    月次データ
```

`contract.yaml` はアプリから書き込まない。存在しない場合は雛形を画面に表示するので、内容を確認して自分で作成する。

## 開発

```sh
pnpm test     # Vitest
pnpm check    # 型検査
pnpm lint     # ESLint（層の境界を含む）
```
