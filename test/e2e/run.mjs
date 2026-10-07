import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const cwd = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const cli = require.resolve('@playwright/test/cli');
const project = `coursehub-e2e-${randomUUID().slice(0, 8)}`;
const reports = fileURLToPath(new URL(`../reports/e2e/${project}/`, import.meta.url));
const composeArgs = ['compose', '-f', fileURLToPath(new URL('compose.yml', import.meta.url)), '-p', project];
const env = { ...process.env, COURSEHUB_E2E_PROJECT: project, COURSEHUB_E2E_REPORT_DIR: reports };
let activeChild;
let interrupted = false;
let stackAttempted = false;

function run(command, args, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    activeChild = child;
    let output = '';
    if (capture) {
      child.stdout.on('data', (data) => { output += data; });
      child.stderr.on('data', (data) => { output += data; });
    }
    child.on('error', reject);
    child.on('close', (code) => {
      if (activeChild === child) activeChild = undefined;
      if (code === 0) resolve(output);
      else reject(new Error(`${command} ${args.join(' ')} failed (${code})${output ? `\n${output}` : ''}`));
    });
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    interrupted = true;
    if (activeChild) {
      if (process.platform === 'win32') {
        // Windows cannot gracefully signal a process group; kill this owned tree only.
        spawn('taskkill', ['/pid', String(activeChild.pid), '/T', '/F'], { stdio: 'ignore' });
      } else activeChild.kill('SIGTERM');
    }
  });
}

async function waitForBackend() {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline && !interrupted) {
    try {
      // Liveness alone is insufficient: this GET also requires a migrated database.
      const response = await fetch('http://127.0.0.1:18080/api/v1/catalog/categories', {
        signal: AbortSignal.timeout(3_000),
      });
      if (response.ok && (await response.json()).length > 0) return;
    } catch { /* The container or database may still be starting. */ }
    await delay(1_000);
  }
  throw new Error(interrupted ? 'E2E interrupted' : 'Backend/database not ready within 180 seconds');
}

let failed = false;
try {
  if (process.argv.includes('--list')) {
    await run(process.execPath, [cli, 'test', '--config', 'playwright.config.ts', ...process.argv.slice(2)]);
  } else {
    await mkdir(reports, { recursive: true });
    await run('docker', ['info'], true);
    await writeFile(`${reports}/environment.json`, JSON.stringify({
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim(),
      startedAt: new Date().toISOString(), node: process.version, platform: process.platform,
      composeProject: project, browser: 'chromium', command: process.argv.join(' '),
    }, null, 2));
    stackAttempted = true;
    await run('docker', [...composeArgs, 'up', '-d', '--build']);
    if (interrupted) throw new Error('E2E interrupted');
    await waitForBackend();
    await run(process.execPath, [cli, 'test', '--config', 'playwright.config.ts', ...process.argv.slice(2)]);
  }
} catch (error) {
  failed = true;
  console.error(error.message);
} finally {
  if (stackAttempted) {
    try {
      const logs = await run('docker', [...composeArgs, 'logs', '--no-color'], true);
      await writeFile(`${reports}/services.log`, logs);
    } catch (error) { console.error(`Cannot collect service logs: ${error.message}`); }
    try {
      // Only the randomly named project created by this process is removed.
      await run('docker', [...composeArgs, 'down', '--volumes', '--remove-orphans']);
    } catch (error) { failed = true; console.error(`E2E cleanup failed: ${error.message}`); }
  }
}
process.exitCode = failed || interrupted ? 1 : 0;
