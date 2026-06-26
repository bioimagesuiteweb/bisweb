# BioImage Suite Web — MCP Server Plan

## Overview

An MCP server that lets Claude operate on medical image files by name/path only.
Claude never touches pixel data.

Implementation is split into two phases: Phase 1 (modules/CLI), Phase 2 (viewers).
Viewer tools are stubbed from Phase 1 with a clear "not yet enabled" message.

---

## Deployment Modes

### Mode A — Development (source tree)

Initial target. The MCP server runs directly inside the source tree.

```
source tree (this repo)
  ├── js/bin/bioweb.js          ← CLI / module entry point
  ├── build/web/                ← built web assets (after gulp build)
  │     ├── bislib.js
  │     ├── libbiswasm_wasm.js
  │     └── ...
  ├── web/viewer.html etc.      ← viewer HTML pages
  └── mcp/bisweb_mcp.js         ← MCP server (reads modules via pathconfig)
```

Path resolution: uses `config/bisweb_pathconfig.js` (already sets up module
require paths). The MCP server simply `require`s it at startup.

Dev server (`gulp serve`, port 8080) serves viewer HTML + built assets.

### Mode B — Combined zip (preferred production target)

A new standalone script `mcp/create_zip.js` (run with `node mcp/create_zip.js`) produces a single self-contained zip, calling `gulp build` first if needed but not modifying gulpfile.js:

```
bisweb_mcp_<version>.zip
  web/                      ← viewer HTML + browser bundles (current gulp zip contents)
    viewer.html
    editor.html
    bislib.js
    libbiswasm_wasm.js
    images/, css/, fonts/
    ...
  node/                     ← biswebnode install contents
    bioimagesuiteweblib.js
    bisweb.js
    libbiswasm_wasm.js      (also needed here for node-side WASM)
    ...
  mcp/
    bisweb_mcp.js
    package.json
    node_modules/           ← @modelcontextprotocol/sdk, mime-types
  README_MCP.md             ← setup instructions
```

User workflow:
1. Unzip to any directory
2. Point MCP client (e.g. Claude Desktop) at `mcp/bisweb_mcp.js`
3. Start a static HTTP server on `web/` (or use the built-in one — see below)
4. Everything works with no other installs

The MCP server can optionally serve `web/` itself on `BISWEB_PORT` (default 8080)
so the user doesn't need a separate static server — Phase 2 consideration.

### Mode C — Separate installs (biswebnode + zip)

Fallback for users who already have `biswebnode` installed globally:

| Piece | Source |
|-------|--------|
| `biswebnode` npm package | `npm install -g biswebnode*.tgz` |
| Web app | Existing `bisweb_<version>.zip` served separately |
| MCP server | Installed alongside or pointed at via env var |

### Path resolution strategy (all modes)

```
if BISWEB_SRC is set  → source-tree mode (require config/bisweb_pathconfig.js)
if BISWEB_NODE is set → installed-node mode (require that path directly)
else                  → combined-zip mode (resolve relative to __dirname/../node/)
```

---

## Existing Package Landscape

### `biswebnode` (command-line npm package)

Built by `gulp npmpack` → `biscreatepackagefile.js`:
- `bin: lib/bisweb.js` — the CLI entry point
- `main: lib/bioimagesuiteweblib.js` — programmatic API
- Contains: WASM module (`libbiswasm_wasm.js`), all processing modules, Node.js I/O
- Does **not** contain: HTML viewers, CSS, browser bundles (`bislib.js`), three.js, bootstrap

### `biswebbrowser` (browser component npm package)

Also built by `gulp npmpack` → `createnpmpackage()` in `bis_gulputils.js`:
- Contains: `bislib.js`, `libbiswasm*wasm.js`, CSS, three.js, bootstrap, webcomponents
- `main: dist/bislib.js`
- Intended for embedding bisweb viewers in other web apps

### Web app zip / dev server

- `gulp zip` / `gulp build` → full web app including all HTML viewer pages
- Dev server: `gulp serve` → `http://localhost:8080`
- Viewers: `viewer.html`, `editor.html`, `overlayviewer.html`, `dualviewer.html`,
  `connviewer.html`, etc.
- All viewers support `?image=`, `?overlay=`, `?image2=`, `?load=` URL query params
  (handled by `bisweb_mainviewerapplication.js::parseQueryParameters()`)

---

## MCP Server File Layout

