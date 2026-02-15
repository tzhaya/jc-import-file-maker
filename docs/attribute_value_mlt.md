# attribute_value_mlt と配列記法のルール

## 概要

WERO3のアイテムメタデータでは、繰り返し可能なフィールドは `attribute_value_mlt` 配列に格納される。ItemType.json のキー定義では `[]` 記法でこの配列構造を表現している。

## 3種類のパス表記

### 1. ItemType.json の `[]` 記法（スキーマ定義）

```
item_30002_creator2[].creatorType
```

- `[]` は `attribute_value_mlt` 配列の各要素を意味する
- 実データの中間構造（`attribute_value_mlt`）は省略されている
- ネストされた `[]` は内側の配列の繰り返しを意味する

### 2. tsv_headers.json の `[0]` 記法（TSVカラム定義）

```
.metadata.item_30002_creator2[0].creatorNames[0].creatorName
```

- `[0]` は配列の最初の要素を指す（TSVでは1行=1要素）
- ネストの深さに応じて複数の `[0]` が連なる

### 3. 実データ（sample.json）の構造

```json
"item_30002_creator2": {
    "attribute_name": "作成者",
    "attribute_type": "creator",
    "attribute_value_mlt": [
        {
            "creatorNames": [
                {
                    "creatorName": "Shiratori, Sakiko",
                    "creatorNameLang": "en",
                    "creatorNameType": "Personal"
                }
            ],
            "creatorType": "Author",
            "nameIdentifiers": [
                {
                    "nameIdentifier": "0000-0003-3285-3633",
                    "nameIdentifierScheme": "ORCID",
                    "nameIdentifierURI": "https://orcid.org/0000-0003-3285-3633"
                }
            ]
        },
        {
            "creatorNames": [
                {
                    "creatorName": "Abeysekara, MG Dilini",
                    "creatorNameLang": "en",
                    "creatorNameType": "Personal"
                }
            ],
            "creatorType": "Author"
        }
    ]
}
```

## 記法の対応関係

| ItemType.json の記法 | 実データ上のパス |
|---|---|
| `item_30002_creator2[]` | `item_30002_creator2.attribute_value_mlt[*]` |
| `item_30002_creator2[].creatorType` | `item_30002_creator2.attribute_value_mlt[*].creatorType` |
| `item_30002_creator2[].creatorNames[]` | `item_30002_creator2.attribute_value_mlt[*].creatorNames[*]` |
| `item_30002_creator2[].creatorNames[].creatorName` | `item_30002_creator2.attribute_value_mlt[*].creatorNames[*].creatorName` |
| `item_30002_creator2[].creatorAffiliations[].affiliationNames[].affiliationName` | `item_30002_creator2.attribute_value_mlt[*].creatorAffiliations[*].affiliationNames[*].affiliationName` |

## 繰り返し階層の識別（変数記法）

複数の繰り返し階層がある場合、どの `[]` がどの階層かを変数で示すことができる：

```
item_30002_creator2[i].creatorAffiliations[j].affiliationNames[k].affiliationName
```

- `[i]` = 著者（attribute_value_mlt の要素、例: 1人目の著者、2人目の著者...）
- `[j]` = その著者の所属機関（例: JIRCAS、東京大学...）
- `[k]` = 所属機関名（多言語対応、例: 英語名、日本語名...）

## Claude への指示時のルール

1. `キー名[]` は `attribute_value_mlt` 配列の繰り返しを意味する
2. ネストされた `[]` は内側の配列の繰り返しを意味する
3. `attribute_value_mlt` は記法上省略してよい
