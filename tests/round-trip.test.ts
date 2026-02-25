import * as core from '@actions/core';
import * as execModule from '@actions/exec';

jest.mock('@boringcache/action-core', () => ({
  ensureBoringCache: jest.fn().mockResolvedValue(undefined),
  execBoringCache: jest.fn().mockResolvedValue(0),
  getWorkspace: jest.fn((input: string) => {
    if (!input) throw new Error('Workspace required');
    if (!input.includes('/')) return `default/${input}`;
    return input;
  }),
  getCacheTagPrefix: jest.fn((input: string, fallback: string) => {
    if (input) return input;
    const repo = process.env.GITHUB_REPOSITORY || '';
    if (repo) return repo.split('/')[1] || repo;
    return fallback;
  }),
  pathExists: jest.fn().mockResolvedValue(false),
}));

jest.mock('@actions/exec', () => ({
  exec: jest.fn().mockResolvedValue(0),
}));

import {
  ensureBoringCache,
  execBoringCache,
} from '@boringcache/action-core';

describe('Python restore/save round-trip', () => {
  const stateStore: Record<string, string> = {};
  const outputs: Record<string, string> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(stateStore).forEach(k => delete stateStore[k]);
    Object.keys(outputs).forEach(k => delete outputs[k]);

    (ensureBoringCache as jest.Mock).mockResolvedValue(undefined);
    (execBoringCache as jest.Mock).mockResolvedValue(0);

    const { getWorkspace, getCacheTagPrefix } = require('@boringcache/action-core');
    (getWorkspace as jest.Mock).mockImplementation((input: string) => {
      if (!input) throw new Error('Workspace required');
      if (!input.includes('/')) return `default/${input}`;
      return input;
    });
    (getCacheTagPrefix as jest.Mock).mockImplementation((input: string, fallback: string) => {
      if (input) return input;
      const repo = process.env.GITHUB_REPOSITORY || '';
      if (repo) return repo.split('/')[1] || repo;
      return fallback;
    });

    (core.saveState as jest.Mock).mockImplementation((key: string, value: string) => {
      stateStore[key] = value;
    });
    (core.getState as jest.Mock).mockImplementation((key: string) => {
      return stateStore[key] || '';
    });
    (core.setOutput as jest.Mock).mockImplementation((key: string, value: string) => {
      outputs[key] = value;
    });

    process.env.BORINGCACHE_API_TOKEN = 'test-token';
    process.env.GITHUB_REPOSITORY = 'myorg/myrepo';
  });

  afterEach(() => {
    delete process.env.BORINGCACHE_API_TOKEN;
    delete process.env.GITHUB_REPOSITORY;
  });

  it('full round-trip: restore python+pip+uv, save python+pip+uv', async () => {
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'cli-version': 'v1.8.0',
        'workspace': 'myorg/myproject',
        'cache-tag': '',
        'python-version': '3.12',
        'working-directory': '.',
        'cache-python': 'true',
        'cache-pip': 'true',
        'cache-uv': 'true',
        'verbose': 'false',
      };
      return inputs[name] || '';
    });

    jest.isolateModules(() => {
      require('../lib/restore');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(ensureBoringCache).toHaveBeenCalledWith({ version: 'v1.8.0' });

    expect(execBoringCache).toHaveBeenCalledTimes(3);
    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining(['restore', 'myorg/myproject', expect.stringContaining('myrepo-python-3.12:')]),
      expect.anything()
    );
    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining(['restore', 'myorg/myproject', expect.stringContaining('myrepo-pip:')]),
      expect.anything()
    );
    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining(['restore', 'myorg/myproject', expect.stringContaining('myrepo-uv:')]),
      expect.anything()
    );

    expect(execModule.exec).toHaveBeenCalledWith('sh', ['-c', 'curl https://mise.run | sh']);
    expect(execModule.exec).toHaveBeenCalledWith(
      expect.stringContaining('mise'),
      ['use', '-g', 'python@3.12']
    );

    expect(stateStore['workspace']).toBe('myorg/myproject');
    expect(stateStore['cacheTagPrefix']).toBe('myrepo');
    expect(stateStore['python-tag']).toBe('myrepo-python-3.12');
    expect(stateStore['pip-tag']).toBe('myrepo-pip');
    expect(stateStore['uv-tag']).toBe('myrepo-uv');
    expect(stateStore['cache-python']).toBe('true');
    expect(stateStore['cache-pip']).toBe('true');
    expect(stateStore['cache-uv']).toBe('true');

    expect(outputs['workspace']).toBe('myorg/myproject');
    expect(outputs['python-version']).toBe('3.12');
    expect(outputs['python-cache-hit']).toBe('true');
    expect(outputs['pip-cache-hit']).toBe('true');
    expect(outputs['uv-cache-hit']).toBe('true');
    expect(outputs['cache-hit']).toBe('true');

    (execBoringCache as jest.Mock).mockClear();

    jest.isolateModules(() => {
      const coreMock = require('@actions/core');
      coreMock.getState.mockImplementation((key: string) => stateStore[key] || '');
      coreMock.getInput.mockImplementation((name: string) => {
        if (name === 'workspace') return 'myorg/myproject';
        return '';
      });
      require('../lib/save');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(execBoringCache).toHaveBeenCalledTimes(3);
    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining(['save', 'myorg/myproject', expect.stringContaining('myrepo-python-3.12:')]),
      expect.anything()
    );
    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining(['save', 'myorg/myproject', expect.stringContaining('myrepo-pip:')]),
      expect.anything()
    );
    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining(['save', 'myorg/myproject', expect.stringContaining('myrepo-uv:')]),
      expect.anything()
    );
  });

  it('custom cache-tag is used', async () => {
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'workspace': 'myorg/myproject',
        'cache-tag': 'my-custom-tag',
        'python-version': '3.11',
      };
      return inputs[name] || '';
    });

    jest.isolateModules(() => {
      require('../lib/restore');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(outputs['python-tag']).toBe('my-custom-tag-python-3.11');
    expect(outputs['pip-tag']).toBe('my-custom-tag-pip');
    expect(outputs['uv-tag']).toBe('my-custom-tag-uv');
  });

  it('save is a no-op when workspace is missing', async () => {
    (core.getState as jest.Mock).mockImplementation(() => '');
    (core.getInput as jest.Mock).mockImplementation(() => '');

    jest.isolateModules(() => {
      require('../lib/save');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(execBoringCache).not.toHaveBeenCalled();
  });

  it('cache-pip false skips pip cache', async () => {
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'workspace': 'myorg/myproject',
        'python-version': '3.12',
        'cache-pip': 'false',
        'cache-uv': 'true',
      };
      return inputs[name] || '';
    });

    jest.isolateModules(() => {
      require('../lib/restore');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    const calls = (execBoringCache as jest.Mock).mock.calls;
    const pipCalls = calls.filter((call: string[][]) =>
      call[0].some((arg: string) => arg.includes('myrepo-pip:'))
    );
    expect(pipCalls).toHaveLength(0);

    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('myrepo-uv:')]),
      expect.anything()
    );
  });

  it('cache-uv false skips uv cache', async () => {
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'workspace': 'myorg/myproject',
        'python-version': '3.12',
        'cache-pip': 'true',
        'cache-uv': 'false',
      };
      return inputs[name] || '';
    });

    jest.isolateModules(() => {
      require('../lib/restore');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    const calls = (execBoringCache as jest.Mock).mock.calls;
    const uvCalls = calls.filter((call: string[][]) =>
      call[0].some((arg: string) => arg.includes('myrepo-uv:'))
    );
    expect(uvCalls).toHaveLength(0);

    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('myrepo-pip:')]),
      expect.anything()
    );
  });

  it('skips CLI install when cli-version is "skip"', async () => {
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'cli-version': 'skip',
        'workspace': 'myorg/myproject',
        'python-version': '3.12',
      };
      return inputs[name] || '';
    });

    jest.isolateModules(() => {
      require('../lib/restore');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(ensureBoringCache).not.toHaveBeenCalled();
    expect(execBoringCache).toHaveBeenCalled();
  });

  it('cache-python false skips Python installation cache but still installs', async () => {
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'workspace': 'myorg/myproject',
        'python-version': '3.12',
        'cache-python': 'false',
      };
      return inputs[name] || '';
    });

    jest.isolateModules(() => {
      require('../lib/restore');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    const calls = (execBoringCache as jest.Mock).mock.calls;
    const pythonInstallCalls = calls.filter((call: string[][]) =>
      call[0].some((arg: string) => arg.match(/myrepo-python-3\.12:/))
    );
    expect(pythonInstallCalls).toHaveLength(0);

    expect(execModule.exec).toHaveBeenCalledWith(
      expect.stringContaining('mise'),
      ['install', 'python@3.12']
    );

    expect(stateStore['cache-python']).toBe('false');

    (execBoringCache as jest.Mock).mockClear();

    jest.isolateModules(() => {
      const coreMock = require('@actions/core');
      coreMock.getState.mockImplementation((key: string) => stateStore[key] || '');
      coreMock.getInput.mockImplementation((name: string) => {
        if (name === 'workspace') return 'myorg/myproject';
        return '';
      });
      require('../lib/save');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    const saveCalls = (execBoringCache as jest.Mock).mock.calls;
    const pythonSaveCalls = saveCalls.filter((call: string[][]) =>
      call[0].some((arg: string) => arg.match(/myrepo-python-3\.12:/))
    );
    expect(pythonSaveCalls).toHaveLength(0);
  });
});
