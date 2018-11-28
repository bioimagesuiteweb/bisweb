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

/* global gapi,google,alert,lgapioopReject */
/* jshint expr: true*/

"use strict";

const genericio = require('bis_genericio.js');
const keys = require('bis_keystore.js');

/**
 * bisGoogleDrive namespace. Utility code to read/write to GoogleDrive
 * @namespace bisGoogleDrive
 */


/**
 * DriveModule. A class to manage connections to Google Drive
 */
class DriveModule {

    constructor() {

        // Client ID and API key from the Developer Console
        this.clientid = keys.GoogleDriveClientID;
        this.apikey = keys.GoogleDriveKey;

        // Specifies the version of the API to load, including name, version, description, method definitions, auth requirements, etc.
        //https://developers.google.com/api-client-library/javascript/features/discovery
        this.discoverydoc = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

        // Authorization scopes required by the API; multiple scopes can be
        // included, separated by spaces.
        this.scopes = 'https://www.googleapis.com/auth/drive';

        const self=this;
        self.promise=new Promise( (resolve,reject) => {
            //Dynamically load and insert Google Drive API entry functions used to load the rest of the library.
            let apiTag = document.createElement('script');
            apiTag.src = 'https://apis.google.com/js/api.js';
            apiTag.onload = (() => {
                console.log('base api load complete');
                gapi.load('client:auth2:picker', {
                    callback: () => {
                        console.log('drive auth module loaded');
                        gapi.client.init({
                            apiKey: this.apikey,
                            clientId: this.clientid,
                            discoveryDocs: this.discoverydoc,
                            scope: this.scopes
                        }).then(function () {
                            console.log('drive initialized successfully');
                            resolve(self);
                        }, function (e) {
                            console.log('an error occured', e);
                            reject('drive client failed to initialize ' + e);
                        });
                    },
                    onerror: () => {
                        console.log('error: could not initialize Google API');
                    }
                });
            });
            document.head.appendChild(apiTag);
        });
    }

    isReady() {
        return this.promise;
    }

