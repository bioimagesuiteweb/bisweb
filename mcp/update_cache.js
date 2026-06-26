#!/usr/bin/env node
'use strict';

// Builds module_cache.json and seeds module_config.json.
// Uses bisweb internals directly — this script runs in the source tree only.
// Run with: node mcp/update_cache.js

const path = require('path');
const fs   = require('fs');

require(path.join(__dirname, '../config/bisweb_pathconfig.js'));
const modules = require('nodemoduleindex.js');

const cacheFile  = path.join(__dirname, 'module_cache.json');
const configFile = path.join(__dirname, 'module_config.json');

// Load existing config so we preserve user's enable flags
let existingConfig = { modules: {} };
if (fs.existsSync(configFile)) {
    existingConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
}

const appinfo = require(path.join(__dirname, '../package.json'));

const cache = {
    generated:      new Date().toISOString(),
    bisweb_version: appinfo.version,
    modules:        {}
};

const names = modules.getModuleNames().sort();
console.log(`Found ${names.length} modules. Building cache...`);

for (const name of names) {
    let mod, desc;
    try {
        mod  = modules.getModule(name);
        desc = mod.getDescription();
    } catch(e) {
        console.warn(`  SKIP ${name}: ${e.message}`);
        continue;
    }

    // Build a compact help summary from getDescription() fields
    const lines = [`Usage: node bisweb.js ${name} [options]`, '', 'Options:'];

    for (const inp of desc.inputs) {
        const req = inp.required ? `<s>` : `[s]`;
        const sn  = inp.shortname ? `-${inp.shortname} ` : '';
        lines.push(`  ${sn}--${inp.varname.toLowerCase()} ${req}   ${inp.description}`);
    }
    for (const out of desc.outputs) {
        const req = out.required ? `<s>` : `[s]`;
        const sn  = out.shortname ? `-${out.shortname} ` : '';
        lines.push(`  ${sn}--${out.varname.toLowerCase()} ${req}   ${out.description}`);
    }
    for (const p of desc.params) {
        let detail = p.description;
        if (p.default !== undefined) detail += ` (default=${p.default})`;
        if (p.low !== undefined && p.high !== undefined) detail += `, range=${p.low}:${p.high}`;
        if (p.restrictAnswer) detail += `, values=[${p.restrictAnswer.join(',')}]`;
        const t = p.type === 'float' || p.type === 'int' ? 'n' : 's';
        lines.push(`  --${p.varname.toLowerCase()} [${t}]   ${detail}`);
    }

    cache.modules[name] = {
        oneliner: desc.description,
        help:     lines.join('\n')
    };

    // Seed config entry only if not already present
    if (!existingConfig.modules[name]) {
        existingConfig.modules[name] = { enable: false };
    }

    process.stdout.write('.');
}

console.log('\n');

fs.writeFileSync(cacheFile,  JSON.stringify(cache, null, 2));
fs.writeFileSync(configFile, JSON.stringify(existingConfig, null, 2));

console.log(`Wrote ${cacheFile}`);
console.log(`Wrote ${configFile}`);
console.log('Done. Edit module_config.json to set enable: true for modules you want to expose.');
