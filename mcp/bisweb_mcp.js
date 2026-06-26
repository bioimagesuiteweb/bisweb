#!/usr/bin/env node
'use strict';

const path   = require('path');
const fs     = require('fs');
const net    = require('net');
const { spawn, exec } = require('child_process');

const { Server }   = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SRC_DIR     = path.resolve(__dirname, '..');
const BISWEB_JS   = path.join(SRC_DIR, 'js/bin/bisweb.js');
const GULP_BIN    = path.join(SRC_DIR, 'node_modules/.bin/gulp');
const CACHE_FILE  = path.join(__dirname, 'module_cache.json');
const CONFIG_FILE = path.join(__dirname, 'module_config.json');
const TMP_DIR     = path.join(SRC_DIR, 'tmp');
const VIEWER_PORT = parseInt(process.env.BISWEB_PORT || '8080', 10);

// ---------------------------------------------------------------------------
// Load cache + config at startup
// ---------------------------------------------------------------------------
if (!fs.existsSync(CACHE_FILE)) {
    console.error('module_cache.json not found. Run: node mcp/update_cache.js');
    process.exit(1);
}
if (!fs.existsSync(CONFIG_FILE)) {
    console.error('module_config.json not found. Run: node mcp/update_cache.js');
    process.exit(1);
}

const cache  = JSON.parse(fs.readFileSync(CACHE_FILE,  'utf8'));
const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

const enabledModules = Object.entries(config.modules)
    .filter(([, v]) => v.enable === true)
    .map(([name]) => name)
    .filter(name => cache.modules[name]);

console.error(`bisweb MCP: ${enabledModules.length} modules enabled (bisweb ${cache.bisweb_version})`);

// ---------------------------------------------------------------------------
// tmp directory — for files that need to be served by gulp's web server
// ---------------------------------------------------------------------------
fs.mkdirSync(TMP_DIR, { recursive: true });

// Track files copied into tmp so we can clean up on exit
const tmpFiles = new Set();

function copyToTmp(absPath) {
    const basename = path.basename(absPath);
    const dest     = path.join(TMP_DIR, basename);
    fs.copyFileSync(absPath, dest);
    tmpFiles.add(dest);
    return `http://localhost:${VIEWER_PORT}/tmp/${basename}`;
}

function cleanupTmp() {
    for (const f of tmpFiles) {
        try { fs.unlinkSync(f); } catch(_) {}
    }
    tmpFiles.clear();
    try { fs.rmdirSync(TMP_DIR); } catch(_) {}
}

process.on('exit',    cleanupTmp);
process.on('SIGINT',  () => { cleanupTmp(); process.exit(0); });
process.on('SIGTERM', () => { cleanupTmp(); process.exit(0); });

// ---------------------------------------------------------------------------
// gulp serve — start if not already running on VIEWER_PORT
// ---------------------------------------------------------------------------
function isPortInUse(port) {
    return new Promise(resolve => {
        const s = net.createConnection({ port, host: '127.0.0.1' });
        s.once('connect', () => { s.destroy(); resolve(true);  });
        s.once('error',   () => { s.destroy(); resolve(false); });
    });
}

async function ensureGulpServe() {
    if (await isPortInUse(VIEWER_PORT)) {
        console.error(`bisweb: dev server already running on port ${VIEWER_PORT}`);
        return;
    }
    console.error(`bisweb: starting gulp serve on port ${VIEWER_PORT}...`);
    const gulp = spawn(GULP_BIN, ['serve'], {
        cwd:      SRC_DIR,
        detached: false,
        stdio:    ['ignore', 'ignore', 'ignore']
    });
    gulp.unref();

    // Wait up to 10s for the server to come up
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (await isPortInUse(VIEWER_PORT)) {
            console.error(`bisweb: dev server ready on port ${VIEWER_PORT}`);
            return;
        }
    }
    console.error(`bisweb: WARNING — dev server did not respond on port ${VIEWER_PORT} after 10s`);
}

