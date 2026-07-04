# 開発者向けドキュメント

初心者向けの使い方は [user_guide.md](user_guide.md) を参照してください。
このドキュメントは保守・開発に必要な情報をまとめています。

## 開発環境のセットアップ

```
git clone https://github.com/tzhaya/jc-import-file-maker.git
cd jc-import-file-maker
npm install
```

## 品質チェック（npm test）

`npm test` を実行すると `scripts/check.js` が走り、以下を検証します:

- **JSON parse**: `package.json` / `package-lock.json` / `chrome-extension/manifest.json` / `data/tsv_headers.json` が構文的に正しいか
- **JS 構文チェック** (`node --check`): 自作 JS ファイル（`shared.js`、Chrome拡張の各 JS）に構文エラーがないか
- **UTF-8 妥当性**: 上記ファイルおよび主要 Markdown が UTF-8 として正しく読めるか

外部 API・APIキー・ネットワーク接続は不要です。PR 作成時は CI が自動で実行します（[.github/workflows/ci.yml](../.github/workflows/ci.yml)）。

### devDependencies（playwright）について

`package.json` の `devDependencies` にある `playwright` は `npm test`（`scripts/check.js`）からは使用しません。PR 作成前に必須の E2E テスト（`.claude/skills/e2e-test`、ユーザーが `/e2e-test` で手動実行）でのみ使用します。E2E テストを実行する環境では、npm パッケージ本体に加えてブラウザバイナリを別途インストールする必要があります。

```
npx playwright install chromium
```

## 文字コードについて

このリポジトリのテキストファイルは **UTF-8**（BOM なし）で保存されています（TSV エクスポート出力は UTF-8 BOM 付きですが、ソースコードは BOM なし）。`.editorconfig` で `charset = utf-8` を明示しています。

### CLIや AI エージェントで日本語が文字化けして見える場合

ファイルが壊れているのではなく、**表示環境のエンコーディング差**が原因である場合がほとんどです。

**確認手順（Windows PowerShell）:**

```powershell
# UTF-8 として正しく読めるか確認
Get-Content -Encoding UTF8 README.md | Select-Object -First 20

# コンソール出力エンコーディングを UTF-8 に変更（セッション内のみ）
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
```

**VS Code での確認:** エディタ右下のステータスバーにエンコーディングが表示されます（`UTF-8` であれば正常）。

