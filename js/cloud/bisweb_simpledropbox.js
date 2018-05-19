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

/* global Dropbox */

const keys = require('bis_keystore.js');


/**
 * bisDropbox namespace. Utility code to read/write to Dropbox
 * @namespace bisDropbox
 */

/**
 * Initializes the Dropbox api by embedding the Dropbox API and app key into the page.
 * @alias bisDropbox.init
 *
 */

let initialized=false;

let init = function() {

    if (initialized)
        return Promise.resolve();
    
    return new Promise( (resolve,reject) => {
        //embed the dropbox dropins into head
        let apiTag = document.createElement('script');
        apiTag.src = 'https://www.dropbox.com/static/api/2/dropins.js';
        apiTag.setAttribute('id', 'dropboxjs');
        apiTag.setAttribute('data-app-key', keys.DropboxAppKey);
        
        document.head.appendChild(apiTag);
        apiTag.onload = ( () => {
            console.log('loaded dropbox dropins');
            initialized=true;
            resolve();
        });
        apiTag.onerror = ( () => {
            reject('Failed to load dropbox');
        });
    });
};

/**
 * Opens Dropbox Picker to select a file to load. 
 * @alias bisDropbox.pickReadFile
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

    init().then( () => {

	var doptions = {
	    
	    success: function(files) {
		callback(files[0].link);
            },
	    cancel: function() {
	    },
	    
	    linkType: "direct", 
	    multiselect: false, 
	    extensions: s,
	};
	Dropbox.choose(doptions);
    });
    
};


module.exports = {
    pickReadFile : pickReadFile,
};

init();
