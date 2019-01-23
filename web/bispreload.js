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


/* global  window,Buffer,__dirname */
"use strict";

const electron= require('electron');
const remote=electron.remote;




window.BISELECTRON = {
    // ----------------------------------------------------
    // Add modules here
    // ----------------------------------------------------
    version : '1.0',
    bispath : __dirname,
    fs : require('fs'),
    zlib : require('zlib'),
    path : require('path'),
    os : require('os'),
    glob : require('glob'),
    rimraf : require('rimraf'),
    child_process : require('child_process'),
    colors : require('colors/safe'),
    ipc : electron.ipcRenderer,
    dialog : remote.require('electron').dialog,
    remote : remote,
    Buffer : Buffer,
    electron : electron,
};


process.once('loaded', () => {
    global.electron = require('electron');
    electron.webFrame.setZoomFactor(1.0);
});


window.BISELECTRON.loadtf=((mode) => {

    let tf=null;
    let tfmodulename='electron js';
    let done=false;

    try {
        tf=require('@tensorflow/tfjs');
    } catch(e) {
        console.log('---- no tensorflow modules available');
        return {
            tf : null,
            name : ''
        };
    }


    if (mode>0) {
        
        if (mode>1) {
            try {
                require('@tensorflow/tfjs-node-gpu');
                tfmodulename='electron tjsfs-node-gpu';
                done=true;
            } catch(e) {
                console.log('Failed to load gpu version '+e);
            }
        }

        if (!done) {
            try {
                require('@tensorflow/tfjs-node');
                tfmodulename='electron tfjs-node';
                console.log("Loaded cpu version of tfjs");
            } catch(e) {
                console.log('Failed to load cpu version '+e);
            }
        }
    
        if (done===false) {
            console.log('---- no tensorflow-node.js modules available');
        }
    }
    
    return {
        tf : tf,
        name : tfmodulename
    };

});
