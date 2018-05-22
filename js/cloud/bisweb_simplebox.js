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

// Unfinished, untested, ..

"use strict";

const $=require('jQuery');

/* global Box */

//const keys = require('bis_keystore.js');


/**
 * bisBox namespace. Utility code to read/write to Box
 * @namespace bisBox
 */

/**
 * Initializes the Box api by embedding the Box API and app key into the page.
 * @alias bisBox.init
 *
 */

let initialized=false;

let init = function() {

    if (initialized)
        return Promise.resolve();
    
    return new Promise( (resolve,reject) => {

        $('head').append('<link rel="stylesheet" type="text/css" href="https://cdn01.boxcdn.net/platform/elements/4.4.0/en-US/picker.css"');
        

        
        //embed the dropbox dropins into head
        let apiTag = document.createElement('script');
        apiTag.src="https://cdn01.boxcdn.net/platform/elements/4.4.0/en-US/picker.js";
        document.head.appendChild(apiTag);
        apiTag.onload = ( () => {
            console.log('loaded onedrive js');
            initialized=true;
            resolve();
        });
        apiTag.onerror = ( () => {
            reject('Failed to load dropbox');
        });
    });
};

/**
 * Opens Box Picker to select a file to load. 
 * @alias bisBox.pickReadFile
 * @param {object} opts - the file options object 
 * @param {string} opts.title - if in file mode and file set the title of the file dialog
 * @param {boolean} opts.save - if in file mode and file determine load or save
 * @param {string} opts.defaultpath - if in file mode and file use this as original filename
 * @param {string} opts.filter - if in file mode and file use this to filter file style
 * @param {string} opts.suffix - used to create filter if present (simplified version)
 * @param {function} callback - callback to call when done
 */
let pickReadFile = function(fileopts,callback) {

    fileopts = fileopts || {};
    fileopts.save = false;
    fileopts.title = fileopts.title || 'Specify filename';
    fileopts.defaultpath = fileopts.defaultpath || '';
    
    let s=[];
    let s2=( fileopts.suffix || '' ).split(",");
    for (let i=0;i<s2.length;i++) {
        if (s2[i].indexOf(".")!==0)
            s.push("."+s2[i]);
        else
            s.push(s2[i]);

    }

    let folderId=null;
    let accessToken=null;
    
    init().then( () => {

        let filePicker = new Box.FilePicker();
        filePicker.show(folderId, accessToken, {
            container: '#viewerwidget'
        });
        callback();
    });
};

module.exports = {
    pickReadFile : pickReadFile,
};

init();