    /**
     * Checks if the Google API has been initialized, signs in the user if necessary, and then invokes driveFunction.
     * Arguments to driveFunction are passed using variable argument syntax to more closely mimic method signatures of functions in drive module
     * @param {Object} context
     * @param {Function} driveFunction 
     * @param {Array} args 
     */
    wrapInAuth(context, driveFunction, ...args) {
        //create a version of apply with the calling context and arguments bound to it (class methods need to be called in scope of an instance of the class)
        let df = driveFunction.apply.bind(driveFunction, context, args);
        if (!gapi) {
            console.log('Google Drive API did not load successfully, cannot do auth');
        } else if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
            gapi.auth2.getAuthInstance().signIn().then(() => {
                df();
            });
        } else {
            df();
        }
    }

    /**
     * Create the standard Google Drive picker dialog and send a request for each file the user selects. 
     * As of 2/16/18 the picker logs X-Frame-Option errors because of a disagreement between the Chromium team and Google. 
     * https://bugs.chromium.org/p/chromium/issues/detail?id=129139
     * @param {Function} callback Function to call after the picker returns with the files
     * @param {Boolean} showFolders Whether to show folders or not in the picker view
     * @param {Object} callbackargs Dictionary of arguments to pass to callback
     */
    createPicker(callback, showFolders = false, callbackargs = {}) {

        //Note that you can select many items in a picker 
        let pickerCallback = function (data) {
            if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
                let selected = [];
                data.docs.forEach((doc) => {
                    let args = {};
                    args.path = 'https://www.googleapis.com/drive/v3/files/' + doc.id + '?alt=media';
                    args.method = 'GET';
                    
                    let fobj = {
                        path: args.path,
                        id: doc.id,
                        name: doc.name,
                        mimeType : doc.mimeType
                    };

                    selected.push(fobj);
                });

                if (!callbackargs.files) {
                    callbackargs.files = selected;
                } else {
                    callbackargs.files.push(selected);
                }

                callback(callbackargs);
            }


        };

        let docsView = new google.picker.DocsView(google.picker.ViewId.FOLDER).
            setIncludeFolders(true).
            setSelectFolderEnabled(true);

        let folderPicker = new google.picker.PickerBuilder().
            addView(docsView).
            //enableFeature(google.picker.Feature.MULTISELECT_ENABLED).
            setOAuthToken(gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token).
            setDeveloperKey(this.apikey).
            setCallback(pickerCallback).
            setOrigin(window.location.protocol + '//' + window.location.host).build();

        let filePicker = new google.picker.PickerBuilder().
            addView(google.picker.ViewId.DOCS).
            setOAuthToken(gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token).
            setDeveloperKey(this.apikey).
            setCallback(pickerCallback).
            //;window.location.protocol + '//' + window.location.host).
            setOrigin(window.document.URL).build();

        if (showFolders) {
            folderPicker.setVisible(true);
        } else {
            filePicker.setVisible(true);
        }
    }

    /**
     * Makes a GET request using the Google Drive API for a single file. 
     * Args should include at least one file with the id assigned by drive and a name assigned by a user. 
     * Files specified after this file will be ignored.
     * @param {Object} args One or many files. Formatted because the file may be specified as a single file or an array of files.
     * @param {Object} args.file Arguments related to the file to retrieve. Optional, may be provided in args.files.
     * @param {Array} args.files Arguments related to multiple files to retrieve. Optional, may be provided as a single file in args.file.
     * @param {String} args.file.id The unique Google identifier for the file to get from the drive.
     */
    downloadFile(args) {
        let reqArgs = {};
        let file = args.file ? args.file : args.files[0];

        reqArgs.path = 'https://www.googleapis.com/drive/v3/files/' + file.id + '?alt=media';
        reqArgs.method = 'GET';

        gapi.client.request(reqArgs).then((response) => {
            console.log('request successful, downloading');
            console.log(response);
            
            //NOTE: this won't quite work. need to parse header data out? 
            genericio.write(file.name, response.body, true).then( () => {
                console.log('download complete');
            }).catch( (e) => {
                console.log('download encountered an error ', e);
            });
        });
    }                               

    /**
     * Makes GET requests for each of the files contained in a given folder. Intended to be used in conjunction with the picker. 
     * @param {String} folder 
     */
    downloadFilesFromFolder(folder) {
        let folderId;
        //parse return value from picker if necessary
        (typeof folder !== String) ? folderId = folder.files[0].id : folderId = folder;

        let args = {};
        args.path = 'https://www.googleapis.com/drive/v2/files/' + folderId + '/children';
        args.method = 'GET';
        args.params = {
            maxResults: 1000
        };

        gapi.client.request(args).then((response) => {
            let drive = document.getElementById('drive_element');

            if (window.confirm("Import filenames? Files will be given a default name otherwise.")) {
                response.result.items.forEach((file) => {
                    let nameArgs = { path: 'https://www.googleapis.com/drive/v3/files/' + file.id };
                    gapi.client.request(nameArgs).then((res) => {
                        file.name = res.result.name;
                        drive.downloadFile({ file: file });
                    });
                });
            } else {
                response.result.items.forEach((file) => {
                    file.name = file.id.substring(0, 5) + '.nii.gz';
                    drive.downloadFile({ file: file });
                });
            }
        });
    }

    /**
     * Makes a GET request using the Google Drive API for a single file. 
     * Unlike downloadFile this will not attempt to write the file to disk, it will simply resolve it. 
     * @param {Object} args Arguments related to the download.
     * @param {Object} args.file Arguments related to the file to retrieve. Optional, may be provided in args.files.
     * @param {Array} args.files Arguments related to multiple files to retrieve. Optional, may be provided as a single file in args.file.
     * @param {String} args.file.id The unique Google identifier for the file to get from the drive.
     */
    retrieveFile(args) {
        return new Promise( (resolve, reject) => {
            console.log('args', args);
            let reqArgs = {};
    
            reqArgs.path = 'https://www.googleapis.com/drive/v3/files/' + args.id + '?alt=media';
            reqArgs.method = 'GET';
    
            gapi.client.request(reqArgs).then( (response) => {
                console.log('response', response);
                resolve(response);
            }).catch( (e) => { reject('Google Drive retrieveFile encountered an error', e); });

        });
    }

    /**
     * Makes a PUT or POST request using the Google Drive API for a single file. If a file id is provided then it will attempt to update the file,
     * if none is provided then it will attempt to create a new file on the user's drive. 
     * Takes place in two requests: the first to establish the resumable connection and send file metadata and the second to upload the file.
     * Formats as a resumable request (https://developers.google.com/drive/v2/web/resumable-upload).
     * @param {Object} params The file to upload, and optionally an endpoint to push updates to. If none is specified a new destination will be created.
     * @param {Function} finishedcallback Function to call on file upload complete
     * @param {Function} errorcallback Function to call on file upload terminated
     */
    uploadFile(params, finishedcallback = null, errorcallback = null) {

        finishedcallback = finishedcallback || console.log;
        errorcallback = errorcallback || console.log;

        let args = {}, uploadArgs = {}, dst = params.destination, upload = params.upload;

        let date = new Date();
        let dateString = '' + (date.getMonth() + 1) + '/' + date.getDate() + ' ' + (date.getHours()) % 12 + ':' + date.getMinutes();
        console.log(dateString);
        args.params = args.headers = {};
        args.body = {
            'name': 'Upload ' + dateString + '.png',
            'description': dst.description ? dst.description : 'no description',
            'mimeType': upload.mimeType
        };

        console.log(dst);
        //Google seems to supply 'Content-Length' header by itself, so it is omitted here.
        args.headers['Content-Type'] = 'application/json; charset=UTF-8';
        args.headers['X-Upload-Content-Type'] = 'image/png';
        args.headers['X-Upload-Content-Length'] = getContentLength(upload.data, upload.mimeType);

        if (dst.mimeType === 'application/vnd.google-apps.folder') {
            if (!window.confirm('Upload file to selected folder?')) return;

            args.path = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&X-Upload-Content-Length=' + getContentLength(upload.data, upload.mimeType);
            args.method = 'POST';
            args.body.parents = [dst.id];
        } else if (dst.id) {
            if (!window.confirm('Replace contents of selected file with viewer?')) return;

            args.path = 'https://www.googleapis.com/upload/drive/v3/files/' + dst.id + '?uploadType=resumable';
            args.method = 'PUT';
        } else if (dst.path) {
            args.path = dst.path;
            args.method = 'POST';
        } else {
            args.path = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
            args.method = 'POST';
        }

        gapi.client.request(args).then((response) => {
            if (response.status == 200) {
                uploadArgs.headers = {};

                uploadArgs.path = response.headers.location;

                uploadArgs.method = 'PUT';
                // NOT USED
                //let contentType = uploadArgs.headers['Content-Type'] = upload.mimeType;
                let contentLength = uploadArgs.headers['Content-Length'] = getContentLength(upload.data, upload.mimeType);
                uploadArgs.headers['X-Upload-Content-Type'] = upload.mimeType;

                uploadArgs.body = upload.data;
                console.log('upload', uploadArgs);

                gapi.client.request(uploadArgs).then(() => {
                    console.log('upload complete'); //done
                }).catch(function handleRetries(response) {
                    console.log(response);
                    console.log('transmission encountered an error, attempting to recover...');

                    //https://developers.google.com/drive/v2/web/resumable-upload#resume-upload
                    function resumableUploadLoop(args) {
                        gapi.client.request(args)
                            .then((rangeResponse) => {
                                switch (rangeResponse.headers.status) {
                                case 200: //upload complete
                                case 201:
                                    finishedcallback('transmission complete');
                                    break;
                                case 308: { //upload incomplete but recoverable
                                    let range = rangeResponse.headers.Range.slice(6, -1); //range preceded by word 'bytes='
                                    let bounds = range.split('-');
                                    let reuploadArgs = {}; reuploadArgs.headers = {};
                                    reuploadArgs.headers['Content-Length'] = contentLength - bounds[1] - 1;
                                    reuploadArgs.headers['Content-Range'] = 'bytes ' + (bounds[1] + 1) + '-' + contentLength - 1 + '/' + contentLength;

                                    //TODO: select byte range of UTF-8 and put it as the body of this request. 
                                    //This seemed a little complex and this code may not even be strictly necessary.
                                    alert('attempting retry without an implemented retry body. write this!');
                                    break;
                                }
                                case 404:
                                    errorcallback('transmission unrecoverable, please initiate transfer again');
                                    break;
                                default:
                                    errorcallback.log('could not interpret range response, aborting transmission');
                                    break;
                                }
                            });
                    }
                    resumableUploadLoop({ 'path': uploadArgs.path, headers: { 'Content-Length': 0, 'Content-Range': '*/*' } });
                });
            } else {
                errorcallback('an error occured, see response' + response);
            }
        }).catch((response) => {
            errorcallback(response);
        });
    }

    /** Takes a list of files as an argument, pulls ones with a specified id, and searches the user's files for ones with the same name
        as those with specified names but not ids

        Changing folder of file in Google Drive does NOT change the ID of the file
        Changing content of file in Google Drive does NOT change the ID of the file 
        @param {Array} files List of file objects 
        @param {Object} outputobj Dictionary to pass identified file objects into. Optional. 
    */
    parseAndFetch(files, outputobj = null) {
        let unidentifiedFiles = [];
        let identifiedFiles = [];
        files.forEach((file) => {
            if (!file.id) {
                if (!file.name) {
                    console.log('no name or id specified, cannot fetch file');
                } else {
                    unidentifiedFiles.push(file);
                }
            } else {
                identifiedFiles.push(file);
            }
        });

        this.createUserFileList().then((response) => {
            let allFiles = response.list;

            //sort both lists alphabetically
            unidentifiedFiles.sort(function (a, b) {
                return a.name.localeCompare(b.name);
            });
            allFiles.sort(function (a, b) {
                return a.name.localeCompare(b.name);
            });

            console.log(unidentifiedFiles);
            console.log(response);

            //both arrays are sorted by name, so if the entry in the body is lexically greater than the entry in unidentifiedFiles we know it's not there
            let uidIndex = 0;
            let cmp = 0;
            for (let file of allFiles) {
                if ((cmp = unidentifiedFiles[uidIndex].name.localeCompare(file.name)) === 0) {
                    console.log('located ' + file.name);
                    identifiedFiles.push({
                        'id': file.id,
                        'name': file.name
                    });
                    unidentifiedFiles.splice(uidIndex, 1);
                } else if (cmp < 0) {
                    //may have to move through multiple entries in unidentified files per comparison
                    //consider unidentifiedFiles = [a,b,c,d], allFiles = [a,d,e,f]
                    do {
                        uidIndex++;
                        console.log('uidIndex = ' + uidIndex + ' allFiles at comparison location = ' + file.name);
                    } while (uidIndex < unidentifiedFiles.length && unidentifiedFiles[uidIndex].name.localeCompare(file.name) < 0);
                }
                if (uidIndex >= unidentifiedFiles.length) break;
            }

            console.log(identifiedFiles);
            if (outputobj !== null) {
                outputobj.identifiedFiles = identifiedFiles;
            } else {
                identifiedFiles.forEach((file) => {
                    console.log(file);
                    this.requestFileDownload(file);
                });
            }

        }).catch((response) => {
            console.log(response.message);
        });
    }

    /**
     * Assembles a list of all the user's files on their Google Drive. 
     * Makes recursive requests for one thousand entries at a time because of one thousand entry limit per request. 
     */
    createUserFileList() {
        let accumulatedPages = [];

        //create a promise helper function that resolves to a boolean so that you can loop through pages
        function requestNextPage(pageToken) {
            return new Promise((resolve, reject) => {
                let args = {};
                args.path = 'https://www.googleapis.com/drive/v3/files';
                args.method = 'GET';
                args.params = {
                    'corpora': 'user',
                    'pageSize': 1000,
                    'pageToken': pageToken
                };

                if (!pageToken) {
                    resolve({ 'message': 'no token provided', 'token': undefined });
                } else {
                    gapi.client.request(args).then((response) => {
                        resolve({ 'list': response.result.files, 'token': response.result.nextPageToken });
                    }).catch((error) => {
                        reject(error);
                    });
                }
            });
        }

        //pageLoop resolves or rejects the promise from createUserFileList
        //pageLoop may call itself many times and delegating it a promise in an outer scope allows it to terminate itself gracefully
        function pageLoop(pageToken, loopResolve, loopReject) {
            requestNextPage(pageToken).then((reply) => {
                accumulatedPages = accumulatedPages.concat(reply.list);
                if (reply.token) {
                    pageLoop(reply.token, loopResolve, lgapioopReject);
                } else {
                    loopResolve({ 'message': 'file list complete', 'count': accumulatedPages.length });
                }
            }).catch((error) => {
                console.log('error fetching pages, stopping loop', error);
                loopReject({ 'message': 'error fetching page' });
            });
        }

        let args = {};
        args.path = 'https://www.googleapis.com/drive/v3/files';
        args.method = 'GET';
        args.params = {
            'corpora': 'user',
            'pageSize': 1000
        };

        return new Promise((outerResolve, outerReject) => {
            //do first request then go into pageLoop
            gapi.client.request(args).then((response) => {
                accumulatedPages = accumulatedPages.concat(response.result.files);
                let token = response.result.nextPageToken;

                new Promise((innerResolve, innerReject) => {
                    pageLoop(token, innerResolve, innerReject);
                }).then(() => {
                    outerResolve({ 'list': accumulatedPages });
                }).catch(() => {
                    outerReject({ 'message': 'error fetching pages' });
                });
            });
        });
    }
}


