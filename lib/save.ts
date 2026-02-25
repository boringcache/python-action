import * as core from '@actions/core';
import { execBoringCache, ensureBoringCache, pruneUvCache } from './utils';

async function run(): Promise<void> {
  try {
    const cliVersion = core.getInput('cli-version');
    const workspace = core.getInput('workspace') || core.getState('workspace');
    const pythonTag = core.getState('python-tag');
    const pipTag = core.getState('pip-tag');
    const uvTag = core.getState('uv-tag');
    const miseDir = core.getState('mise-dir');
    const pipCacheDir = core.getState('pip-cache-dir');
    const uvCacheDir = core.getState('uv-cache-dir');
    const cachePython = core.getState('cache-python') === 'true';
    const cachePip = core.getInput('cache-pip') !== 'false' && core.getState('cache-pip') !== 'false';
    const cacheUv = core.getInput('cache-uv') !== 'false' && core.getState('cache-uv') !== 'false';
    const verbose = core.getState('verbose') === 'true';
    const exclude = core.getState('exclude');

    if (!workspace) {
      core.info('No workspace found, skipping cache save');
      return;
    }

    if (cliVersion.toLowerCase() !== 'skip') {
      await ensureBoringCache({ version: cliVersion });
    }

    core.info('Saving to BoringCache...');

    if (cachePython && pythonTag) {
      core.info(`Saving Python [${pythonTag}]...`);
      const pythonArgs = ['save', workspace, `${pythonTag}:${miseDir}`];
      if (verbose) pythonArgs.push('--verbose');
      await execBoringCache(pythonArgs);
    }

    if (cachePip && pipTag) {
      core.info(`Saving pip cache [${pipTag}]...`);
      const args = ['save', workspace, `${pipTag}:${pipCacheDir}`];
      if (verbose) args.push('--verbose');
      if (exclude) args.push('--exclude', exclude);
      await execBoringCache(args);
    }

    if (cacheUv && uvTag) {
      await pruneUvCache();
      core.info(`Saving uv cache [${uvTag}]...`);
      const args = ['save', workspace, `${uvTag}:${uvCacheDir}`];
      if (verbose) args.push('--verbose');
      if (exclude) args.push('--exclude', exclude);
      await execBoringCache(args);
    }

    core.info('Save complete');
  } catch (error) {
    core.warning(`Cache save failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();
