import { getWorkspace, getCacheTagPrefix, getPipCacheDir, getUvCacheDir, getMiseBinPath, getMiseDataDir } from '../lib/utils';
import * as core from '@actions/core';
import * as path from 'path';
import * as os from 'os';

describe('Python Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.BORINGCACHE_DEFAULT_WORKSPACE;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.PIP_CACHE_DIR;
    delete process.env.UV_CACHE_DIR;
    delete process.env.LOCALAPPDATA;
    delete process.env.LocalAppData;
  });

  describe('getWorkspace', () => {
    it('should return input workspace when provided', () => {
      expect(getWorkspace('my-org/my-project')).toBe('my-org/my-project');
    });

    it('should use BORINGCACHE_DEFAULT_WORKSPACE as fallback', () => {
      process.env.BORINGCACHE_DEFAULT_WORKSPACE = 'default-org/default-project';
      expect(getWorkspace('')).toBe('default-org/default-project');
    });

    it('should add default/ prefix when no slash present', () => {
      expect(getWorkspace('my-project')).toBe('default/my-project');
    });

    it('should fail when no workspace available', () => {
      expect(() => getWorkspace('')).toThrow('Workspace required');
      expect(core.setFailed).toHaveBeenCalled();
    });
  });

  describe('getCacheTagPrefix', () => {
    it('should return input cache tag when provided', () => {
      expect(getCacheTagPrefix('my-cache')).toBe('my-cache');
    });

    it('should use repository name as default', () => {
      process.env.GITHUB_REPOSITORY = 'owner/my-repo';
      expect(getCacheTagPrefix('')).toBe('my-repo');
    });

    it('should return python as final fallback', () => {
      expect(getCacheTagPrefix('')).toBe('python');
    });
  });

  describe('getPipCacheDir', () => {
    it('should return PIP_CACHE_DIR when set', () => {
      process.env.PIP_CACHE_DIR = '/custom/pip/cache';
      expect(getPipCacheDir()).toBe('/custom/pip/cache');
    });

    it('should return platform-specific default', () => {
      const dir = getPipCacheDir();
      if (os.platform() === 'darwin') {
        expect(dir).toBe(path.join(os.homedir(), 'Library', 'Caches', 'pip'));
      } else if (os.platform() === 'linux') {
        expect(dir).toBe(path.join(os.homedir(), '.cache', 'pip'));
      }
    });
  });

  describe('getUvCacheDir', () => {
    it('should return UV_CACHE_DIR when set', () => {
      process.env.UV_CACHE_DIR = '/custom/uv/cache';
      expect(getUvCacheDir()).toBe('/custom/uv/cache');
    });

    it('should return ~/.cache/uv on unix (macOS and Linux share XDG convention)', () => {
      if (os.platform() !== 'win32') {
        const dir = getUvCacheDir();
        expect(dir).toBe(path.join(os.homedir(), '.cache', 'uv'));
      }
    });
  });

  describe('getMiseBinPath', () => {
    it('should return path under .local/bin', () => {
      const result = getMiseBinPath();
      expect(result).toContain(path.join('.local', 'bin', 'mise'));
    });
  });

  describe('getMiseDataDir', () => {
    it('should return path under .local/share/mise on unix', () => {
      if (process.platform !== 'win32') {
        const result = getMiseDataDir();
        expect(result).toBe(path.join(os.homedir(), '.local', 'share', 'mise'));
      }
    });
  });
});
