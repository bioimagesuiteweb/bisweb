/*  LICENSE

 _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._

 BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");

 - you may not use this software except in compliance with the License.
 - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

 __Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.__

 ENDLICENSE */

"use strict";

const { contextBridge, ipcRenderer, webFrame } = require('electron');
const remote = require('@electron/remote');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const glob = require('glob');
const rimraf = require('rimraf');
const child_process = require('child_process');
const colors = require('colors/safe');

// Create wrapped versions of Node modules that can be exposed via contextBridge
// contextBridge requires all exposed values to be serializable or functions

const fsAPI = {
    readFileSync: (filepath, options) => fs.readFileSync(filepath, options),
    writeFileSync: (filepath, data, options) => fs.writeFileSync(filepath, data, options),
    readFile: (filepath, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        fs.readFile(filepath, options, callback);
    },
    writeFile: (filepath, data, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        fs.writeFile(filepath, data, options, callback);
    },
    existsSync: (filepath) => fs.existsSync(filepath),
    statSync: (filepath) => {
        const stat = fs.statSync(filepath);
        return {
            isFile: () => stat.isFile(),
            isDirectory: () => stat.isDirectory(),
            size: stat.size,
            mtime: stat.mtime,
            ctime: stat.ctime,
        };
    },
    stat: (filepath, callback) => fs.stat(filepath, callback),
    readdirSync: (dirpath, options) => fs.readdirSync(dirpath, options),
    readdir: (dirpath, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        fs.readdir(dirpath, options, callback);
    },
    mkdirSync: (dirpath, options) => fs.mkdirSync(dirpath, options),
    mkdir: (dirpath, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        fs.mkdir(dirpath, options, callback);
    },
    unlinkSync: (filepath) => fs.unlinkSync(filepath),
    unlink: (filepath, callback) => fs.unlink(filepath, callback),
    renameSync: (oldPath, newPath) => fs.renameSync(oldPath, newPath),
    rename: (oldPath, newPath, callback) => fs.rename(oldPath, newPath, callback),
    copyFileSync: (src, dest) => fs.copyFileSync(src, dest),
    createReadStream: (filepath, options) => fs.createReadStream(filepath, options),
    createWriteStream: (filepath, options) => fs.createWriteStream(filepath, options),
    watch: (filepath, options, listener) => fs.watch(filepath, options, listener),
    lstatSync: (filepath) => {
        const stat = fs.lstatSync(filepath);
        return {
            isFile: () => stat.isFile(),
            isDirectory: () => stat.isDirectory(),
            isSymbolicLink: () => stat.isSymbolicLink(),
            size: stat.size,
        };
    },
};

const pathAPI = {
    join: (...args) => path.join(...args),
    resolve: (...args) => path.resolve(...args),
    dirname: (filepath) => path.dirname(filepath),
    basename: (filepath, ext) => path.basename(filepath, ext),
    extname: (filepath) => path.extname(filepath),
    normalize: (filepath) => path.normalize(filepath),
    isAbsolute: (filepath) => path.isAbsolute(filepath),
    relative: (from, to) => path.relative(from, to),
    parse: (filepath) => path.parse(filepath),
    format: (pathObject) => path.format(pathObject),
    sep: path.sep,
    delimiter: path.delimiter,
};

const osAPI = {
    platform: () => os.platform(),
    homedir: () => os.homedir(),
    tmpdir: () => os.tmpdir(),
    hostname: () => os.hostname(),
    type: () => os.type(),
    arch: () => os.arch(),
    cpus: () => os.cpus(),
    totalmem: () => os.totalmem(),
    freemem: () => os.freemem(),
    EOL: os.EOL,
};

const zlibAPI = {
    gunzipSync: (buffer) => zlib.gunzipSync(buffer),
    gzipSync: (buffer) => zlib.gzipSync(buffer),
    gunzip: (buffer, callback) => zlib.gunzip(buffer, callback),
    gzip: (buffer, callback) => zlib.gzip(buffer, callback),
    deflateSync: (buffer) => zlib.deflateSync(buffer),
    inflateSync: (buffer) => zlib.inflateSync(buffer),
    deflate: (buffer, callback) => zlib.deflate(buffer, callback),
    inflate: (buffer, callback) => zlib.inflate(buffer, callback),
};

const globAPI = {
    sync: (pattern, options) => glob.sync(pattern, options),
    glob: (pattern, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        glob(pattern, options, callback);
    },
};

const rimrafAPI = {
    sync: (filepath) => rimraf.sync(filepath),
    rimraf: (filepath, callback) => rimraf(filepath, callback),
};