`npm test` の UTF-8 妥当性チェックが pass であれば、チェック対象ファイルのエンコーディングは健全です。CLI 表示だけを根拠に日本語本文の一括復旧作業は行わないでください（[#175](https://github.com/tzhaya/jc-import-file-maker/issues/175)）。

## ブランチ・PRワークフロー

詳細は [CLAUDE.md](../CLAUDE.md) を参照してください。基本的に全変更でブランチを作成し、PR 経由でマージします。PR 作成直前は `/prepare-pr` チェックリストを実行してください。

## リリース手順

[docs/release_procedure.md](release_procedure.md) を参照してください。

## テストの限界と教訓

このツールは「標準版 HTML」と「Chrome 拡張版」の二系統を同一ロジックでミラーしており、検証は **Node サンドボックス（`vm` でマッピング関数を直接実行）** と **ブラウザ E2E（`/e2e-test`、Playwright）** を併用します。過去の実装で「片方の検証層だけでは取りこぼす」バグを繰り返し踏んでいるため、実装・レビュー時のチェックポイントとして以下を残します。

### 1. Node サンドボックス検証は DOM 描画を見ない

Node 上でマッピング関数の戻り値（オブジェクトのプロパティ値）だけを検証すると、**`<select>` 等の DOM 側の暗黙フォールバック挙動**を見逃します。

- 実例（[#212](https://github.com/tzhaya/jc-import-file-maker/issues/212)）: `buildSelect()` は選択値に一致する `<option>` が無い場合に空の `<option>` を補わないため、出版タイプが空文字（`''`）のレコードで `<select>` の表示値がブラウザのフォールバックにより先頭要素（`AO`）になっていた。`collectFromDOM()` は `<select>.value` から値を収集するため、そのまま TSV エクスポートすると誤った出版タイプが出力される実害があった。
- 教訓: マッピング結果が正しくても、その値が **DOM に描画され `collectFromDOM()` で回収されるところまで** をブラウザ E2E で確認する。特に「空文字・未知値」を取りうるフィールドは `<select>` のフォールバックを疑う。

### 2. 標準版 E2E では拡張版限定機能を検出できない

OPF 照会のように **Chrome 拡張版でのみ有効な機能**（`extensionFetch()` 経由・`host_permissions` 必須）は、標準版の Node/ブラウザ E2E をいくら通しても実バグが表面化しません。

- 実例（[#214](https://github.com/tzhaya/jc-import-file-maker/issues/214)）: DataCite パスの ISSN フォールバックが値ベースの `||`（`relatedItemIdentifier || container.identifier`）だったため、`relatedItemIdentifier` に非 ISSN 型（DOI 等）の値が入っていると `container` の ISSN が無視され、OPF エンバーゴ判定が機能しないケースがあった。標準版の検証はすべて通っていたが、ユーザーが Chrome 拡張の実機で `10.1002/pssb.202500291` をテストして発見した。
- 教訓: 拡張版限定機能に触れる変更は、**ユーザーによる Chrome 拡張実機レビューを最終防衛線**として明示的に依頼する。標準版の ALL PASSED を「拡張版も安全」の根拠にしない。

### 3. 仕様書の除外規則は実装チェックリスト化する

マッピング仕様書（例: [datacite_jpcoar_mapping.md](datacite_jpcoar_mapping.md)）に書かれた「〜は取り込まない／除外する」といった **除外規則の実装漏れ**は、テストではなくコードレビューでしか拾えないことが多いです（除外漏れは「余計な値が出る」だけで、正常系テストは pass してしまうため）。

- 実例（[#208](https://github.com/tzhaya/jc-import-file-maker/issues/208)）: `rightsList` の `info:eu-repo/semantics/*`（OA 表明エントリ）を権利情報から除外するフィルタが、仕様書には正しく書かれていたが実装から漏れていた。
- 教訓: 仕様書内の「除外・スキップ」規則を実装前にチェックリスト化し、レビュー時に一つずつ実コードと突き合わせる。

## テスト用 DOI カタログ

E2E・回帰テストで使う代表的な DOI と、それぞれが検証できる観点。サンプルレスポンスは `samples/`（`Crossref/`・`DataCite/` 等）に保存されています。

| DOI | RA | 検証できる観点 |
|---|---|---|
| `10.1016/j.advnut.2025.100480` | Crossref | 複数著者・所属・助成情報を含む Crossref 回帰の基本ケース（課題番号 `JP19KK0341` 検出 → funder 連携も確認可能） |
| `10.48550/arxiv.2212.04356` | DataCite | OpenAlex 収録あり・green の Preprint（資源タイプ `article`）。出版タイプ・relationType が補完される（実測: SMUR/isVersionOf） |
| `10.57723/kds622523` | DataCite | OpenAlex 収録あり・green の Dataset。資源タイプが版判定の許可リスト外のため出版タイプが**補完されない**ことの確認 |
| `10.25656/01:35728` | DataCite | DataCite 実データのマッピング全般（ブラウザ E2E 用） |
| `10.17596/0004197` | DataCite | `dates` 空配列レコード（JAMSTEC）→ `publicationYear` フォールバックの確認 |
| `10.1002/pssb.202500291` | DataCite | `relatedItemIdentifier` が非 ISSN 型（DOI）＋ `container` に ISSN。ISSN フォールバックの型判定（[#214](https://github.com/tzhaya/jc-import-file-maker/issues/214) のバグ再現）。拡張版実機での OPF 照会確認にも使用 |

> DataCite の助成情報パス（`fundingReferences`）は、テスト用実データ7件がいずれも空だったため合成データで検証しています。`fundingReferences` を持つ実 DOI が見つかれば実データでの再確認が望ましいです。

## ドキュメント一覧（保守者向け）

| ドキュメント | 内容 |
|---|---|
| [user_guide.md](user_guide.md) | 使い方ガイド（初心者向け：STEP 1〜4、バッチ処理） |
| [settings.md](settings.md) | 設定ガイド（APIキー・初期値の一覧と設定手順） |
| [changelog.md](changelog.md) | 変更履歴（全量。READMEには最新5件のみ掲載） |
| [requirements.md](requirements.md) | 要件定義 |
| [fieldmapping.md](fieldmapping.md) | JPCOARフィールドマッピング |
| [datacite_jpcoar_mapping.md](datacite_jpcoar_mapping.md) | DataCite → JPCOAR マッピング表（#197。実装 #208 の仕様書） |
| [current_review_2026-07-05.md](current_review_2026-07-05.md) | 2026-07-05 時点の進捗・実用性・将来拡張課題のレビュー |
| [weko3_tsv_import_spec.md](weko3_tsv_import_spec.md) | WEKO3 TSVインポート仕様 |
| [privacy-policy.md](privacy-policy.md) | プライバシーポリシー |
| [chrome_store_permissions.md](chrome_store_permissions.md) | Chrome Web Store 権限の正当化 |
| [release_procedure.md](release_procedure.md) | リリース手順 |
| [remaining_issues.md](remaining_issues.md) | 残存Issue一覧 |
| [worklog.md](worklog.md) | 実装作業ログ |
| [api-flow.md](../api-flow.md) | Crossref/OpenAlex 取得フロー概要 |
| [function.md](../function.md) | 機能と技術 |
| [fields.md](fields.md) | TSVヘッダー全フィールドの定義一覧（`tsv_headers_template.js` と対応） |
| [pipeline_comparison.md](pipeline_comparison.md) | TSVエクスポート パイプライン比較 |
| [Implementation_funder_lookup.md](Implementation_funder_lookup.md) | 助成機関照合（funder lookup）の実装メモ |
| [openalex_harvest_feasibility.md](openalex_harvest_feasibility.md) | OpenAlex ハーベスト実現性の検討 |
| [handover_cors_extension.md](handover_cors_extension.md) | CORS 回避の Chrome 拡張化を検討した当時の引き継ぎメモ |
