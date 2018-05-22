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

const dbox = require('dropbox');
const keys = require('bis_keystore.js');
const genericio = require('bis_genericio.js');

/**
 * bisDropbox namespace. Utility code to read/write to Dropbox
 * @namespace bisDropbox
 */

/**
 * Initializes the Dropbox api by embedding the Dropbox API and app key into the page.
 * @alias bisDropbox.init
 *
 */
let init = function() {

    return new Promise( (resolve,reject) => {
        //embed the dropbox dropins into head
        let apiTag = document.createElement('script');
        apiTag.src = 'https://www.dropbox.com/static/api/2/dropins.js';
        apiTag.setAttribute('id', 'dropboxjs');
        apiTag.setAttribute('data-app-key', keys.DropboxAppKey);
        
        window.addEventListener('storage', function(){ console.log('heard storage event'); });
        document.head.appendChild(apiTag);
        apiTag.onload = ( () => {
            console.log('loaded dropbox dropins');
            resolve();
        });
        apiTag.onerror = ( () => {
            reject('Failed to load dropbox');
        });
    });
};

/** 
 * Launches the Dropbox authorization (OAuth 2.0) and opens a new window to catch the redirect from the flow. 
 * @alias bisDropbox.auth
 */
let auth = function() {
    let box = new dbox({ clientId : keys.DropboxAppKey });
    let parsedURL = window.location.href.split('/');


    //small hack to make it so bisweb's various endpoints use a same-origin biswebdropbox.html.
    //this is necessary to ensure that the windows share the same localStorage.
    parsedURL[parsedURL.length - 1] = 'biswebdropbox.html';
    let url = parsedURL.join('/');

    console.log('url', url);
    let authUrl = box.getAuthenticationUrl(url);
    window.open(authUrl, '', 'width=500, height=500');
};

/**
 * Lists all files on the user's Dropbox account. 
 * @alias bisDropbox.listFiles
 */
let listFiles = function() {
    queryLocalToken().then( (response) => {
        let box = new dbox({ accessToken : response.token });
        box.filesListFolder({path : ''}).then( (files) => {
            console.log('files ', files);
        });
    });
};

/**
 * Downloads a file from the user's Dropbox account. Note that unlike Google Drive the file may be downloaded by issuing a GET request to the URL directly. 
 * This is due to the fact that authentication must be done ahead of time and the auth token must be provided with the request. 
 * @alias bisDropbox.downloadFile
 * @param {Object} p Parameters to the download request (and tokenWrap)
 */
let downloadFile = function (p) {
    return new Promise((resolve, reject) => {

        tokenWrap(p, function (params) {
            console.log(params);
            let success = function (data, fname) {
                resolve({ data: data, filename: fname });
            };

            let failure = function (e) {
                reject(e);
            };

            if (params.isbinary) {
                genericio.readbinarydatafromurl(params.url, success, failure, null, params.name);
            } else {
                genericio.readtextdatafromurl(params.url, success, failure, null, params.name);
            }
        });
    }).catch((e) => { console.log('error in downloadFile ', e); });
};

/**
 * Downloads several files from a user's Dropbox. 
 * @alias bisDropbox.downloadFiles
 * @param {Object} p Parameters to download requests, including list of files. 
 */
let downloadFiles = function(p) {
    tokenWrap(p, function(params) {
        let box = new dbox({ accessToken: params.token });
        let files = {};

        //parse picker callback args
        if (params.files) files = params.files;
        else files = params;

        files.forEach((file) => {
            box.filesDownload({ path: file.id }).then((response) => {
                let reader = new FileReader();
                reader.addEventListener('loadend', function () {
                    let data = new Uint8Array(reader.result);
                    genericio.write(file.name, data,true);
                });

                reader.readAsArrayBuffer(response.fileBlob);
            }).catch((error) => {
                console.log(error);
            });
        });
    });
};

/**
 * Uploads an image to Dropbox using POST route. 
 * @alias bisDropbox.uploadFilePost
 * @param {Object} p Parameters to upload request
 */
let uploadFilePost = function(p) {
    tokenWrap(p, function(params) {
        let box = new dbox({ accessToken : params.token });
        box.filesUpload({
            contents : params.data,
            path : '/upload.png',
            autorename : true
        }).then( (response) => {
            console.log(response);
        }).catch( (error) => {
            console.log(error);
        });
    });
};

/**
 * Uploads a text-based file to Dropbox. 
 * @alias bisDropbox.uploadFile
 * @param {Object} p Parameters to upload request. 
 */
let uploadFile = function(p) {
    tokenWrap(p, function(params) {

        console.log(params);
        //get filepath from shared link
        let box = new dbox({ accessToken : params.token });

        box.sharingGetFileMetadata({ file : params.id }).then( (response) => {
            console.log('upload file ', response);
            box.filesUpload({
                contents : params.data,
                path : response.path_display,
                mode : { '.tag' : 'overwrite'} 
            });
        });

        
    });
};

/**
 * Creates Dropbox picker dialog to either save or load a file. 
 * @alias bisDropbox.createPicker
 * @param {Function} responseFunction Function to call after picker returns
 * @param {Enum} action Specifies what action the picker should take. Either 'save' or 'load'.
 * @param {Boolean} allowMultiselect Whether a user may select multiple files. 
 * @param {Boolean} data Data included with request. Necessary for 'save' but not 'load'. 
 */
