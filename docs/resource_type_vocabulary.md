# Resource Type Vocabulary（資源タイプ語彙別表）

出典（v1.0）: https://schema.irdb.nii.ac.jp/ja/resource_type_vocabulary
出典（v2.0）: https://schema.irdb.nii.ac.jp/ja/2.0/resource_type_vocabulary
URI仕様: http://purl.org/coar/resource_type/

## 凡例

| 区分 | 意味 |
|---|---|
| v1.0 | JPCOAR スキーマ 1.0 から存在 |
| **v2.0追加** | JPCOAR スキーマ 2.0 で追加 |
| v1.0のみ | JPCOAR スキーマ 2.0 には存在しない（廃止の可能性あり） |

## Articles（論文・記事）

| 英語名 | 日本語名 | 定義 | rdf:resource | 区分 |
|---|---|---|---|---|
| conference paper | 会議発表論文 | 会議に提出され、参加者に発表された論文で、会議録に掲載される | http://purl.org/coar/resource_type/c_5794 | v1.0 |
| data paper | データ論文 | 特定のデータセットやデータセットグループについて記述され、学術雑誌における査読論文の形式で出版されるもの | http://purl.org/coar/resource_type/c_beb9 | v1.0 |
| departmental bulletin paper | 紀要論文 | 大学や研究所等が発行する紀要類に掲載された論文 | http://purl.org/coar/resource_type/c_6501 | v1.0 |
| editorial | エディトリアル | 学術雑誌の編集長によって記述された、政治的、社会的、文化的、専門的な問題に関する見解を示したエッセイ | http://purl.org/coar/resource_type/c_b239 | v1.0 |
| **journal** | **学術雑誌** | **独自の研究や最新の動向を広めることを目的とする逐次刊行物** | **http://purl.org/coar/resource_type/c_0640** | **v2.0追加** |
| journal article | 学術雑誌論文 | 特定の主題に関して研究を実施した1人以上の著者によって執筆され、学術雑誌に掲載された論文 | http://purl.org/coar/resource_type/c_6501 | v1.0 |
| newspaper | 新聞 | 折りたたまれ、ホッチキス止めされていない紙面で構成され、ニュースや記事、広告、通信を含む、印刷された出版物 | http://purl.org/coar/resource_type/c_2fe3 | v1.0 |
| **other periodical** | **その他の逐次刊行物** | **既存の語彙に該当しないテキスト資料** | **http://purl.org/coar/resource_type/QX5C-AR31** | **v2.0追加** |
| review article | レビュー論文 | 二次情報であり、他の記事について書かれた論文。オリジナルの研究に関する報告ではない | http://purl.org/coar/resource_type/c_dcae04bc | v1.0 |
| software paper | ソフトウェア論文 | ツールの開発に関する論理的根拠や構築時に使用したコードの詳細情報を含むもの | http://purl.org/coar/resource_type/c_7bab | v1.0 |
| article | 記事 | 上記には含まれない、学術論文以外の記事 | http://purl.org/coar/resource_type/c_6501 | v1.0 |
| periodical | 逐次刊行物 | 固有のタイトルを持ち、多様なコンテンツから構成される一定の間隔で発行される逐次刊行物 | http://purl.org/coar/resource_type/c_2659 | v1.0のみ |

## Books（図書）

| 英語名 | 日本語名 | 定義 | rdf:resource | 区分 |
|---|---|---|---|---|
| book | 図書 | 1巻またはセットで完結する逐次性のない出版物で、原則ISBNで識別される | http://purl.org/coar/resource_type/c_2f33 | v1.0 |
| book part | 図書（部分） | 図書の章または一節で、通常は見出しまたは番号で区別される | http://purl.org/coar/resource_type/c_3248 | v1.0 |

## Cartographic Material（地図資料）

| 英語名 | 日本語名 | 定義 | rdf:resource | 区分 |
|---|---|---|---|---|
| cartographic material | 地図資料 | 地球全体または一部、あるいは天体を任意のスケールで表現したもの | http://purl.org/coar/resource_type/c_12cc | v1.0 |
| map | 地図 | 地球または別の天体の地表に関連する物質や特徴を抜粋し、平面に縮小したもの | http://purl.org/coar/resource_type/c_12cd | v1.0 |

## Conference Output（会議資料）

v2.0 では "conference object"（会議発表資料）が "conference output"（会議資料）に改称されました（URI は同一: `c_c94f`）。

