import * as core from '@actions/core';
import * as path from 'path';
import {
  ensureBoringCache,
  execBoringCache,
  getWorkspace,
  getCacheTagPrefix,
  getPythonVersion,
  installMise,
  installPython,
  activatePython,
  getMiseDataDir,
  getPipCacheDir,
  getUvCacheDir,
} from './utils';

async function run(): Promise<void> {
  try {
    const cliVersion = core.getInput('cli-version');
    const inputs = {
      workspace: core.getInput('workspace'),
      pythonVersion: core.getInput('python-version'),
      workingDirectory: core.getInput('working-directory') || '.',
      cacheTagPrefix: core.getInput('cache-tag') || '',
      cachePython: core.getInput('cache-python') !== 'false',
      cachePip: core.getInput('cache-pip') !== 'false',
      cacheUv: core.getInput('cache-uv') !== 'false',
      verbose: core.getInput('verbose') === 'true',
      exclude: core.getInput('exclude'),
    };

    if (cliVersion.toLowerCase() !== 'skip') {
      await ensureBoringCache({ version: cliVersion });
    }

    const workspace = getWorkspace(inputs.workspace);
    core.setOutput('workspace', workspace);

    const cacheTagPrefix = getCacheTagPrefix(inputs.cacheTagPrefix);

    const workingDir = path.resolve(inputs.workingDirectory);
    const pythonVersion = await getPythonVersion(inputs.pythonVersion, workingDir);
    core.setOutput('python-version', pythonVersion);

    const pythonTag = `${cacheTagPrefix}-python-${pythonVersion}`;
    const pipTag = `${cacheTagPrefix}-pip`;
    const uvTag = `${cacheTagPrefix}-uv`;

    core.setOutput('python-tag', pythonTag);
    core.setOutput('pip-tag', pipTag);
    core.setOutput('uv-tag', uvTag);

    const miseDir = getMiseDataDir();
    const pipCacheDir = getPipCacheDir();
    const uvCacheDir = getUvCacheDir();

    let pythonCacheHit = false;
    if (inputs.cachePython) {
      const pythonArgs = ['restore', workspace, `${pythonTag}:${miseDir}`];
      if (inputs.verbose) pythonArgs.push('--verbose');
      const result = await execBoringCache(
        pythonArgs,
        { ignoreReturnCode: true }
      );
      pythonCacheHit = result === 0;
      core.setOutput('python-cache-hit', pythonCacheHit.toString());
    }

    await installMise();

    if (pythonCacheHit) {
      await activatePython(pythonVersion);
    } else {
      await installPython(pythonVersion);
    }

    let pipCacheHit = false;
    if (inputs.cachePip) {
      const pipArgs = ['restore', workspace, `${pipTag}:${pipCacheDir}`];
      if (inputs.verbose) pipArgs.push('--verbose');
      const pipResult = await execBoringCache(
        pipArgs,
        { ignoreReturnCode: true }
      );
      pipCacheHit = pipResult === 0;
      core.setOutput('pip-cache-hit', pipCacheHit.toString());
    }

    let uvCacheHit = false;
    if (inputs.cacheUv) {
      const uvArgs = ['restore', workspace, `${uvTag}:${uvCacheDir}`];
      if (inputs.verbose) uvArgs.push('--verbose');
      const uvResult = await execBoringCache(
        uvArgs,
        { ignoreReturnCode: true }
      );
      uvCacheHit = uvResult === 0;
      core.setOutput('uv-cache-hit', uvCacheHit.toString());
    }

    core.setOutput('cache-hit', (pipCacheHit || uvCacheHit).toString());

    core.saveState('workspace', workspace);
    core.saveState('cacheTagPrefix', cacheTagPrefix);
    core.saveState('python-tag', pythonTag);
    core.saveState('pip-tag', pipTag);
    core.saveState('uv-tag', uvTag);
    core.saveState('mise-dir', miseDir);
    core.saveState('pip-cache-dir', pipCacheDir);
    core.saveState('uv-cache-dir', uvCacheDir);
    core.saveState('cache-python', inputs.cachePython.toString());
    core.saveState('cache-pip', inputs.cachePip.toString());
    core.saveState('cache-uv', inputs.cacheUv.toString());
    core.saveState('verbose', inputs.verbose.toString());
    core.saveState('exclude', inputs.exclude);

  } catch (error) {
    core.setFailed(`Python setup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();
