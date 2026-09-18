# kadou

稼働時間記録・作業報告書出力ツール。

日々の稼働時間を YAML ファイルへ記録し、月次の作業報告書を A4 縦 1 ページの PDF として出力する。

- 仕様: [SPEC.md](SPEC.md)（唯一の正）
- 実装上の約束: [CLAUDE.md](CLAUDE.md)

## 起動

```sh
pnpm install
cp .env.example .env    # KADOU_DATA_DIR を作業記録の場所に書き換える
pnpm dev
```

`http://127.0.0.1:5173/` を開く。本番用にビルドして起動する場合は次のとおり。

```sh
pnpm build
pnpm start
```

いずれも `127.0.0.1` にのみバインドする。ファイルを書き込む権限を持つため、外部から到達できる状態にしない（SPEC.md §4.5）。

## データディレクトリ

作業記録はこのリポジトリでは管理しない。別のリポジトリに置き、環境変数 `KADOU_DATA_DIR` でその場所を指す（SPEC.md §4.5）。配置は次のとおり。

```
contract.yaml     契約設定
months/
  2026-09.yaml    月次データ
```

`.env` は `pnpm dev` と `pnpm start` のどちらも読む。起動のたびに指定せずに済ませるため。一時的に別の場所を見たいときは、環境変数のほうが `.env` より優先される。

```sh
KADOU_DATA_DIR=/tmp/kadou-trial pnpm dev
```

未指定ならカレントディレクトリを見る。その状態で記録するとソースの隣に書き出されるが、`contract.yaml` と `months/` は `.gitignore` で追跡対象から外してある。

`contract.yaml` はアプリから書き込まない。存在しない場合は雛形を画面に表示するので、内容を確認して自分で作成する。記入例は [contract.example.yaml](contract.example.yaml) にある。

## 開発

```sh
pnpm test     # Vitest
pnpm check    # 型検査
pnpm lint     # ESLint（層の境界を含む）
```