let createPicker = function(responseFunction, action, allowMultiselect = false) {
    return new Promise((resolve, reject) => {
        queryLocalToken().then((response) => {
            let readOptions = {
                success: function (files) {
                    resolve({
                        files : files,
                        token : response.token,
                        isbinary : true, //placeholder
                        responseFunction : responseFunction,
                    });
                },
                error : function (error) {
                    console.log(error);
                },
                cancel: function () {
                    reject('action canceled');
                },

                linkType: "direct", 
                multiselect: allowMultiselect, // or true
                //extensions: ['.nii.gz', '.nii' ],
            };



            let saveOptions = {
                success: function (files) {
                    resolve({
                        files: files,
                        token: response.token,
                        isbinary: true, //placeholder
                        responseFunction: responseFunction,
                    });
                },
                error: function (error) {
                    console.log(error);
                },
                cancel: function () {
                    reject('action canceled');
                },

                linkType: "direct",
                multiselect: allowMultiselect, // or true
                //extensions: ['.nii.gz', '.nii' ],
            };
            
            switch(action) {
            case 'save' : Dropbox.choose(saveOptions); break;
            case 'load' : Dropbox.choose(readOptions); break;
            default : console.log('Error: action not recognized');
            }
        }).catch((error) => {
            reject(error);
        });
    });
};

/**
 * Queries the user's in-browser databases for auth tokens using localforage. 
 * 
 * NOTE: localStorage is visible only to windows of the same origin. 
 * Though this solution does technically expose the user's token to any user who has access to the window, this is information that propagates through window anyway.
 * See https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API for more details.
 * @alias bisDropbox.queryLocalToken
 */
let queryLocalToken = function() {
    return new Promise( (resolve, reject) => {
        let token = localStorage.getItem('auth_session_token') || null;
        if (!token) { 
            auth();
            reject({ 'error' : 'user must authenticate first' });
        } else {
            resolve({ 'token' : token });
        }
    });
};

/**
 * Handles attaching a token to a Dropbox API request either by checking that a token is contained in params or by querying localforage for a user token.
 * Will not launch auth flow if no token is found. 
 * 
 * @alias bisDropbox.tokenWrap
 * @param {Object} params Parameters to the function (may or may not contain a token)
 * @param {Function} fun Function to call after querying a token
 */
let tokenWrap = function(params, fun) {
    console.log(params);

    if (params.token) {
        fun(params);
    } else {
        queryLocalToken().then((response) => {
            params.token = response.token;
            fun(params);
        });
    }
};

/**
 * CloudDriveModule API
 * 
 *  fileobject {
 *          url : 
 *          drivemodule : self
 *          sourcetype  : "google"
 *          responseFunction : function to be called from bis_genericio.read
 *  }
 * 
 *  constructor does the initialization specific to module
 * 
 * GUI Driven
 *  pickReadFile(filter,suffix,callback) -- takes a path and a suffix, opens up a GUI and then calls callback(fileobjectlist)
 * File Object
 *  downloadFile(fileobject, isbinary=false)
 *  
 * GUI Driven
 *  pickWriteFile(filter,suffix,callback) 
 * File Object Driven
 *  uploadFile(fileobject,data,isbinary=false); /// data is either a text string or a binary array
 *  
 */

// ----------------------------------------------------------------------------------
//   Create Fascade Wrapper
// ----------------------------------------------------------------------------------

/**
 * Fascade function to download a file from Dropbox. 
 * @alias bisDropbox.downloadFileInterface
 * @param {Object} fileobject Parameters to file download
 * @param {Boolean} isbinary Whether downloaded file is binary or not
 */
let downloadFileInterface = function(fileobject, isbinary) {
    //parse results coming from picker
    let file = {
        url : fileobject.files ? fileobject.files[0].link : fileobject.url,
        name : fileobject.files ? fileobject.files[0].name : fileobject.name,
        isbinary : isbinary
    };

    return downloadFile(file);
};

/**
 * Fascade function to upload a file to Dropbox
 * @alias bisDropbox.uploadFileInterface
 * @param {Object} fileobject Parameters to file upload 
 * @param {Object} data Data to upload to dropbox
 * @param {Boolean} isbinary Whether uploaded file is binary or not 
 */
let uploadFileInterface = function(fileobject, data, isbinary) {
    let file = {
        url : fileobject.files ? fileobject.files[0].link : fileobject.url,
        name : fileobject.files ? fileobject.files[0].name : fileobject.name,
        id : fileobject.files ? fileobject.files[0].id : fileobject.id,
        isbinary : isbinary,
        data : data
    };

    console.log('upload file interface ', file);
    return uploadFile(file);
};

/**
 * Opens Dropbox Picker to select a file to load. 
 * @alias bisDropbox.pickReadFile
 * @param {String} filter List of selectable MIME-types. Currently unused but left for parity with other cloud modules' fascades. 
 */
let pickReadFile = function() {
    return createPicker(downloadFileInterface, 'load', false, {});
};
/**
 * Opens Dropbox Picker to select a file to save. 
 * @alias bisDropbox.pickWriteFile
 * @param {String} filter List of selectable MIME-types. Currently unused.  
 * @param {Object} data Data to save to Dropbox
 */
let pickWriteFile = function(filter, data) {
    return createPicker(uploadFileInterface, 'save', false, data);
};


module.exports = {
    init : init,
    auth : auth,
    pickReadFile : pickReadFile,
    pickWriteFile : pickWriteFile, 
    downloadFile : downloadFileInterface,
    downloadFiles : downloadFiles,
    uploadFile : uploadFileInterface,
    uploadFilePost : uploadFilePost,
    listFiles : listFiles
};