```
mcp/
  PLAN.md           ← this file
  bisweb_mcp.js     ← MCP server (Phase 1: modules; Phase 2: viewers)
  SKILL.md          ← Claude skill for viewer dispatch (Phase 2)
  package.json      ← own dependencies, does not modify root package.json
```

---

## Phase 1: Command-Line Module Tools

The MCP server loads bisweb modules **in-process** (same Node.js process, no subprocess).

### Module execution path (traced from `bisweb.js → loadParse`)

```
1. modules.getModule(toolname)              → module object
2. mod.loadInputs(pseudoCmd, basedir)       → loads BisWebImage/matrix/etc from disk
3. mod.parseValuesAndAddDefaults(pseudoCmd) → normalises params, applies defaults
4. mod.directInvokeAlgorithm(params)        → runs algorithm (returns Promise)
5. mod.saveOutputs(pseudoCmd)               → writes output files to disk
```

`pseudoCmd` is a plain object matching the shape commander produces:
```js
{ input: "/abs/path/in.nii.gz", output: "/abs/path/out.nii.gz",
  sigma: 2.0, inmm: true, debug: false }
```

### Module descriptions

`mod.getDescription()` returns full metadata: name, description, author, inputs,
outputs, params (with types, defaults, ranges, allowed values). The same data
rendered as CLI help (`node bisweb.js <module> -h`) gives Claude everything
needed to construct a valid call:

```
-i --input <s>     input                           (required)
-o --output <s>    The output image filename        (required)
--sigma [n]        ... (default value=1), (Allowed range=0:8)
--inmm [s]         ... (default value=true), (Acceptable values=[true,false])
--debug [s]        Toggles debug logging (default value=false)
```

Note: some module descriptions contain copy-paste errors; treat as advisory.

### Diagnostic flags

| Flag | Where set | Effect |
|------|-----------|--------|
| `debug: true` | in `params` | Verbose `console.log` inside `directInvokeAlgorithm` |
| `slicerprogress` | `bis_slicerprogress` module | Emits XML progress tags to stdout |

Slicer progress XML (emitted when `slicerprogress` is enabled):
```xml
<filter-start><filter-name>bisweb-smooth</filter-name>...</filter-start>
<filter-progress>0.2</filter-progress>
<filter-progress>0.9</filter-progress>
<filter-end><filter-name>bisweb-smooth</filter-name></filter-end>
```

The MCP server hooks `bis_slicerprogress.update` in-process so these become
MCP `notifications/progress` events rather than raw stdout noise.

### Module execution strategy

All modules are invoked by spawning `node bisweb.js <module> [args]` as a
subprocess. This avoids in-process WASM init, commander singleton issues, and
stdout capture complexity. Subprocess overhead (~500ms) is negligible compared
to actual processing time.

### Module description cache

Running `node bisweb.js <module> -h` for each of ~80 modules at query time
would be slow. Instead:

- **`mcp/update_cache.js`** — a standalone script run once (or after a bisweb
  update) that iterates all module names, spawns `node bisweb.js <module> -h`
  for each, and writes results to `mcp/module_cache.json`. Also regenerates
  `mcp/module_config.json` for any modules not already present in it
  (preserving existing enable flags).
- **`mcp/module_cache.json`** — cached `-h` output, checked into the repo.
  Not hand-edited. Structure:
  ```json
  {
    "generated": "2026-06-26T...",
    "bisweb_version": "1.4.1b1",
    "modules": {
      "smoothImage": {
        "oneliner": "This algorithm performs image smoothing using a 2D/3D Gaussian kernel",
        "help": "  Usage: bisweb.js smoothImage [options]\n  Options:\n    ..."
      }
    }
  }
  ```
- **`mcp/module_config.json`** — hand-edited by the user. Controls which modules
  are exposed to Claude. All modules default to `enable: false` so the set
  starts small and is deliberately expanded. Structure:
  ```json
  {
    "modules": {
      "smoothImage":          { "enable": false },
      "headerinfo":           { "enable": false },
      "linearregistration":   { "enable": false },
      "segmentimage":         { "enable": false },
      "bisserver":            { "enable": false },
      ...
    }
  }
  ```
  When `update_cache.js` runs it adds any newly discovered modules with
  `enable: false`, and never removes or changes existing entries — so user
  edits are preserved across rebuilds.
- The MCP server loads both files at startup. Only modules with `enable: true`
  in `module_config.json` are registered as MCP tools.
