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

/* global OneDrive */

const keys = require('bis_keystore.js');

/*let url=window.document.URL;
let index=url.indexOf(".html");
let url2=url.substr(0,index);
let index2=url2.lastIndexOf("/");
const redirectURL=url2.substr(0,index2+1)+'onedriveredirect.html';
console.log('redirect=',redirectURL);*/



/**
 * bisOneDrive namespace. Utility code to read/write to OneDrive
 * @namespace bisOneDrive
 */

/**
 * Initializes the OneDrive api by embedding the OneDrive API and app key into the page.
 * @alias bisOneDrive.init
 *
 */

let initialized=false;

let init = function() {

    if (initialized)
        return Promise.resolve();
    
    return new Promise( (resolve,reject) => {
        //embed the dropbox dropins into head
        let apiTag = document.createElement('script');
        apiTag.src="https://js.live.net/v7.2/OneDrive.js";
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
 * Opens OneDrive Picker to select a file to load. 
 * @alias bisOneDrive.pickReadFile
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

        var odOptions = {
            clientId: keys.OneDriveKey,
            action: "download",
            multiSelect: false,
            success: function(fobj) {
                let obj=fobj.value[0];
                //                console.log(JSON.stringify(obj,null,2));
                let fname=obj['@microsoft.graph.downloadUrl']+'?=realname='+obj.name;
                //                console.log('fname=',fname);
                callback(fname);
            },
            cancel: function() {
            },
            error: function(e) {
                console.log(e);
            },
            
            linkType: "direct", 
            multiselect: false, 
            filter: s,
        };

        OneDrive.open(odOptions);
    });
    
};


let pickWriteFile=function(url,filename,callback) {

    init().then( () => {

        filename='a.nii.gz';
        console.log('url=',url,filename);
        
        let options = {
            clientId: keys.OneDriveKey,
            action: "save",
            file: url,
            fileName: filename,
            openInNewWindow: false,
            advanced: {},
            success: function(files) { callback('done',files); },
            progress: function(p) { console.log(p); },
            cancel: function() { /* cancel handler */ },
            error: function(e) { console.log('error',e); }
        };
        
        
        
        OneDrive.save(options);
    });

};

module.exports = {
    pickReadFile : pickReadFile,
    pickWriteFile : pickWriteFile,
};


