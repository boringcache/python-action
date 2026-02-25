# BoringCache Python

## What It Does

Installs Python via mise and caches Python + pip + uv with BoringCache:
- Python installation (`~/.local/share/mise`)
- pip download cache (`~/.cache/pip`)
- uv package cache (`~/.cache/uv`)

## Quick Reference

```yaml
- uses: boringcache/python-action@v1
  with:
    workspace: my-org/my-project
    python-version: '3.12'
  env:
    BORINGCACHE_API_TOKEN: ${{ secrets.BORINGCACHE_API_TOKEN }}
```

## How It Works

1. **Restore phase**:
   - Restores cached Python installation, pip cache, and uv cache
   - Installs mise (if needed)
   - Installs Python via mise
   - Caches are content-addressed (identical content never re-uploaded)

2. **Save phase**:
   - Saves Python installation, pip cache, and uv cache

## Cache Tags

Uses `cache-tag` prefix (defaults to repository name) with suffixes:
- `{prefix}-python-{version}` - Python installation
- `{prefix}-pip` - pip download cache
- `{prefix}-uv` - uv package cache

## Version Detection

Auto-detects version from (in order):
1. `python-version` input
2. `.python-version`
3. `.tool-versions`

## Inputs

| Input | Description |
|-------|-------------|
| `workspace` | BoringCache workspace |
| `python-version` | Python version (e.g., `3.12`, `3.11.0`) |
| `cache-tag` | Cache tag prefix (defaults to repo name) |
| `cache-python` | Cache Python installation (default: true) |
| `cache-pip` | Cache pip downloads (default: true) |
| `cache-uv` | Cache uv packages (default: true) |

## Outputs

| Output | Description |
|--------|-------------|
| `cache-hit` | `true` if pip or uv cache was restored |
| `python-cache-hit` | `true` if Python installation was restored |
| `pip-cache-hit` | `true` if pip cache was restored |
| `uv-cache-hit` | `true` if uv cache was restored |
| `python-version` | Installed Python version |

## Code Structure

- `lib/restore.ts` - Restore caches, install Python via mise
- `lib/save.ts` - Save caches
- `lib/utils.ts` - Shared utilities, mise helpers, version detection

## Build

```bash
npm install && npm run build && npm test
```

---
**See [../AGENTS.md](../AGENTS.md) for shared conventions.**
