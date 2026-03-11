# boringcache/python-action

Set up Python via mise and cache Python, pip, and uv with BoringCache.

## Quick start

```yaml
- uses: boringcache/python-action@v1
  with:
    workspace: my-org/my-project
  env:
    BORINGCACHE_RESTORE_TOKEN: ${{ secrets.BORINGCACHE_RESTORE_TOKEN }}
    BORINGCACHE_SAVE_TOKEN: ${{ github.event_name == 'pull_request' && '' || secrets.BORINGCACHE_SAVE_TOKEN }}

- run: pip install -r requirements.txt
- run: pytest
```

## What it caches

- Python from `.python-version` or `.tool-versions` (fallback: `3.12`).
- The Python installation under mise.
- pip download cache.
- uv package cache.

## Key inputs

| Input | Description |
|-------|-------------|
| `workspace` | Workspace in `org/repo` form. |
| `python-version` | Override the detected Python version. |
| `cache-python` | Cache the Python installation from mise. |
| `cache-pip` | Cache the pip download cache. |
| `cache-uv` | Cache the uv package cache. |
| `working-directory` | Project directory to inspect. |
| `save-always` | Save even if the job fails. |

## Outputs

| Output | Description |
|--------|-------------|
| `python-version` | Installed Python version. |
| `cache-hit` | Whether any Python package cache was restored. |
| `python-cache-hit` | Whether the Python runtime cache was restored. |
| `workspace` | Resolved workspace name. |

## Docs

- [Language actions docs](https://boringcache.com/docs#language-actions)
- [GitHub Actions auth and trust model](https://boringcache.com/docs#actions-auth)