/**
 * Determines the length in bytes of content. Takes content type as a parameter because UTF-8 and ASCII encode characters with different lengths
 * @alias  bisGoogleDrive.getContentLength
 * @param {String} content 
 * @param {String} contentType 
 */
function getContentLength(content, contentType) {
    if (contentType === 'text/plain') {
        return content.length;
    } else if (content instanceof Uint8Array) {
        return content.length;
    } else if (contentType === 'application/octet-stream' || contentType === 'image/png') { //Image from viewer
        return content.byteLength;
    } else { //UTF-8 encoded string 
        //https://stackoverflow.com/questions/25994001/how-to-calculate-byte-length-containing-utf8-characters-using-javascript

        /* jshint ignore:start */
        /* eslint-disable no-cond-assign */

        let b = 0, i = 0, c;
        for (; c = content.charCodeAt(i++); b += c >> 11 ? 3 : c >> 7 ? 2 : 1); 
        return b;
        /* jshint ignore:end */
        /* eslint-enable no-cond-assign */
    }

}


/**
 * CloudDriveModule API
 * 
 *  fileobject {
 *          url : 
 *          drivemodule : self
 *          sourcetype  : "google"
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
/** Global Pointer to drivemodule
 * @alias  bisGoogleDrive.internal
 */
let internal = {
    drivemodule: null
};

