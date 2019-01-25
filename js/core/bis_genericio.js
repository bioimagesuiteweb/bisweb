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

/** 
 * @file Browser/Node Js module. Contains {@link BisGenericIO}.
 * @author Xenios Papademetris
 * @version 1.0
 */

const biscoreio=require('./bis_coregenericio');
const util=require('./bis_util');

const glob=biscoreio.getglobmodule();
const fs=biscoreio.getfsmodule();
const path=biscoreio.getpathmodule();
const rimraf=biscoreio.getrimrafmodule();


// -------------------------------------------------------------------------------------------------------
// File server stuff

let fileServerClient=null;
const inBrowser= biscoreio.getmode() === 'browser';

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
 * @param {String} url - the filename
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
        return Promise.resolve(fileSizeInBytes);
    } catch(e) {
        return Promise.reject(e);
    }
};

/** Checks is a path is a directory
 * @alias BisGenericIO#isDirectory
 * @param {String} url - the directory string
 * @returns {Promise} - the payload is true or false
 */

let isDirectory=function(url) {

    if (fileServerClient) {
        return fileServerClient.isDirectory(url);
    }

    if (inBrowser) {
        return Promise.reject('getFileSize can not be  done in a  Browser');
    }

    let m=true;
    if (!fs.lstatSync(url).isDirectory())
        m=false;
    return Promise.resolve(m);
};

/**
 * Gets the stats object for a file. Currently only for file server.
 * @alias BisGenericIO#getFileStats
 * @param {String} url - the file string
 * @returns {Promise} - promise resolving 
 */
let getFileStats=function(url) {

    console.log('get file stats');
    if (fileServerClient) {
        return fileServerClient.getFileStats(url);
    }

    if (inBrowser) {
        return Promise.reject('getFileStats cannot be done in a Browser');
    }

    let m=fs.lstatSync(url);
    return Promise.resolve(m);
};

/** Create the directory in url
 * @alias BisGenericIO#makeDirectory
 * @param {String} url - the directory string
 * @returns {Promise} - the payload is true or false
 */

let makeDirectory=function(url) {

    if (fileServerClient) {
        return fileServerClient.makeDirectory(url);
    }

    if (inBrowser) {
        return Promise.reject('getFileSize can not be  done in a  Browser');
    }

    let m=false;
    if (!fs.existsSync(url)){
        fs.mkdirSync(url);
        m=true;
    }
    return Promise.resolve(m);
};

/** Checks is a path is a directory, then deletes it if it can
 * @alias BisGenericIO#deleteDirectory
 * @param {String} url - the directory name
 * @returns {Promise} - the payload is true or false
 */
let deleteDirectory=function(url) {

    if (fileServerClient) {
        return fileServerClient.deleteDirectory(url);
    }

    if (inBrowser) {
        return Promise.reject('getFileSize can not be  done in a  Browser');
    }
    
    if (!fs.lstatSync(url).isDirectory())
        return Promise.reject(url+' is not a directory');

    return new Promise( (resolve,reject) => {
        try {
            rimraf(url, function () { resolve('removed '+url); });
        } catch(e) {
            reject(e);
        }
    });
};

/**
 * Tries to move a directory from source to destination. Currently only for fileserver. 
 * 
 * @alias BisGenericIO#moveDirectory
 * @param {String} url - name of source and destination, separated by '&&'
 * @returns {Promise} - the payload is true or false
 */
let moveDirectory=function(url) {

    if (fileServerClient) {
        return fileServerClient.moveDirectory(url);
    }

    if (inBrowser) {
        return Promise.reject('moveDirectory can not be  done in a  Browser');
    }

    let splitNames = splitFilenames(url);
    let src = splitNames[0], dest = splitNames[1];

    if (!fs.lstatSync(src).isFile())
        return Promise.reject(src + ' does not describe a file, cannot move it.');
    
    return new Promise( (resolve, reject) => {
        fs.copyFile(src, dest, (err) => {
            if (err) { console.log('Encountered an error trying to move file', src, err); reject(false); return; }
            fs.unlink(src, (err) => {
                if (err) { console.log('Encountered an error trying to delete', src, err); reject(false); return; }

                console.log('Move file operation successful');
                resolve(true);
            });
        });
    });
};
 
/** Copies a single file
 * @param {String} url - Source and destination 
 * @returns {Promise} without payload
 */