| 英語名 | 日本語名 | 定義 | rdf:resource | 区分 |
|---|---|---|---|---|
| conference output | 会議資料 | 会議で発表された、プレゼンテーション資料、会議報告、講義資料、抄録、デモンストレーションなどの電子的な資料全般 | http://purl.org/coar/resource_type/c_c94f | v1.0 |
| **conference presentation** | **会議発表スライド** | **スライド資料で、参加者にむけてアイデアや研究成果を発表したもの** | **http://purl.org/coar/resource_type/R60J-J5BD** | **v2.0追加** |
| conference proceedings | 会議録 | 会議で発表された資料の集合であり、付属的な資料も含む会議の公式な記録 | http://purl.org/coar/resource_type/c_f744 | v1.0 |
| conference poster | 会議発表ポスター | 会議に提出され、ポスター発表に用いられたポスターで、会議録に掲載される | http://purl.org/coar/resource_type/c_6670 | v1.0 |

## Dataset（データセット）

v2.0 では dataset のサブタイプが多数追加されました。

| 英語名 | 日本語名 | 定義 | rdf:resource | 区分 |
|---|---|---|---|---|
| **aggregated data** | **集計データ** | **広範な分類に関する統計で、個人を判別不可能なもの** | **http://purl.org/coar/resource_type/ACF7-8YT9** | **v2.0追加** |
| **clinical trial data** | **臨床試験データ** | **被験者への介入研究から得られたデータ** | **http://purl.org/coar/resource_type/c_cb28** | **v2.0追加** |
| **compiled data** | **編集データ** | **複数の情報源から収集・整理された統合データ** | **http://purl.org/coar/resource_type/FXF3-D3G7** | **v2.0追加** |
| dataset | データセット | 関連するファクトデータを集めたもの。数値形式で表現され、構造化されているものが多い | http://purl.org/coar/resource_type/c_ddb1 | v1.0 |
| **encoded data** | **符号化データ** | **定性的データを定量的データに変換したもの** | **http://purl.org/coar/resource_type/AM6W-6QAW** | **v2.0追加** |
| **experimental data** | **実験データ** | **実験的研究方法で得られたデータ** | **http://purl.org/coar/resource_type/63NG-B465** | **v2.0追加** |
| **genomic data** | **ゲノムデータ** | **DNA由来のデータ、生物情報学で使用されるもの** | **http://purl.org/coar/resource_type/A8F1-NPV9** | **v2.0追加** |
| **geospatial data** | **地理空間データ** | **地表上の特定地点に関連付いた様々なデータ** | **http://purl.org/coar/resource_type/2H0M-X761** | **v2.0追加** |
| **laboratory notebook** | **実験ノート** | **仮説、実験結果の初期段階解析を文書化した研究ノート** | **http://purl.org/coar/resource_type/H41Y-FW7B** | **v2.0追加** |
| **measurement and test data** | **測定・評価データ** | **事前に定められた基準で評価して得られたデータ** | **http://purl.org/coar/resource_type/DD58-GFSX** | **v2.0追加** |
| **observational data** | **観測データ** | **独立変数を操作せず観察から得られたデータ** | **http://purl.org/coar/resource_type/FF4C-28RK** | **v2.0追加** |
| **recorded data** | **記録データ** | **機械的または電子的手段により記録されたデータ** | **http://purl.org/coar/resource_type/CQMR-7K63** | **v2.0追加** |
| **simulation data** | **シミュレーションデータ** | **コンピュータプログラムで現実世界をモデル化して得たデータ** | **http://purl.org/coar/resource_type/W2XT-7017** | **v2.0追加** |
| **survey data** | **調査データ** | **調査によって得られたデータ** | **http://purl.org/coar/resource_type/NHD0-W6SY** | **v2.0追加** |

## Image（イメージ）

| 英語名 | 日本語名 | 定義 | rdf:resource | 区分 |
|---|---|---|---|---|
| image | イメージ | 画像や映像を含む、文字以外で視覚的に表現されたもの | http://purl.org/coar/resource_type/c_c513 | v1.0 |
| still image | 静止画 | 静的に記録された画像で、ダイアグラム、図面、グラフ、グラフィックデザイン、図面、地図、写真、印画を含む | http://purl.org/coar/resource_type/c_ecc8 | v1.0 |
| moving image | 動画 | コンピュータプログラムによって動的に生成されたり、事前に記録された静止画像の連続表示によって表現された動的な映像 | http://purl.org/coar/resource_type/c_8a7e | v1.0 |
| video | 録画資料 | テレビまたは電子機器を介して再生されるように設計されている、何らかの動きと音楽を伴う視覚的な画像の記録資料 | http://purl.org/coar/resource_type/c_12ce | v1.0 |

