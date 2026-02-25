# boringcache/python-action

Setup Python via mise and cache Python + pip + uv with BoringCache.

Installs Python via [mise](https://mise.jdx.dev), restores cached directories before your job runs, and saves them when it finishes. Caches are content-addressed — identical content is never re-uploaded.

## Quick start

```yaml
- uses: boringcache/python-action@v1
  with:
    workspace: my-org/my-project
  env:
    BORINGCACHE_API_TOKEN: ${{ secrets.BORINGCACHE_API_TOKEN }}

- run: pip install -r requirements.txt
- run: pytest
```

## Mental model

This action caches the Python directories you explicitly choose.

- Python is installed via mise.
- pip download cache is restored if a matching cache exists.
- uv package cache is restored if a matching cache exists.
- Updated caches are saved after the job completes.

This action does not infer what should be cached and does not modify your build commands.

Version detection order:
- `.python-version`
- `.tool-versions` (asdf/mise format)

If no version file is found, defaults to Python 3.12.

Cache tags:
- Python: `{cache-tag}-python-{version}`
- pip: `{cache-tag}-pip`
- uv: `{cache-tag}-uv`

What gets cached:
- `~/.local/share/mise` — Python installation
- `~/.cache/pip` — pip download cache (`~/Library/Caches/pip` on macOS, `%LOCALAPPDATA%\pip\Cache` on Windows)
- `~/.cache/uv` — uv package cache (`%LOCALAPPDATA%\uv\cache` on Windows)

## Common patterns

### Simple Python project

```yaml
- uses: boringcache/python-action@v1
  with:
    workspace: my-org/my-project
  env:
    BORINGCACHE_API_TOKEN: ${{ secrets.BORINGCACHE_API_TOKEN }}

- run: pip install -r requirements.txt
- run: pytest
```

### With uv

```yaml
- uses: boringcache/python-action@v1
  with:
    workspace: my-org/my-project
  env:
    BORINGCACHE_API_TOKEN: ${{ secrets.BORINGCACHE_API_TOKEN }}

- run: pip install uv
- run: uv sync
- run: uv run pytest
```

### Version pinning

```yaml
- uses: boringcache/python-action@v1
  with:
    workspace: my-org/my-project
    python-version: '3.11'
  env:
    BORINGCACHE_API_TOKEN: ${{ secrets.BORINGCACHE_API_TOKEN }}
```

### pip only (no uv cache)

```yaml
- uses: boringcache/python-action@v1
  with:
    workspace: my-org/my-project
    cache-uv: 'false'
  env:
    BORINGCACHE_API_TOKEN: ${{ secrets.BORINGCACHE_API_TOKEN }}
```

### uv only (no pip cache)

```yaml
- uses: boringcache/python-action@v1
  with:
    workspace: my-org/my-project
    cache-pip: 'false'
  env:
    BORINGCACHE_API_TOKEN: ${{ secrets.BORINGCACHE_API_TOKEN }}
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `workspace` | No | repo name | Workspace in `org/repo` form. |
| `python-version` | No | from file | Python version. Reads `.python-version` or `.tool-versions`. |
| `working-directory` | No | `.` | Working directory for version detection. |
| `cache-tag` | No | repo name | Base tag for cache entries. |
| `cache-python` | No | `true` | Cache Python installation. |
| `cache-pip` | No | `true` | Cache pip download cache. |
| `cache-uv` | No | `true` | Cache uv package cache. |
| `exclude` | No | - | Glob patterns to exclude from cache. |
| `save-always` | No | `false` | Save cache even if job fails. |
| `verbose` | No | `false` | Enable detailed output. |

## Outputs

| Output | Description |
|--------|-------------|
| `python-version` | Installed Python version |
| `cache-hit` | Whether pip or uv cache was restored |
| `python-cache-hit` | Whether Python cache was restored |
| `pip-cache-hit` | Whether pip cache was restored |
| `uv-cache-hit` | Whether uv cache was restored |
| `python-tag` | Cache tag for Python installation |
| `pip-tag` | Cache tag for pip cache |
| `uv-tag` | Cache tag for uv cache |
| `workspace` | Resolved workspace name |

## Platform behavior

Platform scoping is what makes it safe to reuse caches across machines.

By default, caches are isolated by OS and architecture. Python packages with native extensions are platform-specific, so cross-platform caching is not recommended.

## Environment variables

| Variable | Description |
|----------|-------------|
| `BORINGCACHE_API_TOKEN` | API token (required) |
| `BORINGCACHE_DEFAULT_WORKSPACE` | Default workspace (if not specified in inputs) |
| `PIP_CACHE_DIR` | Override pip cache directory |
| `UV_CACHE_DIR` | Override uv cache directory |

## Troubleshooting

- Unauthorized or workspace not found: ensure `BORINGCACHE_API_TOKEN` is set and the workspace exists.
- Cache miss: check `workspace` and version detection files.
- uv cache not saving: ensure `cache-uv` is `true` (default) and uv has been used in the job.
- uv cache is automatically pruned with `uv cache prune --ci` before saving, which strips pre-built wheels (fast to re-download) and keeps source-built wheels (expensive to rebuild).

## Release notes

See https://github.com/boringcache/python-action/releases.

## License

MIT
