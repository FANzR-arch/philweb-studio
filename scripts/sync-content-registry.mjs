import process from 'process';
import { writeContentRegistryFile } from '../content-system/core.js';

try {
  const result = writeContentRegistryFile(process.cwd());
  console.log(`[content] Registry ${result.changed ? 'updated' : 'checked'} at ${result.outputFilePath}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
