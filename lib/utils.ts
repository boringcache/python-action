import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ensureBoringCache,
  execBoringCache as execBoringCacheCore,
  getWorkspace as getWorkspaceCore,
  getCacheTagPrefix as getCacheTagPrefixCore,
  pathExists,
} from '@boringcache/action-core';

export { ensureBoringCache, pathExists };

const isWindows = process.platform === 'win32';

export function getMiseBinPath(): string {
  const homedir = os.homedir();
  return isWindows
    ? path.join(homedir, '.local', 'bin', 'mise.exe')
    : path.join(homedir, '.local', 'bin', 'mise');
}

export function getMiseDataDir(): string {
  if (isWindows) {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'mise');
  }
  return path.join(os.homedir(), '.local', 'share', 'mise');
}

export async function execBoringCache(args: string[], options: { ignoreReturnCode?: boolean } = {}): Promise<number> {
  const code = await execBoringCacheCore(args, {
    ignoreReturnCode: options.ignoreReturnCode ?? false,
    silent: true,
    listeners: {
      stdout: (data: Buffer) => {
        process.stdout.write(data.toString());
      },
      stderr: (data: Buffer) => {
        process.stderr.write(data.toString());
      }
    }
  });
  return code;
}

export function getWorkspace(inputWorkspace: string): string {
  return getWorkspaceCore(inputWorkspace);
}

export function getCacheTagPrefix(inputCacheTag: string): string {
  return getCacheTagPrefixCore(inputCacheTag, 'python');
}

export async function getPythonVersion(inputVersion: string, workingDir: string): Promise<string> {
  if (inputVersion) {
    return inputVersion;
  }

  const pythonVersionFile = path.join(workingDir, '.python-version');
  try {
    const content = await fs.promises.readFile(pythonVersionFile, 'utf-8');
    const version = content.trim().split('\n')[0].trim();
    if (version && !version.startsWith('#')) {
      return version;
    }
  } catch {}

  const toolVersionsFile = path.join(workingDir, '.tool-versions');
  try {
    const content = await fs.promises.readFile(toolVersionsFile, 'utf-8');
    const pythonLine = content.split('\n').find(line => line.startsWith('python '));
    if (pythonLine) {
      return pythonLine.split(' ')[1].trim();
    }
  } catch {}

  return '3.12';
}

export function getPipCacheDir(): string {
  if (process.env.PIP_CACHE_DIR) {
    return process.env.PIP_CACHE_DIR;
  }

  const platform = os.platform();
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Caches', 'pip');
  } else if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(localAppData, 'pip', 'Cache');
  }
  return path.join(os.homedir(), '.cache', 'pip');
}

export function getUvCacheDir(): string {
  if (process.env.UV_CACHE_DIR) {
    return process.env.UV_CACHE_DIR;
  }

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(localAppData, 'uv', 'cache');
  }
  return path.join(os.homedir(), '.cache', 'uv');
}

export async function pruneUvCache(): Promise<void> {
  try {
    await exec.exec('uv', ['cache', 'prune', '--ci'], {
      ignoreReturnCode: true,
      silent: true,
    });
    core.info('Pruned uv cache for CI');
  } catch {
  }
}

export async function installMise(): Promise<void> {
  core.info('Installing mise...');
  if (isWindows) {
    await installMiseWindows();
  } else {
    await exec.exec('sh', ['-c', 'curl https://mise.run | sh']);
  }

  core.addPath(path.dirname(getMiseBinPath()));
  core.addPath(path.join(getMiseDataDir(), 'shims'));
}

async function installMiseWindows(): Promise<void> {
  const arch = os.arch() === 'arm64' ? 'arm64' : 'x64';
  const miseVersion = process.env.MISE_VERSION || 'v2026.2.8';
  const url = `https://github.com/jdx/mise/releases/download/${miseVersion}/mise-${miseVersion}-windows-${arch}.zip`;

  const binDir = path.dirname(getMiseBinPath());
  await fs.promises.mkdir(binDir, { recursive: true });

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mise-'));
  try {
    const zipPath = path.join(tempDir, 'mise.zip');
    await exec.exec('curl', ['-fsSL', '-o', zipPath, url]);
    await exec.exec('tar', ['-xf', zipPath, '-C', tempDir]);
    await fs.promises.copyFile(
      path.join(tempDir, 'mise', 'bin', 'mise.exe'),
      getMiseBinPath(),
    );
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

export async function installPython(version: string): Promise<void> {
  const misePath = getMiseBinPath();

  await exec.exec(misePath, ['install', `python@${version}`]);
  await exec.exec(misePath, ['use', '-g', `python@${version}`]);
}

export async function activatePython(version: string): Promise<void> {
  const misePath = getMiseBinPath();

  await exec.exec(misePath, ['use', '-g', `python@${version}`]);
}