/**
 * Fascade function to create an instance of a Google Drive Module. 
 * @alias  bisGoogleDrive.createDrive
 */
let createDrive = function () {

    if (internal.drivemodule === null) {
        internal.drivemodule = new DriveModule();
    }
    return internal.drivemodule.isReady();
};

/**
 * Fascade function to download a file from Google Drive. 
 * @alias  bisGoogleDrive.downloadFileInterface
 * @param {Object} fileobject Dictionary containing parameters related to the file. 
 * @param {Boolean} isbinary Whether the file is binary or not
 */
let downloadFileInterface = function (fileobject, isbinary = false) {
    // Single item from the object list below (see pickReadFile, output)
    isbinary = isbinary || false;

    let reqArgs = {};
    reqArgs.path = 'https://www.googleapis.com/drive/v2/files/' + fileobject.id;
    reqArgs.method = 'GET';
    reqArgs.encoding = null;

    return new Promise(function (resolve, reject) {
        gapi.client.request(reqArgs).then((response) => {
            let url = response.result.downloadUrl;
            let requestheader = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;

            let success = function (data, fname) {
                resolve({
                    data: data,
                    filename: fname
                });
            };

            let failure = function (e) {
                reject(e);
            };

            if (isbinary) {
                genericio.readbinarydatafromurl(url, success, failure, requestheader, fileobject.name);
            } else {
                genericio.readtextdatafromurl(url, success, failure, requestheader, fileobject.name);
            }
        }).catch((e) => { reject(e); });
    });
};