const childProcessAPI = {
    execSync: (command, options) => child_process.execSync(command, options),
    exec: (command, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        return child_process.exec(command, options, callback);
    },
    spawn: (command, args, options) => child_process.spawn(command, args, options),
    spawnSync: (command, args, options) => child_process.spawnSync(command, args, options),
};

const colorsAPI = {
    red: (text) => colors.red(text),
    green: (text) => colors.green(text),
    blue: (text) => colors.blue(text),
    yellow: (text) => colors.yellow(text),
    cyan: (text) => colors.cyan(text),
    magenta: (text) => colors.magenta(text),
    white: (text) => colors.white(text),
    gray: (text) => colors.gray(text),
    bold: (text) => colors.bold(text),
};

const dialogAPI = {
    showOpenDialog: (browserWindowOrOptions, options) => {
        // Handle both (options) and (browserWindow, options) call patterns
        if (options === undefined) {
            return remote.dialog.showOpenDialog(browserWindowOrOptions);
        }
        // If browserWindow is null, just use options
        if (browserWindowOrOptions === null) {
            return remote.dialog.showOpenDialog(options);
        }
        return remote.dialog.showOpenDialog(browserWindowOrOptions, options);
    },
    showSaveDialog: (browserWindowOrOptions, options) => {
        if (options === undefined) {
            return remote.dialog.showSaveDialog(browserWindowOrOptions);
        }
        if (browserWindowOrOptions === null) {
            return remote.dialog.showSaveDialog(options);
        }
        return remote.dialog.showSaveDialog(browserWindowOrOptions, options);
    },
    showMessageBox: (browserWindowOrOptions, options) => {
        if (options === undefined) {
            return remote.dialog.showMessageBox(browserWindowOrOptions);
        }
        if (browserWindowOrOptions === null) {
            return remote.dialog.showMessageBox(options);
        }
        return remote.dialog.showMessageBox(browserWindowOrOptions, options);
    },
    showErrorBox: (title, content) => remote.dialog.showErrorBox(title, content),
};

const ipcAPI = {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    on: (channel, listener) => {
        ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
    },
    once: (channel, listener) => {
        ipcRenderer.once(channel, (event, ...args) => listener(event, ...args));
    },
    removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
};

const remoteAPI = {
    getCurrentWindow: () => {
        const win = remote.getCurrentWindow();
        return {
            toggleDevTools: () => win.webContents.toggleDevTools(),
            openDevTools: () => win.webContents.openDevTools(),
            closeDevTools: () => win.webContents.closeDevTools(),
            isDevToolsOpened: () => win.webContents.isDevToolsOpened(),
            minimize: () => win.minimize(),
            maximize: () => win.maximize(),
            close: () => win.close(),
            setTitle: (title) => win.setTitle(title),
            getTitle: () => win.getTitle(),
        };
    },
};

const electronAPI = {
    webFrame: {
        setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
        getZoomFactor: () => webFrame.getZoomFactor(),
        setZoomLevel: (level) => webFrame.setZoomLevel(level),
        getZoomLevel: () => webFrame.getZoomLevel(),
    },
};

// Buffer utilities - since Buffer can't be directly exposed
const bufferAPI = {
    from: (data, encoding) => {
        const buf = Buffer.from(data, encoding);
        return buf;
    },
    alloc: (size, fill, encoding) => {
        const buf = Buffer.alloc(size, fill, encoding);
        return buf;
    },
    allocUnsafe: (size) => {
        const buf = Buffer.allocUnsafe(size);
        return buf;
    },
    isBuffer: (obj) => Buffer.isBuffer(obj),
    byteLength: (string, encoding) => Buffer.byteLength(string, encoding),
    concat: (list, totalLength) => Buffer.concat(list, totalLength),
};

// Expose APIs to renderer via contextBridge
contextBridge.exposeInMainWorld('BISELECTRON', {
    version: '2.0',
    bispath: __dirname,

    // Node modules (wrapped)
    fs: fsAPI,
    path: pathAPI,
    os: osAPI,
    zlib: zlibAPI,
    glob: globAPI,
    rimraf: rimrafAPI,
    child_process: childProcessAPI,
    colors: colorsAPI,

    // Electron APIs (wrapped)
    dialog: dialogAPI,
    ipc: ipcAPI,
    remote: remoteAPI,
    electron: electronAPI,

    // Buffer utilities
    Buffer: bufferAPI,

    // Utility to create actual Buffer from Uint8Array (for compatibility)
    createBuffer: (data) => Buffer.from(data),

    // Check if running in Electron
    isElectron: true,
});

// Set zoom factor on load
process.once('loaded', () => {
    webFrame.setZoomFactor(1.0);
});