// ---------------------------------------------------------------------------
// Viewer URL helpers
// ---------------------------------------------------------------------------
function viewerUrl(page, params) {
    const base  = `http://localhost:${VIEWER_PORT}/web/${page}`;
    const query = Object.entries(params)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${encodeURIComponent(copyToTmp(v))}`)
        .join('&');
    return query ? `${base}?${query}` : base;
}

function openBrowser(url) {
    const cmd = process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    exec(cmd);
    return url;
}

// ---------------------------------------------------------------------------
// Helper: run bisweb.js as subprocess
// ---------------------------------------------------------------------------
function runBisweb(args) {
    return new Promise((resolve) => {
        const proc = spawn('node', [BISWEB_JS, ...args], { cwd: SRC_DIR });
        let out = '';
        proc.stdout.on('data', d => { out += d; });
        proc.stderr.on('data', d => { out += d; });
        proc.on('close', code => resolve({ exitCode: code, output: out }));
    });
}

// ---------------------------------------------------------------------------
// Viewer tool definitions
// ---------------------------------------------------------------------------
const VIEWER_NOTE = 'The MCP server starts gulp serve automatically if needed.';

const IMAGE_OVERLAY_SCHEMA = {
    type: 'object',
    properties: {
        image:   { type: 'string', description: 'Absolute path to the image file' },
        overlay: { type: 'string', description: 'Absolute path to an optional overlay image' }
    },
    required: ['image']
};

const DUAL_SCHEMA = {
    type: 'object',
    properties: {
        image:    { type: 'string', description: 'Absolute path to the first image' },
        image2:   { type: 'string', description: 'Absolute path to the second image' },
        overlay:  { type: 'string', description: 'Absolute path to an optional overlay for the first viewer' },
        overlay2: { type: 'string', description: 'Absolute path to an optional overlay for the second viewer' }
    },
    required: ['image', 'image2']
};

const OVERLAY_SCHEMA = {
    type: 'object',
    properties: {
        image:   { type: 'string', description: 'Absolute path to the anatomical image' },
        overlay: { type: 'string', description: 'Absolute path to the functional / statistical overlay image' }
    },
    required: ['image', 'overlay']
};

const VIEWER_TOOLS = [
    {
        name: 'open_viewer',  aliases: ['displayImage'],
        page: 'viewer.html',  paramKeys: ['image','overlay'],
        description: `Open the BioImage Suite orthogonal viewer in a browser tab. ${VIEWER_NOTE}`,
        inputSchema: IMAGE_OVERLAY_SCHEMA
    },
    {
        name: 'open_editor',  aliases: ['editImage'],
        page: 'editor.html',  paramKeys: ['image','overlay'],
        description: `Open the BioImage Suite image editor (paint / ROI tool) in a browser tab. ${VIEWER_NOTE}`,
        inputSchema: { ...IMAGE_OVERLAY_SCHEMA, properties: { ...IMAGE_OVERLAY_SCHEMA.properties,
            overlay: { type: 'string', description: 'Absolute path to an optional objectmap / ROI file' } } }
    },
    {
        name: 'open_overlay_viewer',  aliases: ['displayOverlay'],
        page: 'overlayviewer.html',   paramKeys: ['image','overlay'],
        description: `Open the BioImage Suite overlay viewer (mosaic / functional overlay) in a browser tab. ${VIEWER_NOTE}`,
        inputSchema: OVERLAY_SCHEMA
    },
    {
        name: 'open_dual_viewer',  aliases: ['dualDisplayImage'],
        page: 'dualviewer.html',   paramKeys: ['image','image2','overlay','overlay2'],
        description: `Open the BioImage Suite dual viewer (two linked orthogonal viewers) in a browser tab. ${VIEWER_NOTE}`,
        inputSchema: DUAL_SCHEMA
    },
];

const VIEWER_BY_NAME = {};
for (const vt of VIEWER_TOOLS) {
    VIEWER_BY_NAME[vt.name] = vt;
    for (const alias of vt.aliases) {
        VIEWER_BY_NAME[alias] = { ...vt, name: alias, description: `Alias for ${vt.name}. ${vt.description}` };
    }
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------
const server = new Server(
    { name: 'bisweb', version: cache.bisweb_version },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = [];

    tools.push({
        name: 'list_modules',
        description: 'List all enabled bisweb processing modules with one-line descriptions.',
        inputSchema: { type: 'object', properties: {}, required: [] }
    });
    tools.push({
        name: 'describe_module',
        description: 'Return the full usage / options help for a named bisweb module.',
        inputSchema: {
            type: 'object',
            properties: { module: { type: 'string', description: 'Module name (from list_modules)' } },
            required: ['module']
        }
    });
    tools.push({
        name: 'run_module',
        description: 'Run a bisweb processing module. Use describe_module first to learn the required arguments.',
        inputSchema: {
            type: 'object',
            properties: {
                module: { type: 'string', description: 'Module name' },
                args: {
                    type: 'object',
                    description: 'CLI flags and values, e.g. { "--input": "/path/in.nii.gz", "--output": "/path/out.nii.gz", "--sigma": "2.0" }',
                    additionalProperties: { type: 'string' }
                }
            },
            required: ['module', 'args']
        }
    });
    tools.push({
        name: 'get_image_info',
        description: 'Return header information (dimensions, spacing, data type, orientation) for a NIfTI image file.',
        inputSchema: {
            type: 'object',
            properties: { path: { type: 'string', description: 'Absolute path to the image file' } },
            required: ['path']
        }
    });

    for (const vt of Object.values(VIEWER_BY_NAME)) {
        tools.push({ name: vt.name, description: vt.description, inputSchema: vt.inputSchema });
    }

    return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'list_modules') {
        if (enabledModules.length === 0)
            return { content: [{ type: 'text', text: 'No modules are enabled. Edit mcp/module_config.json and set enable: true for the modules you want.' }] };
        const lines = enabledModules.map(m => `${m.padEnd(35)} ${cache.modules[m].oneliner}`);
        return { content: [{ type: 'text', text: lines.join('\n') }] };
    }

    if (name === 'describe_module') {
        const mod = args.module.toLowerCase();
        if (!cache.modules[mod])
            return { content: [{ type: 'text', text: `Unknown module: ${args.module}` }], isError: true };
        if (!enabledModules.includes(mod))
            return { content: [{ type: 'text', text: `Module "${mod}" exists but is not enabled in module_config.json` }], isError: true };
        return { content: [{ type: 'text', text: cache.modules[mod].help }] };
    }

    if (name === 'run_module') {
        const mod = args.module.toLowerCase();
        if (!enabledModules.includes(mod))
            return { content: [{ type: 'text', text: `Module "${mod}" is not enabled. Check module_config.json.` }], isError: true };
        const flags = [];
        for (const [flag, value] of Object.entries(args.args || {})) flags.push(flag, value);
        const { exitCode, output } = await runBisweb([args.module, ...flags]);
        return { content: [{ type: 'text', text: output }], isError: exitCode !== 0 };
    }

    if (name === 'get_image_info') {
        const { exitCode, output } = await runBisweb(['headerinfo', '--input', args.path]);
        return { content: [{ type: 'text', text: output }], isError: exitCode !== 0 };
    }

    if (VIEWER_BY_NAME[name]) {
        const vt     = VIEWER_BY_NAME[name];
        const params = {};
        for (const key of vt.paramKeys) if (args[key]) params[key] = args[key];
        const url = viewerUrl(vt.page, params);

        openBrowser(url);
        return { content: [{ type: 'text', text: `Opened ${vt.page.replace('.html','')}: ${url}` }] };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function main() {
    await ensureGulpServe();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(e => { console.error(e); process.exit(1); });