## Lecture（講演）

| 英語名 | 日本語名 | 定義 | rdf:resource | 区分 |
|---|---|---|---|---|
| lecture | 講演 | 就任記念講演などの学術的なイベントにおいて用いられた講演資料およびプレゼンテーション資料 | http://purl.org/coar/resource_type/c_8544 | v1.0 |

## Patent（特許）

v2.0 では特許のサブタイプが追加されました。

| 英語名 | 日本語名 | 定義 | rdf:resource | 区分 |
|---|---|---|---|---|
| **design patent** | **意匠特許** | **工業製品の装飾的なデザイン発明に与えられる特許** | **http://purl.org/coar/resource_type/C53B-JCY5** | **v2.0追加** |
| patent | 特許 | 特許または特許出願書類 | http://purl.org/coar/resource_type/c_15cd | v1.0 |
| **PCT application** | **PCT出願** | **PCT国際出願制度で申請された特許および出願願書** | **http://purl.org/coar/resource_type/SB3Y-W4EH** | **v2.0追加** |
| **plant patent** | **植物特許** | **新品種の植物を発明・発見した人に与えられる特許** | **http://purl.org/coar/resource_type/Z907-YMBB** | **v2.0追加** |
| **plant variety protection** | **育成者権** | **新しい植物品種の育成者に与えられる知的財産権** | **http://purl.org/coar/resource_type/GPQ7-G5VE** | **v2.0追加** |
| **software patent** | **ソフトウェア特許** | **実質的な特許基準を満たすソフトウェアを保護対象とする特許** | **http://purl.org/coar/resource_type/MW8G-3CR8** | **v2.0追加** |
| **trademark** | **商標** | **企業の商品またはサービスを区別する標識に関連するデータ** | **http://purl.org/coar/resource_type/H6QP-SC1X** | **v2.0追加** |
| **utility model** | **実用新案** | **保護期間が短く特許性の要件が緩い特許またはその願書** | **http://purl.org/coar/resource_type/9DKX-KSAF** | **v2.0追加** |

## Report（報告書）

| 英語名 | 日本語名 | 定義 | rdf:resource | 区分 |
|---|---|---|---|---|
| internal report | 内部報告書 | 組織内部での使用を目的として収集された調査結果の記録 | http://purl.org/coar/resource_type/c_18ww | v1.0のみ |
| report | 報告書 | 研究成果、進行中の研究内容、その他の技術的知見を個別に公表したもの | http://purl.org/coar/resource_type/c_93fc | v1.0 |
| research report | 研究報告書 | 特定のトピックに関する詳細な研究や、ある研究プロジェクトでの結果が記述された報告書 | http://purl.org/coar/resource_type/c_18ws | v1.0 |
| technical report | テクニカルレポート | 技術的・科学的研究および研究課題のプロセス、進捗状況や結果を記述した文書 | http://purl.org/coar/resource_type/c_18gh | v1.0 |
| policy report | ポリシーレポート | 主要なポリシーの策定やイベントの詳細が記載された報告書 | http://purl.org/coar/resource_type/c_186u | v1.0 |
| report part | 報告書（部分） | 報告書の一部 | http://purl.org/coar/resource_type/c_ba1f | v1.0のみ |
| working paper | ワーキングペーパー | 編集上の改善提案や情報提供を受けるため、少人数のグループで私的に閲覧される未発表の論文 | http://purl.org/coar/resource_type/c_8042 | v1.0 |
| data management plan | データ管理計画 | 研究プロジェクトの期間中および終了後におけるデータの収集・管理方法および場所の概要を示した正式な文書 | http://purl.org/coar/resource_type/c_ab20 | v1.0 |

## Sound（音声・音楽）

| 英語名 | 日本語名 | 定義 | rdf:resource | 区分 |
|---|---|---|---|---|
| sound | 音声・音楽 | 音楽再生ファイルフォーマット、オーディオコンパクトディスク、録音されたスピーチや音楽などの聴覚的な資料 | http://purl.org/coar/resource_type/c_18cc | v1.0 |

## Thesis（学位論文）