/**
 * Fascade function to upload a file to Google drive. 
 * @alias  bisGoogleDrive.uploadFileInterface
 * @param {Object} fileobject Dictionary containing parameters related to the file
 * @param {Object} data Data to upload to drive
 * @param {Boolean} isbinary Whether data is binary or not
 */
let uploadFileInterface = function (fileobject, data, isbinary = false) {
    return new Promise(function (resolve, reject) {
        
        //TODO: extend to handle more than two kinds of mimeTypes
        isbinary = isbinary || false;

        let params = {
            destination: {
                path: fileobject.url,
                id: fileobject.id,
                name: fileobject.name,
                mimeType : fileobject.mimeType, //to determine whether destination is a folder or a file  
            },
            upload : {
                data : data,
                mimeType : isbinary ? 'application/octet-stream' : 'image/png'
            }
        };

        internal.drivemodule.uploadFile(params,
                                        function (msg) {
                                            resolve(msg);
                                        },
                                        function (e) {
                                            reject(e);
                                        }
                                       );
    });
};

/**
 * Fascade function to create the Google Drive file picker and select a file. 
 * @alias  bisGoogleDrive.pickFile
 * @param {String} filter List of file types (specified as MIME type) to show in the picker, separated by commas
 * @param {Function} responseFunction Function to call after picker returns
 */
