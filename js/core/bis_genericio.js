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

/* global process,*/
"use strict";

/** 
 * @file Browser/Node Js module. Contains {@link BisGenericIO}.
 * @author Xenios Papademetris
 * @version 1.0
 */

const biscoreio=require('bis_coregenericio');
const glob=biscoreio.getglobmodule();
const fs=biscoreio.getfsmodule();
const rimraf=biscoreio.getrimrafmodule();
// -------------------------------------------------------------------------------------------------------
// File server stuff

let fileServerClient=null;
const inBrowser= biscoreio.getmode() === 'browser';


console.log('In Browser=',inBrowser);

/** Sets the file server object 
 * @alias BisGenericIO#setFileServerObject
 * @param {Object} obj - the server object
 */
const setFileServerObject=function(obj) {
    fileServerClient=obj;
};

/** Gets he file server object 
 * @alias BisGenericIO#getFileServerObject
 * @returns {Object} - the server object
 */
const getFileServerObject=function() {
    return fileServerClient;
};



/** Fixes the save filename depending on whether we have a string, a mouse event, or a FILE 
 * Essentially if this is an object only use it if has a .name member, else replace it
 * @alias BisGenericIO#fixSaveFilename
 * @param {Object} url - abstract file handle object
 * @param {String} replacement 
 * @returns {Object} - a string or the file object as needed
 */
let getFixedSaveFileName = function(fobj,replacement) {

    if (fobj=== undefined || fobj===null || fobj == {} )
        return replacement;
    
    if (typeof fobj === "object") {
        if (!fobj.name && !fobj.filename) {
            fobj=replacement;
        }
    }
    return fobj;
};

/** Get the load filename
 * Essentially if input is an object check if it has a .name variable and return it instead
 * @alias BisGenericIO#getLoadFilename
 * @param {Object} url - abstract file handle object
 * @param {String} replacement 
 * @returns {Object} - a string or the file object as needed
 */
let getFixedLoadFileName = function(fobj) {

    fobj = fobj || '';

    if (typeof fobj === "object") {
        if (fobj.filename) 
            return fobj.filename;
        if (fobj.name)
            return fobj.name;
    }

    if (fobj.indexOf("?=realname=")>0) {
        let a=fobj.indexOf("?=realname=");
        let n=fobj.length;
        return fobj.substr(a+11,n-a);
    }

    if (fobj.indexOf("http")===0) {
        // Url -- try to get the last parts
        let s=fobj.split("/");
        
        if (fobj.indexOf("dl.dropbox")>0) {

            let f="dropbox/";
            for (let i=6;i<s.length;i++) {
                f=f+"/"+s[i];
            }
            return f;
        }
        return s[s.length-1];
    }

    
    return fobj;

};


// -------------------------------------------------------------------------------------------------------
/** Read data
 * @alias BisGenericIO#read
 * @param {String} url -- abstact file handle object
 * @param {Boolean} isbinary -- is data binary
 * @returns {Promise} -- the .then function of the promise has an object with two members data and filename
 * that contain the actual data read and the actual filename read respectively.
 */

let read = function (url, isbinary = false) {

    if (fileServerClient && typeof url === 'string') {
        if (url.indexOf('http')!==0) {
            return fileServerClient.downloadFile(url,isbinary);
        }
    }

    if (url) {
        if (url.responseFunction!==undefined) {
            return url.responseFunction(url,isbinary);
        }
    }

    return new Promise(function (resolve, reject) {

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
            biscoreio.readbinarydata(url, success, failure);
        } else {
            biscoreio.readtextdata(url, success, failure);
        }
    });
};

/** Generic read json data. This is a text file. The object to be read must have an attribute 'bisformat' which must match the desired one.
 * This first calls @{link BisGenericIO~read} and then does parsing as needed
 * @alias BisGenericIO#readJSON
 * @param {object} url - the url or filename or file object
 * @param {string} bisformat - the desired bisformat
 */
let readJSON = function (url, bisformat) {

    return new Promise( (resolve,reject) => { 

        read(url).then( (obj) => { 
            
            let jsonstring=obj.data;
            let b;
            try {
                b = JSON.parse(jsonstring);
            } catch (e) {
                reject(url + " is not a valid JSON File --pick something with a .json extension");
            }
            
            if (b.bisformat !== bisformat) {
                reject("Bad JSON File " + url + " element bisformat does not equal " + bisformat);
            }
            
            resolve( { data : b,
                       filename : url
                     });
        }).catch( (e) => { reject(e.trace); });
    });
};


/** Write data
 * @alias BisGenericIO#write
 * @param {String} url -- abstact file handle object
 * @param {Data} data -- the data to save, either a sting or a Uint8Array
 * @param {Boolean} isbinary -- is data binary
 * @returns {Promise} 
 */

let write = function (url, data,isbinary=false) {

    if (fileServerClient && typeof url === 'string') {
        if (url.indexOf('http')!==0) {
            return fileServerClient.uploadFile(url,data,isbinary);
        }
    }

    if (url) {
        if (url.responseFunction !== undefined) {
            return url.responseFunction(url, data, isbinary);
        }
    }

        return new Promise(function (resolve, reject) {
        let success = function (msg) {
            resolve(msg);
        };

        let failure = function (e) {
            reject(e);
        };

        if (isbinary)
            biscoreio.writebinarydata(url, data, success, failure);
        else
            biscoreio.writetextdata(url, data, success, failure);
    });
};

