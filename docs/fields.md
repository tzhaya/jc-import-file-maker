# ItemType.json フィールド一覧

「デフォルトアイテムタイプ（フル）」に含まれるフィールド一覧です。

- トップレベルフィールド: 42個（pubdate, item_30002_title0 ~ item_1698624010, system_* 系）
- ネスト構造: 最大4階層まで（例: item_30002_creator2 → creatorAffiliations → affiliationNameIdentifiers → affiliationNameIdentifier）
- └ 記号とインデントで親子関係を表現
- titleMapありのフィールドは主に language, type, scheme 等の選択肢フィールド
- title_i18n_temp は除外
- 


| key | titleMap | title_i18n(ja) |
|-----|---------|---------------|
| pubdate | なし | 公開日 |
| item_30002_title0 | なし | タイトル |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_title0[].subitem_title | なし | タイトル |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_title0[].subitem_title_language | あり | 言語 |
| item_30002_alternative_title1 | なし | その他のタイトル |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_alternative_title1[].subitem_alternative_title | なし | その他のタイトル |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_alternative_title1[].subitem_alternative_title_language | あり | 言語 |
| item_30002_creator2 | なし | 作成者 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorType | なし | 作成者タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].nameIdentifiers | なし | 作成者識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].nameIdentifiers[].nameIdentifierScheme | なし | 作成者識別子Scheme |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].nameIdentifiers[].nameIdentifierURI | なし | 作成者識別子URI |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].nameIdentifiers[].nameIdentifier | なし | 作成者識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorNames | なし | 作成者姓名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorNames[].creatorName | なし | 姓名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorNames[].creatorNameLang | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorNames[].creatorNameType | あり | 名前タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].familyNames | なし | 作成者姓 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].familyNames[].familyName | なし | 姓 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].familyNames[].familyNameLang | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].givenNames | なし | 作成者名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].givenNames[].givenName | なし | 名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].givenNames[].givenNameLang | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorAlternatives | なし | 作成者別名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorAlternatives[].creatorAlternative | なし | 別名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorAlternatives[].creatorAlternativeLang | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorAffiliations | なし | 作成者所属 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorAffiliations[].affiliationNameIdentifiers | なし | 所属機関識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorAffiliations[].affiliationNameIdentifiers[].affiliationNameIdentifier | なし | 所属機関識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorAffiliations[].affiliationNameIdentifiers[].affiliationNameIdentifierScheme | あり | 所属機関識別子Scheme |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorAffiliations[].affiliationNameIdentifiers[].affiliationNameIdentifierURI | なし | 所属機関識別子URI |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorAffiliations[].affiliationNames | なし | 所属機関名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorAffiliations[].affiliationNames[].affiliationName | なし | 所属機関名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorAffiliations[].affiliationNames[].affiliationNameLang | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorMails | なし | 作成者メールアドレス |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].creatorMails[].creatorMail | なし | メールアドレス |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_creator2[].authorInputButton | なし | 著者DBから入力 |
| item_30002_contributor3 | なし | 寄与者 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorType | あり | 寄与者タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].nameIdentifiers | なし | 寄与者識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].nameIdentifiers[].nameIdentifierScheme | なし | 寄与者識別子Scheme |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].nameIdentifiers[].nameIdentifierURI | なし | 寄与者識別子URI |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].nameIdentifiers[].nameIdentifier | なし | 寄与者識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorNames | なし | 寄与者姓名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorNames[].contributorName | なし | 姓名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorNames[].lang | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorNames[].nameType | あり | 名前タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].familyNames | なし | 寄与者姓 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].familyNames[].familyNameLang | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].familyNames[].familyName | なし | 姓 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].givenNames | なし | 寄与者名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].givenNames[].givenName | なし | 名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].givenNames[].givenNameLang | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorAlternatives | なし | 寄与者別名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorAlternatives[].contributorAlternativeLang | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorAlternatives[].contributorAlternative | なし | 別名 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorAffiliations | なし | 寄与者所属 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorAffiliations[].contributorAffiliationNameIdentifiers | なし | 所属機関識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorAffiliations[].contributorAffiliationNameIdentifiers[].contributorAffiliationNameIdentifier | なし | 所属機関識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorAffiliations[].contributorAffiliationNameIdentifiers[].contributorAffiliationScheme | あり | 所属機関識別子Scheme |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorAffiliations[].contributorAffiliationNameIdentifiers[].contributorAffiliationURI | なし | 所属機関識別子URI |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorAffiliations[].contributorAffiliationNames | なし | 所属機関名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorAffiliations[].contributorAffiliationNames[].contributorAffiliationName | なし | 所属機関名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorAffiliations[].contributorAffiliationNames[].contributorAffiliationNameLang | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorMails | なし | 寄与者メールアドレス |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].contributorMails[].contributorMail | なし | メールアドレス |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_contributor3[].authorInputButton | なし | 著者DBから入力 |
| item_30002_access_rights4 | なし | アクセス権 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_access_rights4.subitem_access_right | あり | アクセス権 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_access_rights4.subitem_access_right_uri | なし | アクセス権URI |
| item_30002_apc5 | なし | APC |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_apc5.subitem_apc | あり | APC |
| item_30002_rights6 | なし | 権利情報 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_rights6[].subitem_rights_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_rights6[].subitem_rights_resource | なし | 権利情報Resource |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_rights6[].subitem_rights | なし | 権利情報 |
| item_30002_rights_holder7 | なし | 権利者情報 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_rights_holder7[].nameIdentifiers | なし | 権利者識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_rights_holder7[].nameIdentifiers[].nameIdentifierScheme | なし | 権利者識別子Scheme |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_rights_holder7[].nameIdentifiers[].nameIdentifierURI | なし | 権利者識別子URI |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_rights_holder7[].nameIdentifiers[].nameIdentifier | なし | 権利者識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_rights_holder7[].rightHolderNames | なし | 権利者名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_rights_holder7[].rightHolderNames[].rightHolderName | なし | 権利者名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_rights_holder7[].rightHolderNames[].rightHolderLanguage | あり | 言語 |
| item_30002_subject8 | なし | 主題 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_subject8[].subitem_subject_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_subject8[].subitem_subject_scheme | あり | 主題Scheme |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_subject8[].subitem_subject_uri | なし | 主題URI |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_subject8[].subitem_subject | なし | 主題 |
| item_30002_description9 | なし | 内容記述 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_description9[].subitem_description_type | あり | 内容記述タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_description9[].subitem_description | なし | 内容記述 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_description9[].subitem_description_language | あり | 言語 |
| item_30002_publisher10 | なし | 出版者 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_publisher10[].subitem_publisher | なし | 出版者 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_publisher10[].subitem_publisher_language | あり | 言語 |
| item_30002_date11 | なし | 日付 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_date11[].subitem_date_issued_datetime | なし | 日付 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_date11[].subitem_date_issued_type | あり | 日付タイプ |
| item_30002_language12 | なし | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_language12[].subitem_language | あり | 言語 |
| item_30002_resource_type13 | なし | 資源タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_resource_type13.resourceuri | なし | 資源タイプ識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_resource_type13.resourcetype | あり | 資源タイプ  |
| item_30002_version14 | なし | バージョン情報 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_version14.subitem_version | なし | バージョン情報 |
| item_30002_version_type15 | なし | 出版タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_version_type15.subitem_version_type | あり | 出版タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_version_type15.subitem_version_resource | なし | 出版タイプResource |
| item_30002_identifier16 | なし | 識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_identifier16[].subitem_identifier_uri | なし | 識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_identifier16[].subitem_identifier_type | あり | 識別子タイプ |
| item_30002_identifier_registration17 | なし | ID登録 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_identifier_registration17.subitem_identifier_reg_text | なし | ID登録 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_identifier_registration17.subitem_identifier_reg_type | あり | ID登録タイプ |
| item_30002_relation18 | なし | 関連情報 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_relation18[].subitem_relation_type | あり | 関連タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_relation18[].subitem_relation_type_id | なし | 関連識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_relation18[].subitem_relation_type_id.subitem_relation_type_select | あり | 識別子タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_relation18[].subitem_relation_type_id.subitem_relation_type_id_text | なし | 関連識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_relation18[].subitem_relation_name | なし | 関連名称 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_relation18[].subitem_relation_name[].subitem_relation_name_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_relation18[].subitem_relation_name[].subitem_relation_name_text | なし | 関連名称 |
| item_30002_temporal19 | なし | 時間的範囲 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_temporal19[].subitem_temporal_text | なし | 時間的範囲 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_temporal19[].subitem_temporal_language | あり | 言語 |
| item_30002_geolocation20 | なし | 位置情報 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_geolocation20[].subitem_geolocation_point | なし | 位置情報（点） |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_geolocation20[].subitem_geolocation_point.subitem_point_longitude | なし | 経度 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_geolocation20[].subitem_geolocation_point.subitem_point_latitude | なし | 緯度 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_geolocation20[].subitem_geolocation_box | なし | 位置情報（空間） |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_geolocation20[].subitem_geolocation_box.subitem_west_longitude | なし | 西部経度 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_geolocation20[].subitem_geolocation_box.subitem_east_longitude | なし | 東部経度 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_geolocation20[].subitem_geolocation_box.subitem_south_latitude | なし | 南部緯度 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_geolocation20[].subitem_geolocation_box.subitem_north_latitude | なし | 北部緯度 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_geolocation20[].subitem_geolocation_place | なし | 位置情報（自由記述） |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_geolocation20[].subitem_geolocation_place[].subitem_geolocation_place_text | なし | 位置情報（自由記述） |
| item_30002_funding_reference21 | なし | 助成情報 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_funder_identifiers | なし | 助成機関識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_funder_identifiers.subitem_funder_identifier_type | あり | 識別子タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_funder_identifiers.subitem_funder_identifier_type_uri | なし | 助成機関識別子タイプURI |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_funder_identifiers.subitem_funder_identifier | なし | 助成機関識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_funder_names | なし | 助成機関名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_funder_names[].subitem_funder_name | なし | 助成機関名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_funder_names[].subitem_funder_name_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_funding_stream_identifiers | なし | プログラム情報識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_funding_stream_identifiers.subitem_funding_stream_identifier_type | あり | プログラム情報識別子タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_funding_stream_identifiers.subitem_funding_stream_identifier_type_uri | なし | プログラム情報識別子タイプURI |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_funding_stream_identifiers.subitem_funding_stream_identifier | なし | 研究課題番号タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_funding_streams | なし | プログラム情報 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_funding_streams[].subitem_funding_stream_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_funding_streams[].subitem_funding_stream | なし | プログラム情報 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_award_numbers | なし | 研究課題番号 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_award_numbers.subitem_award_uri | なし | 研究課題番号URI |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_award_numbers.subitem_award_number | なし | 研究課題番号 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_award_numbers.subitem_award_number_type | あり | 研究課題番号タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_award_titles | なし | 研究課題名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_award_titles[].subitem_award_title | なし | 研究課題名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_funding_reference21[].subitem_award_titles[].subitem_award_title_language | あり | 言語 |
| item_30002_source_identifier22 | なし | 収録物識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_source_identifier22[].subitem_source_identifier_type | あり | 収録物識別子タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_source_identifier22[].subitem_source_identifier | なし | 収録物識別子 |
| item_30002_source_title23 | なし | 収録物名 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_source_title23[].subitem_source_title | なし | 収録物名 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_source_title23[].subitem_source_title_language | あり | 言語 |
| item_30002_volume_number24 | なし | 巻 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_volume_number24.subitem_volume | なし | 巻 |
| item_30002_issue_number25 | なし | 号 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_issue_number25.subitem_issue | なし | 号 |
| item_30002_number_of_pages26 | なし | ページ数 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_number_of_pages26.subitem_number_of_pages | なし | ページ数 |
| item_30002_page_start27 | なし | 開始ページ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_page_start27.subitem_start_page | なし | 開始ページ |
| item_30002_page_end28 | なし | 終了ページ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_page_end28.subitem_end_page | なし | 終了ページ |
| item_30002_bibliographic_information29 | なし | 書誌情報 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_bibliographic_information29.bibliographic_titles | なし | 雑誌名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_bibliographic_information29.bibliographic_titles[].bibliographic_title | なし | タイトル |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_bibliographic_information29.bibliographic_titles[].bibliographic_titleLang | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_bibliographic_information29.bibliographicVolumeNumber | なし | 巻 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_bibliographic_information29.bibliographicIssueNumber | なし | 号 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_bibliographic_information29.bibliographicPageStart | なし | 開始ページ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_bibliographic_information29.bibliographicPageEnd | なし | 終了ページ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_bibliographic_information29.bibliographicNumberOfPages | なし | ページ数 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_bibliographic_information29.bibliographicIssueDates | なし | 発行日 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_bibliographic_information29.bibliographicIssueDates.bibliographicIssueDate | なし | 日付 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_bibliographic_information29.bibliographicIssueDates.bibliographicIssueDateType | あり | 日付タイプ |
| item_30002_dissertation_number30 | なし | 学位授与番号 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_dissertation_number30.subitem_dissertationnumber | なし | 学位授与番号 |
| item_30002_degree_name31 | なし | 学位名 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_degree_name31[].subitem_degreename_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_degree_name31[].subitem_degreename | なし | 学位名 |
| item_30002_date_granted32 | なし | 学位授与年月日 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_date_granted32.subitem_dategranted | なし | 学位授与年月日 |
| item_30002_degree_grantor33 | なし | 学位授与機関 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_degree_grantor33[].subitem_degreegrantor_identifier | なし | 学位授与機関識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_degree_grantor33[].subitem_degreegrantor_identifier[].subitem_degreegrantor_identifier_scheme | あり | 学位授与機関識別子Scheme |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_degree_grantor33[].subitem_degreegrantor_identifier[].subitem_degreegrantor_identifier_name | なし | 学位授与機関識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_degree_grantor33[].subitem_degreegrantor | なし | 学位授与機関名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_degree_grantor33[].subitem_degreegrantor[].subitem_degreegrantor_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_degree_grantor33[].subitem_degreegrantor[].subitem_degreegrantor_name | なし | 学位授与機関名 |
| item_30002_conference34 | なし | 会議記述 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_names | なし | 会議名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_names[].subitem_conference_name | なし | 会議名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_names[].subitem_conference_name_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_sequence | なし | 回次 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_sponsors | なし | 主催機関 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_sponsors[].subitem_conference_sponsor | なし | 主催機関 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_sponsors[].subitem_conference_sponsor_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_date | なし | 開催期間 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_date.subitem_conference_start_year | なし | 開始年 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_date.subitem_conference_start_month | なし | 開始月 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_date.subitem_conference_start_day | なし | 開始日 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_date.subitem_conference_end_year | なし | 終了年 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_date.subitem_conference_end_month | なし | 終了月 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_date.subitem_conference_end_day | なし | 終了日 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_date.subitem_conference_period | なし | 開催期間 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_date.subitem_conference_date_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_venues | なし | 開催会場 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_venues[].subitem_conference_venue | なし | 開催会場 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_venues[].subitem_conference_venue_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_places | なし | 開催地 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_places[].subitem_conference_place | なし | 開催地 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_places[].subitem_conference_place_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_conference34[].subitem_conference_country | あり | 開催国 |
| item_30002_file35 | なし | ファイル情報 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].filename | なし | ファイル名 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].url | なし | 本文URL |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].url.url | なし | 本文URL |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].url.label | なし | ラベル |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].url.objectType | あり | オブジェクトタイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].format | なし | フォーマット |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].filesize | なし | サイズ |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].filesize[].value | なし | サイズ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].fileDate | なし | 日付 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].fileDate[].fileDateType | あり | 日付タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].fileDate[].fileDateValue | なし | 日付 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].version | なし | バージョン情報 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].displaytype | あり | 表示形式 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].licensetype | なし | ライセンス |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].licensefree | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].accessrole | あり | アクセス |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].date[0].dateValue | なし | 公開日 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_file35[].groups | なし | グループ |
| item_30002_heading36 | なし | 見出し |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_heading36[].subitem_heading_banner_headline | なし | 大見出し |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_heading36[].subitem_heading_headline | なし | 小見出し |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_30002_heading36[].subitem_heading_language | あり | 言語 |
| system_identifier_doi | なし | 永続識別子（DOI） |
| &nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_system_identifier | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_system_identifier_type | あり |  |
| system_identifier_hdl | なし | 永続識別子（HDL） |
| &nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_system_identifier | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_system_identifier_type | あり |  |
| system_identifier_uri | なし | 永続識別子（URI） |
| &nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_system_identifier | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_system_identifier_type | あり |  |
| system_file | なし | ファイル情報 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_systemfile_filename | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_systemfile_filename[].subitem_systemfile_filename_label | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_systemfile_filename[].subitem_systemfile_filename_type | あり |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_systemfile_filename[].subitem_systemfile_filename_uri | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_systemfile_mimetype | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_systemfile_size | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_systemfile_datetime | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_systemfile_datetime[].subitem_systemfile_datetime_date | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_systemfile_datetime[].subitem_systemfile_datetime_type | あり |  |
| &nbsp;&nbsp;&nbsp;&nbsp;└ parentkey.subitem_systemfile_version | なし |  |
| item_1698624001 | なし | データセットシリーズ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624001[].jpcoar_dataset_series | あり | データセットシリーズ |
| item_1698624002 | なし | 原文の言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624002[].original_language | なし | 原文の言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624002[].original_language_language | あり | 言語 |
| item_1698624003 | なし | 大きさ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624003[].dcterms_extent | なし | 大きさ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624003[].dcterms_extent_language | あり | 言語 |
| item_1698624004 | なし | カタログ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_contributors | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_contributors[].contributor_type | あり | 提供機関タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_contributors[].contributor_names | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_contributors[].contributor_names[].contributor_name | なし | 提供機関名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_contributors[].contributor_names[].contributor_name_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_identifiers | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_identifiers[].catalog_identifier | なし | 識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_identifiers[].catalog_identifier_type | あり | 識別子タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_titles | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_titles[].catalog_title | なし | タイトル |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_titles[].catalog_title_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_descriptions | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_descriptions[].catalog_description | なし | 内容記述 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_descriptions[].catalog_description_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_descriptions[].catalog_description_type | あり | 内容記述タイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_subjects | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_subjects[].catalog_subject | なし | 主題 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_subjects[].catalog_subject_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_subjects[].catalog_subject_uri | なし | 主題URI |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_subjects[].catalog_subject_scheme | あり | 主題スキーマ |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_licenses | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_licenses[].catalog_license | なし | ライセンス |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_license.catalog_license_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_license.catalog_license_type | あり | ライセンスタイプ |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_license.catalog_license_rdf_resource | なし | RDFリソース |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_rights | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_rights[].catalog_right | なし | アクセス権 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_rights[].catalog_right_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_rights[].catalog_right_rdf_resource | なし | RDFリソース |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_access_rights | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_access_rights[].catalog_access_right_access_rights | あり | アクセス権 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_access_rights[].catalog_access_right_rdf_resource | なし | RDFリソース |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_file | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_file.catalog_file_uri | なし | ファイルURI |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624004[].catalog_file.catalog_file_object_type | あり | オブジェクトタイプ |
| item_1698624005 | なし | 出版者情報 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624005[].publisher_names | なし | 出版者名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624005[].publisher_names[].publisher_name | なし | 出版者名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624005[].publisher_names[].publisher_name_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624005[].publisher_descriptions | なし | 出版者注記 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624005[].publisher_descriptions[].publisher_description | なし | 出版者注記 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624005[].publisher_descriptions[].publisher_description_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624005[].publisher_locations | なし | 出版地 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624005[].publisher_locations[].publisher_location | なし | 出版地 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624005[].publication_places | なし | 出版地（国名コード） |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624005[].publication_places[].publication_place | なし | 出版地（国名コード） |
| item_1698624006 | なし | 版 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624006[].edition | なし | 版 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624006[].edition_language | あり | 言語 |
| item_1698624007 | なし | 部編名 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624007[].volume_title | なし |  |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624007[].volume_title_language | あり | 言語 |
| item_1698624008 | なし | 日付（リテラル） |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624008[].subitem_dcterms_date | なし | 日付（リテラル） |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624008[].subitem_dcterms_date_language | あり | 言語 |
| item_1698624009 | なし | 所蔵機関 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624009[].holding_agent_names | なし | 所蔵機関 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624009[].holding_agent_names[].holding_agent_name | なし | 所蔵機関名 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624009[].holding_agent_names[].holding_agent_names_language | あり | 言語 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624009[].holding_agent_name_identifier | なし | 所蔵機関識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624009[].holding_agent_name_identifier.holding_agent_name_identifier_value | なし | 所蔵機関識別子 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624009[].holding_agent_name_identifier.holding_agent_name_identifier_scheme | あり | 所蔵機関識別子スキーマ |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624009[].holding_agent_name_identifier.holding_agent_name_identifier_uri | なし | 所蔵機関識別子URI |
| item_1698624010 | なし | 物理的形態 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624010[].jpcoar_format | なし | 物理的形態 |
| &nbsp;&nbsp;&nbsp;&nbsp;└ item_1698624010[].json_format_language | あり | 言語 |
