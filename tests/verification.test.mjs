import test from 'node:test';
import assert from 'node:assert/strict';
import { generateVerificationCode, verificationCodeHash, matchesVerificationCode } from '../lib/verification-code.ts';

test('verification codes retain leading zeros and always have six digits',()=>{
  for(let i=0;i<100;i++)assert.match(generateVerificationCode(),/^\d{6}$/);
  const hash=verificationCodeHash('request-1','000007','test-secret');
  assert(matchesVerificationCode('request-1','000007',hash,'test-secret'));
});
test('verification hashes bind codes to both their challenge and secret',()=>{
  const hash=verificationCodeHash('request-1','123456','secret-a');
  assert(!matchesVerificationCode('request-2','123456',hash,'secret-a'));
  assert(!matchesVerificationCode('request-1','123456',hash,'secret-b'));
  assert(!matchesVerificationCode('request-1','123455',hash,'secret-a'));
  assert(!matchesVerificationCode('request-1','123456-extra',hash,'secret-a'));
  assert(!matchesVerificationCode('request-1','123456','malformed','secret-a'));
  assert.notEqual(hash,'123456');
});
