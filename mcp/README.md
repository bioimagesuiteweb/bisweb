# BioImage Suite Web — MCP Server

An MCP server that lets Claude process and view medical images by file path.
Image data never passes through Claude — only filenames and module outputs.

## Files

| File | Purpose |
|------|---------|
| `bisweb_mcp.js` | The MCP server |
| `run_mcp_server.sh` | Bash launcher (used by Claude Desktop) |
| `install_mcp.js` | Adds the `bisweb-mcp` entry to Claude Desktop config + builds `bisweb.skill` |
| `update_cache.js` | Regenerates `module_cache.json` and seeds `module_config.json` |
| `module_cache.json` | Machine-generated module descriptions — do not edit |
| `module_config.json` | Hand-edited enable/disable per module |
| `SKILL.md` | Claude skill definition — double-click `bisweb.skill` to install |

## Setup

**1. Install npm dependencies**
```bash
cd mcp && npm install
```

**2. Generate module cache** (once, or after a bisweb build)
```bash
node mcp/update_cache.js
```

**3. Enable modules**

Edit `mcp/module_config.json` and set `"enable": true` for the modules you want.
All modules default to `false`. Run `node mcp/update_cache.js` again after a
bisweb update to pick up any new modules without losing your existing settings.

**4. Install into Claude Desktop**
```bash
node mcp/install_mcp.js
```

Restart Claude Desktop. The `bisweb-mcp` entry is added to:
`~/Library/Application Support/Claude/claude_desktop_config.json`

**5. Install the skill**

Double-click `mcp/bisweb.skill` in Finder to install the `bisweb` Claude skill.

## Tools

### Module tools

| Tool | Description |
|------|-------------|
| `list_modules` | List enabled modules with one-line descriptions |
| `describe_module` | Full argument help for a named module |
| `run_module` | Run a module — pass `--input`, `--output`, and any params as CLI flags |
| `get_image_info` | Read image header (dimensions, spacing, data type, orientation) |

### Viewer tools

Requires the bisweb dev server to be running: `gulp serve` (port 8080).
The MCP server starts a local HTTP file server on port 9999 to serve image
files to the browser.

| Tool | Viewer | Required params | Optional params |
|------|--------|-----------------|-----------------|
| `open_viewer` | `viewer.html` | `image` | `overlay` |
| `open_editor` | `editor.html` | `image` | `overlay` |
| `open_overlay_viewer` | `overlayviewer.html` | `image`, `overlay` | — |
| `open_dual_viewer` | `dualviewer.html` | `image`, `image2` | `overlay`, `overlay2` |

All file paths must be absolute.

## Running `run_module`

Call `describe_module` first to see the exact argument names, then pass them
as CLI flags in the `args` object:

```json
{
  "module": "smoothimage",
  "args": {
    "--input":  "/abs/path/in.nii.gz",
    "--output": "/abs/path/out.nii.gz",
    "--sigma":  "2.0",
    "--inmm":   "true"
  }
}
```

Add `"--debug": "true"` for verbose output or `"--slicerprogress": "true"`
for structured progress messages.

## Configuration

| Environment variable | Default | Purpose |
|---------------------|---------|---------|
| `BISWEB_PORT` | `8080` | Port where the bisweb dev server is running |
| `BISWEB_FILE_PORT` | `9999` | Port for the MCP HTTP file server |
| `BISWEB_ALLOWED_DIRS` | `$HOME` | Colon-separated roots the file server may serve |

## Updating

After a bisweb rebuild, regenerate the cache to pick up new or changed modules:

```bash
node mcp/update_cache.js
```

This adds any new modules to `module_config.json` with `enable: false` and
never changes existing entries, so your settings are preserved.