- `update_cache.js` is run directly: `node mcp/update_cache.js`. No gulp
  involvement — run it manually after a bisweb build or module changes.

### Phase 1 MCP Tools

| Tool | Description |
|------|-------------|
| `list_modules` | All module names + one-line descriptions, served from cache |
| `describe_module` | Full `-h` help text for a named module, served from cache |
| `run_module` | Spawn `node bisweb.js <module> [args]`, stream stdout/stderr back |
| `get_image_info` | Convenience wrapper: spawns `node bisweb.js headerinfo --input <path>` |

**`run_module` input schema:**
```json
{
  "module":  "smoothImage",
  "args": {
    "--input":  "/abs/path/in.nii.gz",
    "--output": "/abs/path/out.nii.gz",
    "--sigma":  "2.0",
    "--inmm":   "true",
    "--debug":  "false",
    "--slicerprogress": "true"
  }
}
```

Args are passed directly as command-line flags. Claude constructs them from
the `describe_module` help text.

Returns: `{ success, exitCode, output }` — `output` is merged stdout+stderr.

---

## Phase 2: Viewer Tools (scaffolded from start, implemented later)

### How viewers load files

Viewers run in the browser at `http://localhost:8080`. They fetch image data
via HTTP, so local files must be served over HTTP. The MCP server runs a small
HTTP file server (port 9999) with CORS headers alongside its stdio transport.

File path → browser-fetchable URL:
```
/abs/path/img.nii.gz  →  http://localhost:9999/file?path=%2Fabs%2Fpath%2Fimg.nii.gz
```

Viewer URL construction example:
```
http://localhost:8080/viewer.html?image=http%3A%2F%2Flocalhost%3A9999%2Ffile%3Fpath%3D...
```

Opened with `open <url>` (macOS) or `xdg-open` (Linux).

### Viewer → HTML page mapping

| Tool | HTML page | Query params supported |
|------|-----------|------------------------|
| `open_viewer` | `viewer.html` | `image`, `overlay` |
| `open_editor` | `editor.html` | `image`, `overlay` |
| `open_overlay_viewer` | `overlayviewer.html` | `image`, `overlay` |
| `open_dual_viewer` | `dualviewer.html` | `image`, `image2` |
| `open_connectivity_viewer` | `connviewer.html` | `species` (human\|mouse) |

All handled by `bisweb_mainviewerapplication.js::parseQueryParameters()`.

### Phase 2 MCP Tools (stubbed in Phase 1, implemented in Phase 2)

| Tool | Status in Phase 1 |
|------|-------------------|
| `open_viewer` | Stub — returns error "viewer support not yet enabled" |
| `open_editor` | Stub |
| `open_overlay_viewer` | Stub |
| `open_dual_viewer` | Stub |
| `open_connectivity_viewer` | Stub |

### HTTP File Server (Phase 2)

Route: `GET /file?path=<absolute-path>`
- Streams file with correct `Content-Type`
- `Access-Control-Allow-Origin: *`
- Path must resolve inside allowed-roots whitelist
- No directory listing, no execution

---

## SKILL.md — Viewer Dispatch (Phase 2)

Trigger: "open / show / view / display `<file>`", "compare `<f1>` and `<f2>`",
"edit / segment / paint `<file>`", "overlay `<func>` on `<anat>`"

| Intent | Tool |
|--------|------|
| view a single image | `open_viewer` |
| image + functional overlay | `open_overlay_viewer` |
| compare two images side-by-side | `open_dual_viewer` |
| draw / segment / paint ROI | `open_editor` |
| fMRI connectivity matrix | `open_connectivity_viewer` |

---

## Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.x",
  "mime-types": "^2.x"
}
```

Installed in `mcp/` only — does not modify root `package.json`.

The MCP server requires `biswebnode` to be built/installed (for Phase 1) and
`gulp serve` or a built zip deployed to a web server (for Phase 2).

---

## Configuration (environment variables)

| Variable | Default | Purpose |
|----------|---------|---------|
| `BISWEB_PORT` | `8080` | Web app / dev server port (Phase 2) |
| `BISWEB_FILE_PORT` | `9999` | MCP HTTP file server port (Phase 2) |
| `BISWEB_ALLOWED_DIRS` | `$HOME` | Colon-separated roots the file server may serve |

---

## Security Notes

- File server: read-only streaming, no execution, no directory listing
- Path traversal blocked: resolved path must be inside an allowed root
- Localhost-only, same-machine trust model — no authentication
