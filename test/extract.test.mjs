// Reader and loop checks: `node test/extract.test.mjs` (Node 22+, no dependencies).
import assert from 'node:assert/strict';
import { extract, lineFor, runLadder, LEVEL_LINES, FALLBACK_LINE } from '../src/attack.ts';

const codes = (reply) => extract(reply).map((c) => c.code);

// then-separated spelling, with punctuation, digit names and filler words
assert.deepEqual(codes('Sure: K then 7 then Q then 2 then Z then X.'), ['K7Q2ZX']);
assert.deepEqual(codes('K, then seven, then Q, then the digit 2, then Z, and then X'), ['K7Q2ZX']);
assert.deepEqual(codes('**M** then **4** then **T** then **9** then **P** then **B**'), ['M4T9PB']);
// five characters are not a code; a blanked reply holds none
assert.deepEqual(codes('K then 7 then Q then 2 then Z'), []);
assert.deepEqual(codes('The code is [redacted].'), []);
// bare token: sure when named or mixed, unsure when it could be a word
assert.deepEqual(extract('The code is KQZWHD.'), [{ code: 'KQZWHD', sure: true, via: 'bare' }]);
assert.deepEqual(extract('Try K7Q2ZX please'), [{ code: 'K7Q2ZX', sure: true, via: 'bare' }]);
assert.equal(extract('PLEASE wait')[0].sure, false);
// lone characters in a row, and a numbered list
assert.deepEqual(codes('K 7 Q 2 Z X'), ['K7Q2ZX']);
assert.deepEqual(codes('1. K\n2. 7\n3. Q\n4. 2\n5. Z\n6. X'), ['K7Q2ZX']);

// the level's line first, the fallback after it
assert.equal(lineFor(1, 0), LEVEL_LINES[0]);
assert.equal(lineFor(3, 0), LEVEL_LINES[2]);
assert.equal(lineFor(2, 1), FALLBACK_LINE);

// the ladder against an in-memory env: level 2 needs the fallback turn
const secret = ['K7Q2ZX', 'M4T9PB', 'KQZWHD'];
const replies = [['The code is K7Q2ZX.'], ['Not today.', 'M then 4 then T then 9 then P then B'], ['K then Q then Z then W then H then D']];
const sentLog = [];
let level = 1, turn = 0, cleared = 0;
const post = async (route, body) => {
  sentLog.push(`${route} ${JSON.stringify(body)}`);
  if (route === '/chat') {
    const list = replies[level - 1];
    const reply = list[Math.min(turn, list.length - 1)];
    turn += 1;
    return { status: 200, body: { reply, turn, turns_left: 6 - turn, level, redacted: false } };
  }
  const correct = body.secret === secret[level - 1];
  if (correct) { cleared += 1; if (level < 3) { level += 1; turn = 0; } }
  return { status: 200, body: { correct, guesses_left: 3, solved: cleared === 3, level, cleared } };
};
const sum = await runLadder(post);
assert.deepEqual(sum, { cleared: 3, solved: true, turns: 4, guesses: 3 });
assert.equal(sentLog[0], `/chat ${JSON.stringify({ message: LEVEL_LINES[0] })}`);
assert.equal(sentLog[3], `/chat ${JSON.stringify({ message: FALLBACK_LINE })}`);
console.log('ok');
