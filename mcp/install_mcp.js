#!/usr/bin/env node
'use strict';

// Adds the bisweb-mcp entry to Claude Desktop config and builds bisweb.skill.
// Usage: node mcp/install_mcp.js

const path  = require('path');
const fs    = require('fs');
const JSZip = require(require.resolve('jszip', { paths: [ path.join(__dirname, '..') ] }));

const MCP_ENTRY_KEY = 'bisweb-mcp';
const LAUNCHER      = path.join(__dirname, 'run_mcp_server.sh');
const SKILL_MD      = path.join(__dirname, 'SKILL.md');
const SKILL_ZIP     = path.join(__dirname, 'bisweb.skill');
const CLAUDE_CONFIG = path.join(
    process.env.HOME,
    'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'
);

// --- Claude Desktop config ---
const entry = { command: LAUNCHER, args: [] };

let config = {};
if (fs.existsSync(CLAUDE_CONFIG)) {
    try {
        config = JSON.parse(fs.readFileSync(CLAUDE_CONFIG, 'utf8'));
    } catch(e) {
        console.warn(`WARNING: could not parse existing config, will overwrite: ${e.message}`);
    }
}

config.mcpServers = config.mcpServers || {};

if (JSON.stringify(config.mcpServers[MCP_ENTRY_KEY]) === JSON.stringify(entry)) {
    console.log('Claude Desktop config already up to date.');
} else {
    config.mcpServers[MCP_ENTRY_KEY] = entry;
    fs.mkdirSync(path.dirname(CLAUDE_CONFIG), { recursive: true });
    fs.writeFileSync(CLAUDE_CONFIG, JSON.stringify(config, null, 2) + '\n', 'utf8');
    console.log(`Updated ${CLAUDE_CONFIG}`);
    console.log(`Added mcpServers.${MCP_ENTRY_KEY} → ${LAUNCHER}`);
    console.log('Restart Claude Desktop for the bisweb tools to appear.');
}

// --- Build bisweb.skill zip ---
if (!fs.existsSync(SKILL_MD)) {
    console.warn('SKILL.md not found — skipping .skill build');
} else {
    const zip = new JSZip();
    zip.file('SKILL.md', fs.readFileSync(SKILL_MD));
    zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }).then(buf => {
        fs.writeFileSync(SKILL_ZIP, buf);
        console.log(`Built ${SKILL_ZIP}`);
    });
}