let copyFile=function(url) {

    if (fileServerClient) {
        try {
            return fileServerClient.copyFile(url);
        } catch (e) {
            return Promise.reject('No copy file functionality');
        }
    }

    if (inBrowser) {
        return Promise.rejected('copyFile can not be  done in a  Browser');
    }

    let splitNames = splitFilenames(url);
    let src = splitNames[0], dest = splitNames[1];

    // https://stackoverflow.com/questions/11293857/fastest-way-to-copy-file-in-node-js
    let rd = fs.createReadStream(src);
    let wr = fs.createWriteStream(dest);
    return new Promise(function(resolve, reject) {
        rd.on('error', reject);
        wr.on('error', reject);
        wr.on('finish', resolve);
        try {
            rd.pipe(wr);
        } catch(e) {
            rd.destroy();
            wr.end();
            reject(e);
        }
    });
            
              
};

/** Returns matching files in a path
 * @alias BisGenericIO#getMatchingFiles
 * @param {String} matchstring - the query string
 * @returns {Promise} - the payload is the file list
 */

let getMatchingFiles=function(matchstring) {

    if (fileServerClient) {
        return fileServerClient.getMatchingFiles(matchstring);
    }

    if (inBrowser) {
        return Promise.reject('getMatchingFiles can not be  done in a  Browser');
    }

    let m=glob.sync(matchstring);
    return Promise.resolve(m);
};

/** Returns the base name of a file (i.e. strips out the directory)
 * @alias BisGenericIO#getBaseName
 * @param {String} fname - the filename
 * @param {Boolean} forceinternal - if true use internal implementation (not path in node.js)
 * @returns {string} - the base name
 */
let getBaseName=function(fname,forceinternal=false) {
    if (!inBrowser && !forceinternal) {
        return path.basename(fname);
    }
    fname=util.filenameWindowsToUnix(fname);
    let q=fname.split('/');
    return q[q.length-1];
};

/** Returns the directory part of the name of a file (i.e. strips out the basename)
 * @alias BisGenericIO#getDirectoryName
 * @param {String} fname - the filename
 * @param {Boolean} forceinternal - if true use internal implementation (not path in node.js)
 * @returns {string} - the directory name
 */
let getDirectoryName=function(fname,forceinternal=false) {
    if (!inBrowser && !forceinternal) {
        return path.dirname(fname);
    }
    fname=util.filenameWindowsToUnix(fname);
    let i=fname.lastIndexOf('/');
    if (i<0)
        return fname;
    return fname.substr(0,i);
};

/** Returns a normalized filename (removes ../ and makes absolute)
 * @alias BisGenericIO#getNormalizedFilename
 * @param {String} fname - the filename
 * @param {Boolean} forceinternal - if true use internal implementation (not path in node.js)
 * @returns {string} - the normalized name
 */

