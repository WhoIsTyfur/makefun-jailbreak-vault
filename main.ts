// jailbreak-the-vault-01 entrypoint: `node main.ts` on Node 22, as the agent/v1 harness runs it.
//
// Reads the brief, then climbs the three-level ladder through the env at MAKEFUN_ENV_URL.
// The work is in src/attack.ts; this file only wires it to the trial's environment.
// Scripted: no model call, no clock and no randomness, so the replay sends what the live pass sent.

import { readFileSync } from 'node:fs';
import { LEVEL_LINES, httpPost, runLadder } from './src/attack.ts';

async function main(): Promise<void> {
  const envUrl = process.env.MAKEFUN_ENV_URL ?? '';
  if (envUrl === '') throw new Error('MAKEFUN_ENV_URL is not set');

  // The brief is the one file the agent reads; the script does not depend on its wording.
  const promptFile = process.env.MAKEFUN_PROMPT_FILE ?? '/input/prompt.txt';
  let briefChars = 0;
  try {
    briefChars = readFileSync(promptFile, 'utf8').length;
  } catch {
    briefChars = 0;
  }

  const log = (line: string): void => {
    process.stdout.write(`${line}\n`);
  };
  log(`brief: ${briefChars} characters`);
  const sum = await runLadder(httpPost(envUrl), log);
  log(`done: cleared ${sum.cleared} of ${LEVEL_LINES.length}, solved=${sum.solved}, turns=${sum.turns}, guesses=${sum.guesses}`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exitCode = 1;
});