| 英語名 | 日本語名 | 定義 | rdf:resource | 区分 |
|---|---|---|---|---|
| thesis | 学位論文 | 研究と知見を表現することにより、学位または専門資格の候補者であることを示すために提出された文書 | http://purl.org/coar/resource_type/c_46ec | v1.0 |
| bachelor thesis | 学士論文 | 学士号の取得につながる学部・学科教育の一環として実施された、研究プロジェクトを報告する論文 | http://purl.org/coar/resource_type/c_7a1f | v1.0 |
| master thesis | 修士論文 | 修士号の取得につながる大学院教育の一環として実施された、研究プロジェクトを報告する論文 | http://purl.org/coar/resource_type/c_bdcc | v1.0 |
| doctoral thesis | 博士論文 | 博士課程期間中に行われた研究を報告する論文 | http://purl.org/coar/resource_type/c_db06 | v1.0 |

## Other（その他）

| 英語名 | 日本語名 | 定義 | rdf:resource | 区分 |
|---|---|---|---|---|
| **commentary** | **論評** | **既存の出版物に注目を集めるために執筆される深い分析** | **http://purl.org/coar/resource_type/D97F-VB57** | **v2.0追加** |
| **design** | **デザイン** | **建造物や工業製品などの作り方、仕組みを示す設計書や図面一式** | **http://purl.org/coar/resource_type/542X-3S04** | **v2.0追加** |
| **industrial design** | **工業デザイン** | **工業製品の装飾的・美的側面、線や色の構成** | **http://purl.org/coar/resource_type/JBNF-DYAD** | **v2.0追加** |
| interactive resource | インタラクティブリソース | ユーザの理解、実行、経験を促すために、ユーザーとの相互作用を必要とするリソース | http://purl.org/coar/resource_type/c_e9a0 | v1.0 |
| **layout design** | **レイアウト設計** | **集積回路の素子と配線の三次元配列** | **http://purl.org/coar/resource_type/BW7T-YM2G** | **v2.0追加** |
| learning object | 教材 | 授業等で用いられる資料 | http://purl.org/coar/resource_type/c_e059 | v1.0 |
| manuscript | 手稿 | 全体が手書きされた様々な種類の著作物（テキスト、題辞、楽譜、地図など） | http://purl.org/coar/resource_type/c_0040 | v1.0 |
| musical notation | 楽譜 | 伝統的または現代の演奏記号によって記述され、聴覚的に認識される音楽を視覚的に表現したもの | http://purl.org/coar/resource_type/c_18cw | v1.0 |
| **peer review** | **査読** | **同分野の他の研究者による科学的・学術的評価** | **http://purl.org/coar/resource_type/H9BQ-739P** | **v2.0追加** |
| research proposal | 研究計画書 | 助成金の申請に用いる文書。データ管理計画書も含む | http://purl.org/coar/resource_type/c_baaf | v1.0 |
| **research protocol** | **研究プロトコル** | **プロジェクト概要、目的、方法論を示した詳細な計画書** | **http://purl.org/coar/resource_type/YZ1N-ZFT9** | **v2.0追加** |
| software | ソフトウェア | ソースコード（テキスト）またはコンパイルされた形式のコンピュータプログラム | http://purl.org/coar/resource_type/c_5ce6 | v1.0 |
| **source code** | **ソースコード** | **人間が読める形式のプログラミング言語で書かれたコード** | **http://purl.org/coar/resource_type/QH80-2R4E** | **v2.0追加** |
| technical documentation | 技術文書 | 開発中または使用中の工業製品について、取扱いや機能および構造を記述した文書全般 | http://purl.org/coar/resource_type/c_71bd | v1.0 |
| **transcription** | **文字起こし** | **公判、スピーチ、インタビューから書き起こした記録** | **http://purl.org/coar/resource_type/6NC7-GK9S** | **v2.0追加** |
| workflow | ワークフロー | 特定のジョブを実行する際に自動または確実に実行される一連の手順を記録したもの | http://purl.org/coar/resource_type/c_393c | v1.0 |
| other | その他 | 上記で明示的に取り上げられていない、その他全ての概念をカバーするもの | http://purl.org/coar/resource_type/c_1843 | v1.0 |
| interview | インタビュー | レポーター、主催者、パネリスト、聴衆と著名人、著者、有名人との間の議論を、紙媒体、映画、ビデオに転写物としてまたは音声として記録したもの | http://purl.org/coar/resource_type/c_26e4 | v1.0のみ |