let getNormalizedFilename=function(fname,root="",forceinternal=false) {
    if (!inBrowser && !forceinternal) {
        if (root==="")
            return path.resolve(path.normalize(fname));
        return path.normalize(fname);
    }

    // console.log('---\n---\nInitial fname=',fname);
    
    fname=util.filenameWindowsToUnix(fname);
    
    // First replace '/./' with '/'
    // eslint-disable-next-line no-useless-escape
    fname=fname.trim().replace(/\/\.\//g,'\/');   
    // console.log('fname=',fname);
    
    let ind1=fname.indexOf(root+'/');
    let ind2=fname.indexOf('..');
    if (ind1===0 && ind2<0)
        return fname;  // nothing to do

    // console.log('\n ------------- Beginning \n');
    
    fname=root+fname;
    let parts=fname.split('/');
    
    // console.log('fname=',fname,'\n\t parts='+parts.join("__")+'\n');
    
    let j=parts.length-1;
    while (j>=0) {
        if (parts[j].length<1) {
            parts.splice(j,1);
            j=parts.length-1;
        } else if (parts[j]=="..") {
            // console.log('\t\t before ',j,parts[j],' -->',parts.join('/'));
            
            if (j>0) {
                let k=j-1,done=false;
                while(k>=0 && done===false) {
                    if (parts[k]!=="..")
                        done=true;
                    else
                        k=k-1;
                }
                if (done) {
                    let diff=j-k;
                    parts.splice(j-2*diff+1,2*diff);
                    // console.log('\t\t\t after ',parts.join(' / '));
                    j=j-2*diff;
                }
            } else {
                parts.splice(j,1);
                // console.log('\t\t\t after ',parts.join(' / '));
                j=j-1;
            }
        } else {
            j=j-1;
        }
        // console.log('J=',j,' parts=',parts.join('__'),parts.length);
    }

    let out='/'+parts.join('/');
    // console.log('Returning fname=',out);
    //console.log('\n ------------- Done \n');
    return out;
};

/** Returns a joined file name (path.join)
 * @alias BisGenericIO#joinFilenames
 * @param {String} path1 - the first path
 * @param {String} path2 - the seconf path
 * @param {Boolean} forceinternal - if true use internal implementation (not path in node.js)
 * @returns {string} - the normalized name
 */
let joinFilenames=function(path1,path2,forceinternal=false) {
    if (!inBrowser && !forceinternal) {
        return path.join(path1,path2);
    }
    
    return util.filenameWindowsToUnix(path1+'/'+path2);
};

/** Returns the path separator , either path.sep or '/'
 * @alias BisGenericIO#getPathSeparator
 * @returns {string} - the path separator
 */
let getPathSeparator=function() {
    if (!inBrowser) 
        return path.sep;
    
    return '/';
};


/** isSaveDownload -- if we are in a browser and not using a fileserver or the cloud then 
    save operations are download ops
    @returns{Boolean} - true or false
*/
let isSaveDownload =function() {

    if (inBrowser && fileServerClient===null)
        return true;

    return false;
};


// TODO: Let's rename this to dicomConversion
/**
 * Runs file conversion for a given filetype using server utilities. 
 * 
 * @param {Object} params - Parameter object for the file conversion. 
 * @param {String} params.fileType - The type of the file to convert from. Currently supports 'dicom'.
 * @param {String} params.inputDirectory - The input directory to run file conversions in. 
 */
let runFileConversion = (params) => {

    /*let updateFn = (obj) => {
        console.log('update fn', obj);
    };*/

    return new Promise( (resolve, reject) => {
        if (fileServerClient) {
            if (params.fileType === 'dicom') {
                fileServerClient.runModule('dicomconversion', params, console.log, true)
                    .then((obj) => {
                        console.log('Conversion done', obj);
                        resolve(obj);
                    }).catch((e) => { reject(e); });
            } else {
                reject('Error: unsupported file type', params.fileType);
            }
        } else {
            reject('No fileserver client defined');
        }
    });
};
/**
 * Makes a SHA256 checksum for a given image file. Currently only functional if a file server is specified.
 * Note that this function only works when calling from the web environment. Bisweb modules calculate their own checksums due to genericio not being directly compatible with modules.
 * 
 * @param {String} url - Filename of image to make checksum for.
 * @returns Promise that will resolve the checksum, or false if no file server client is specified.
 */
let makeFileChecksum = (url) => {

    if (fileServerClient) {
        return fileServerClient.runModule('makechecksum', { 'url' : url });
    } else if (inBrowser) {
        console.log('Cannot perform makeFileChecksum without a file server client.');
        return false;
    } 

    return new Promise( (resolve, reject) => {
        read(url, true).then( (obj) => {
            let hash = util.SHA256(obj.data);
            //resolves data structure in an 'output' field for cross-compatibility with objects returned by the server
            if (hash) { resolve( { 'output' : { 'hash' : hash, 'filename' : url } } ); }

            reject(hash);
        }).catch( (e) => {
            reject(e);
        });
    });
};

/**
 * Splits a filename concatenated by the symbol '&&' into two names.
 * 
 * @param {String} url - Two filenames, concatenated by '&&'.
 * @returns Array of filenames.
 */
let splitFilenames = (url) => {
    return url.split('&&');
};

// -------------------------------------------------------------------------------------------------------

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
    getcolorsmodule : biscoreio.getcolorsmodule,
    getchildprocessmodule : biscoreio.getchildprocessmodule,
    tozbase64 :  biscoreio.tozbase64,
    fromzbase64 : biscoreio.fromzbase64,
    string2binary : biscoreio.string2binary ,
    binary2string :     biscoreio.binary2string ,
    dataURLToBlob : biscoreio.dataURLToBlob,
    iscompressed :      biscoreio.iscompressed, // ends in .gz
    inIOS : biscoreio.inIOS, // are we running in iOS Safari
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
    copyFile :     copyFile,
    getFileSize :     getFileSize,
    getFileStats:     getFileStats,
    isDirectory :     isDirectory,
    getMatchingFiles : getMatchingFiles,
    makeDirectory :    makeDirectory,
    deleteDirectory :  deleteDirectory,
    moveDirectory : moveDirectory,
    // Filename operations
    getBaseName : getBaseName,
    getDirectoryName : getDirectoryName,
    getNormalizedFilename : getNormalizedFilename,
    joinFilenames : joinFilenames,
    getPathSeparator : getPathSeparator,
    //
    isSaveDownload : isSaveDownload,
    runFileConversion : runFileConversion,
    makeFileChecksum : makeFileChecksum,
};


module.exports = bisgenericio;