let pickFile = function (filter, responseFunction) {

    return new Promise(function (resolve, reject) {
        let callback = function (listoffiles) {

            // Parse list of files to something cleaner
            let output = [];
            let retrieveFilesPromiseArray = [];

            let l = listoffiles.files.length;
            if (l < 1)
                reject("Empty File List");
            for (let i = 0; i < l; i++) {
                let fobj = listoffiles.files[i];
                output.push({
                    url: fobj.path,
                    id: fobj.id,
                    name: fobj.name,
                    mimeType : fobj.mimeType,
                    sourcetype: "Google",
                    responseFunction: responseFunction,
                });

                if (fobj.mimeType === 'text/plain' || fobj.mimeType === 'application/json') {
                    retrieveFilesPromiseArray.push(
                        internal.drivemodule.retrieveFile(fobj).then((data) => {
                            output[i].data = data;
                        }).catch((e) => {
                            console.log('Google Drive retrieveFile returned an error', e);
                        })
                    );
                }
            }

            if (filter.includes('single')) resolve(output[0]);
            else Promise.all(retrieveFilesPromiseArray).then( () => { resolve(output); });
        };


        try {
            internal.drivemodule.wrapInAuth(internal.drivemodule,
                                            internal.drivemodule.createPicker,
                                            callback,
                                            filter.includes('folder') ? true : false, 
                                            {},
                                            filter);
        } catch (e) {
            reject('Google Drive pickFile encountered an error', e);
        }
    });
};

/**
 * Fascade function to pick a file to read from. 
 * @alias  bisGoogleDrive.pickReadFile
 * @param {String} filter List of file types (specified as MIME type) to show in the picker, separated by commas
 */
let pickReadFile = function (filter) {
    return pickFile(filter, downloadFileInterface);
};

/**
 * Fascade function to pick a file to write to.
 * @alias  bisGoogleDrive.pickWriteFile
 * @param {String} filter List of file types (specified as MIME type) to show in the picker, separated by commas
 */
let pickWriteFile = function (filter) {
    return pickFile(filter, uploadFileInterface);
};



module.exports = {
    create: createDrive,
    downloadFile: downloadFileInterface,
    uploadFile: uploadFileInterface,
    pickReadFile: pickReadFile,
    pickWriteFile: pickWriteFile,
};

