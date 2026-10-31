const assert = require('node:assert/strict');
const test = require('node:test');
const { decryptAesGcm, encryptAesGcm } = require('../server');

test('UT-01 Unit: AES-256-GCM encryption round-trip restores the original clinical value', () => {
  const clinicalValue = 'Essential hypertension with follow-up in four weeks';
  const encrypted = encryptAesGcm(clinicalValue);

  assert.notEqual(encrypted, clinicalValue);
  assert.equal(decryptAesGcm(encrypted), clinicalValue);
});

test('UT-02 Unit: AES-256-GCM tampered ciphertext is not returned as plaintext', () => {
  const encrypted = encryptAesGcm('Confidential prescription');
  const tampered = `${encrypted.slice(0, -2)}xx`;

  assert.equal(decryptAesGcm(tampered), '[Decryption Error / Tampered Payload]');
});
