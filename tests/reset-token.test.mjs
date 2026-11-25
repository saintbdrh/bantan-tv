import test from 'node:test';
import assert from 'node:assert/strict';
import {generateResetToken,resetTokenHash,validResetToken} from '../lib/reset-token.ts';
test('reset tokens contain 256 random bits and only hashes are persisted',()=>{
  const token=generateResetToken();
  assert(validResetToken(token));assert.equal(token.length,64);
  assert.notEqual(token,generateResetToken());
  assert.notEqual(resetTokenHash(token),token);
  assert.equal(resetTokenHash(token),resetTokenHash(token));
  assert(!validResetToken(token+'x'));assert(!validResetToken(null));
});