/** Returns the size in bytes of a file
 * @alias BisGenericIO#getFileSize
 * @param {Object} url - the filename
 * @returns {Promise} - the payload is the size of the file in bytes
 */

let getFileSize=function(url) {

    if (fileServerClient) {
        return fileServerClient.getFileSize(url);
    }

    if (inBrowser) {
        return Promise.rejected('getFileSize can not be  done in a  Browser');
    }

    let fileSizeInBytes=-1;
    try {
        let stats = fs.statSync(url);
        fileSizeInBytes = stats["size"];
        return Promise.resolved(fileSizeInBytes);
    } catch(e) {
        return Promise.rejected(fileSizeInBytes);
    }
};

/** Checks is a path is a directory
 * @alias BisGenericIO#isDirectory
 * @param {Object} url - the directory string
 * @returns {Promise} - the payload is true or false
 */

let isDirectory=function(url) {

    if (fileServerClient) {
        return fileServerClient.isDirectory(url);
    }

    if (inBrowser) {
        return Promise.rejected('getFileSize can not be  done in a  Browser');
    }

    let m=true;
    if (!fs.lstatSync(url).isDirectory())
        m=false;
    return Promise.resolved(m);
};

/** Create the directory in url
 * @alias BisGenericIO#makeDirectory
 * @param {Object} url - the directory string
 * @returns {Promise} - the payload is true or false
 */

let makeDirectory=function(url) {

    if (fileServerClient) {
        return fileServerClient.makeDirectory(url);
    }

    if (inBrowser) {
        return Promise.rejected('getFileSize can not be  done in a  Browser');
    }

    let m=false;
    if (!fs.existsSync(url)){
        fs.mkdirSync(url);
        m=true;
    }
    return Promise.resolved(m);
};

/** Checks is a path is a directory
 * @alias BisGenericIO#isDirectory
 * @param {Object} url - abstract file handle object
 * @returns {Promise} - the payload is true or false
 */

let deleteDirectory=function(url) {

    if (fileServerClient) {
        return fileServerClient.deleteDirectory(url);
    }

    if (inBrowser) {
        return Promise.rejected('getFileSize can not be  done in a  Browser');
    }
    
    if (fs.lstatSync(url).isDirectory())
        return Promise.rejected(url+' is not a directory');

    return new Promise( (resolve,reject) => {
        try {
            rimraf(url, function () { resolve('removed '+url); });
        } catch(e) {
            reject(e);
        }
    });
};


/** Returns matching files in a path
 * @alias BisGenericIO#getMatchingFiles
 * @param {Object} matchstring - abstract file path
 * @returns {Promise} - the payload is the file list
 */

let getMatchingFiles=function(matchstring) {

    if (fileServerClient) {
        return fileServerClient.getMatchingFiles(matchstring);
    }

    if (inBrowser) {
        return Promise.rejected('getMatchingFiles can not be  done in a  Browser');
    }

    let m=glob.sync(matchstring);
    return Promise.resolved(m);
};

// -------------------------------------------------------------------------------------------------------
/*
Legacy exports -- removed

    readbinarydata : readbinarydata,
    readtextdata : readtextdata,
    writebinarydata : writebinarydata,
    writetextdata : writetextdata,
*/

// Export object
const bisgenericio = {
    // Reexport stuff from core io
    getmode : biscoreio.getmode,
    getenvironment : biscoreio.getenvironment,
    createBuffer : biscoreio.createBuffer,
    getfsmodule : biscoreio.getfsmodule,
    getpathmodule : biscoreio.getpathmodule,
    getosmodule : biscoreio.getosmodule,
    getglobmodule : biscoreio.getglobmodule,
    tozbase64 :  biscoreio.tozbase64,
    fromzbase64 : biscoreio.fromzbase64,
    string2binary : biscoreio.string2binary ,
    binary2string :     biscoreio.binary2string ,
    dataURLToBlob : biscoreio.dataURLToBlob,
    iscompressed :      biscoreio.iscompressed, // ends in .gz
    setWebWorkerScope :     biscoreio.setWebWorkerScope,
    readtextdatafromurl : biscoreio.readtextdatafromurl, // read from url
    readbinarydatafromurl : biscoreio.readbinarydatafromurl, // read from url
    getimagepath : biscoreio.getimagepath,
    // New functions internal to this
    setFileServerObject : setFileServerObject,
    getFileServerObject : getFileServerObject,
    readJSON : readJSON, // Gloabl ReadJSON
    read  : read, // Global Read data
    write : write, // Global Write data
    getFixedSaveFileName : getFixedSaveFileName,
    getFixedLoadFileName : getFixedLoadFileName,
    // Operations needed for Bruker and more
    getFileSize :     getFileSize,
    isDirectory :     isDirectory,
    getMatchingFiles : getMatchingFiles,
    makeDirectory :    makeDirectory,
    deleteDirectory :  deleteDirectory,
};


module.exports = bisgenericio;
