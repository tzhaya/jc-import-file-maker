'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDataCiteAuthors } = require('../chrome-extension/make_jc_importer.js');

function firstCreator(creator) {
  const [author] = buildDataCiteAuthors([creator]);
  return author.creatorNames[0];
}

test('buildDataCiteAuthors: nameType の明示値を保持する', () => {
  const organizational = firstCreator({ name: 'Example Consortium', nameType: 'Organizational' });
  const personal = firstCreator({ name: 'Doe, Jane', nameType: 'Personal', familyName: 'Doe', givenName: 'Jane' });
  assert.equal(organizational.creatorNameType, 'Organizational');
  assert.equal(personal.creatorNameType, 'Personal');
  assert.equal('_warnNameType' in organizational, false);
  assert.equal('_warnNameType' in personal, false);
});

test('buildDataCiteAuthors: nameType 欠落時は姓名がある場合だけ Personal とする', () => {
  assert.equal(firstCreator({ name: 'Doe', familyName: 'Doe' }).creatorNameType, 'Personal');
  assert.equal(firstCreator({ name: 'Jane', givenName: 'Jane' }).creatorNameType, 'Personal');
  const creator = firstCreator({ name: 'Example Research Consortium' });
  assert.equal(creator.creatorNameType, '');
  assert.equal(creator._warnNameType, true);
});

test('buildDataCiteAuthors: 未知の nameType は姓名の有無にかかわらず確認対象にする', () => {
  for (const creator of [
    { name: 'Doe, Jane', nameType: 'Unknown', familyName: 'Doe', givenName: 'Jane' },
    { name: 'Example Research Consortium', nameType: 'Unknown' },
  ]) {
    const mapped = firstCreator(creator);
    assert.equal(mapped.creatorNameType, '');
    assert.equal(mapped._warnNameType, true);
  }
});

test('buildDataCiteAuthors: 空白だけの姓名を正規化して name にフォールバックする', () => {
  const [author] = buildDataCiteAuthors([{ name: 'Miljolare.no', familyName: '   ', givenName: null }]);
  assert.deepEqual(author.creatorNames, [{
    creatorName: 'Miljolare.no', creatorNameLang: '', creatorNameType: '', _warnNameType: true,
  }]);
  assert.deepEqual(author.familyNames, []);
  assert.deepEqual(author.givenNames, []);
});

test('buildDataCiteAuthors: 空入力は空配列を返す', () => {
  assert.deepEqual(buildDataCiteAuthors(), []);
  assert.deepEqual(buildDataCiteAuthors([]), []);
});
