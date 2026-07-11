import process from 'process';
import { scaffoldProject, writeContentRegistryFile } from '../content-system/core.js';

function getProjectId(argv) {
  const flagIndex = argv.indexOf('--id');
  if (flagIndex >= 0 && argv[flagIndex + 1]) {
    return argv[flagIndex + 1];
  }

  return argv[0];
}

const projectId = getProjectId(process.argv.slice(2));

if (!projectId) {
  console.error('Usage: npm run content:new -- --id my-project');
  process.exit(1);
}

try {
  const result = scaffoldProject(process.cwd(), projectId);
  writeContentRegistryFile(process.cwd());
  console.log(`[content] Created project scaffold at ${result.projectDirectoryPath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
