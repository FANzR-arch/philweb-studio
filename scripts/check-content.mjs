import process from 'process';
import { ensureContentIsValid } from '../content-system/core.js';

try {
  ensureContentIsValid(process.cwd());
  console.log('[content] Content validation passed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
