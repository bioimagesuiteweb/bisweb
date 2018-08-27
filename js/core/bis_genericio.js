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

/* global window,XMLHttpRequest,Blob,process,FileReader, WorkerGlobalScope*/
"use strict";

/** 
 * @file Browser/Node Js module. Contains {@link BisGenericIO}.
 * @author Xenios Papademetris
 * @version 1.0
 */


let filesaver, fs = null, zlib, nodewin = {}, path = null, os=null,glob=null;
let environment = '';
let inelectron = false;

let webWorkerScope;
let fileServerClient=null;

if (typeof (window) !== "undefined") {
    if (typeof (window.BISELECTRON) !== "undefined") {
        inelectron = true;
    }
}

let pako = require('pako');
let webpack = process.browser || false;

if (!webpack) {
    fs = require('fs');
    zlib = require('zlib');
    path = require('path');
    os = require('os');
    glob = require('glob');
    environment = 'node';
    nodewin.atob = require('atob');
    nodewin.btoa = require('btoa');
} else {
    try  {
        filesaver = require('FileSaver');
        console.log("++++ In Browser");
    }
    catch(e)  {
/*        if (typeof ( WorkerGlobalScope ) !== "undefined") {
            console.log("++++ In WebWorker");
        }*/
    }
    environment = 'browser';
}


var createBuffer = function (cdata) {
    if (cdata === null)
        return null;
    /* jshint ignore:start */
    return new Buffer(cdata);
    /* jshint ignore:end */
};


if (inelectron) {
    fs = window.BISELECTRON.fs;
    zlib = window.BISELECTRON.zlib;
    path = window.BISELECTRON.path;
    os = window.BISELECTRON.os;
    glob = window.BISELECTRON.glob;
    environment = 'electron';
    createBuffer = function (cdata) {
        return new window.BISELECTRON.Buffer(cdata);
    };
}


const setWebWorkerScope=function(w) {
    webWorkerScope=w;
};

const setFileServerObject=function(obj) {
    fileServerClient=obj;
};


/**
 * converts dataURL to a blob for saving
 * URL often created using canvas.toDataURL("image/png");
 * @alias BisGenericIO#dataURLToBlob
 * @param{URL} - dataURL 
 * @returns{Blob}
 */
const dataURLToBlob = function(dataURL) {
    var BASE64_MARKER = ';base64,';
    var parts,contentType,raw;
    if (dataURL.indexOf(BASE64_MARKER) == -1) {
        parts = dataURL.split(',');
        contentType = parts[0].split(':')[1];
        raw = decodeURIComponent(parts[1]);
        return new Blob([raw], {type: contentType});
    }
    
    parts = dataURL.split(BASE64_MARKER);
    contentType = parts[0].split(':')[1];
    raw = window.atob(parts[1]);
    var rawLength = raw.length;
    
    var uInt8Array = new Uint8Array(rawLength);
    
    for (var i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], {type: contentType});
};


//console.log('//+++++ I/O='+environment);

/**
 * A set of I/O helper functions to read and write text and binary data from/to various sources
 * This aims to abstract all I/O operations in BioImage Suite to a single location behind 
 * a set of four functions readtext, readbinary, writetext and writebinary
 * @namespace BisGenericIO
 */


/** This is a type of function that is used as a callback from binary data loading
 * @function 
 * @name BisGenericIO.BinaryDataRead
 * @param {Uint8Array} data - the data that was read
 * @param {string} url - the filename/url that was read
 */

/** This is a type of function that is used as a callback from text data loading
 * @function 
 * @name BisGenericIO.TextDataRead
 * @param {string} data - the data that was read
 * @param {string} url - the filename/url that was read
 */

/** This is a type of function that is used as a callback from i/o operations either for error or success
 * @function 
 * @name BisGenericIO.MessageCallback
 * @param {string} message - a message about the operation
 */


// -------------------------------------------- Utilities ---------------------------------------------------------------------

/** is compressed. Checks if filename ends in .gz
 * @alias BisGenericIO#iscompressed
 * @param {string} url - the filename or url
 * @returns {boolean} 
 */
var iscompressed = function (fname) {

    fname = fname || '';
    try {
        let ext = fname.name ? fname.name.split('.').pop() : fname.split('.').pop();
        if (ext === "gz")
            return true;
        return false;
    } catch(e) {
        return true;
    }
};



/** Convert Uint8array to zbase64
 * @alias BisGenericIO#tozbase64
 * @param {Uint8Array} input -- input string
 * @param {boolean} dogzip -- if true (default) compress
 * @returns {string} -- zbase64 (or base64) encoded string
 */
var tozbase64 = function (arr,dogzip=true) {

    let z_arr=arr;
    if (dogzip)
        z_arr = pako.gzip(arr);

    let binary = '';
    let bytes = z_arr;
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    if (typeof ( WorkerGlobalScope ) !== "undefined") {
        return  webWorkerScope.btoa(binary);
    }
    
    if (environment === 'node') {
        return nodewin.btoa(binary);
    }

    return window.btoa(binary);
};

/** convert zbase64 encoded string to Uint8Array
 * @alias BisGenericIO#frombase64
 * @param {string} str -- zbase64 or base64 encoded string
 * @param {boolean} dogzip -- if true (default) uncompress else string is simply base64 encoded
 * @returns {Uint8Array}  -- binary data
 */
var fromzbase64 = function (str,dogzip=true) {
    let arr=null;

    if (typeof ( WorkerGlobalScope ) !== "undefined") 
        arr=  webWorkerScope.atob(str);
    else if (environment === 'node')
        arr = nodewin.atob(str);
    else
        arr = window.atob(str);
    if (dogzip)
        return pako.ungzip(arr);
    return arr;
};

/** convert string to binary
 * @alias BisGenericIO#string2binary
 * @param {string} str -- string
 * @param {boolean} donifti -- if true (default=false) make output a multple of 16 and add header
 * @returns {Uint8Array} data
 */
let string2binary=function(str,donifti=false) {

    str=str+" ";
    let l=str.length+1;
    if (donifti) {
        let l2=Math.floor(l/16);
        let diff=16-(l-l2*16);
        if (diff>0) {
            let s2="";
            for (let i=0;i<diff;i++)
                s2+=" ";
            str=str+s2;
        }
    }

    let offset=0;
    let extra=0;
    if (donifti) {
        offset=8;
        extra=8;
    }

    let arr = new Uint8Array(str.length+offset+extra+1); 
    for (let i=0;i < str.length; i++) {
        arr[i+offset] = str.charCodeAt(i);
    }
    arr[str.length+offset]=0;
    
    if (donifti) {
        let arr2=new Uint32Array(arr.buffer);
        arr2[0]=arr.length;
        arr2[1]=4;
    }
    
    return arr;


};

/** convert string to binary
 * @alias BisGenericIO#binary2string
 * @param {Uint8Array} arr -- Uint8Array
 * @param {boolean} donifti -- if true (default=false) skip 8 byte offset
 * @returns {String} data
 */
let binary2string=function(arr,donifti) {

    let str="";
    let len = arr.length-1;

    let offset=0;
    if (donifti)
        offset=8;
    
    for (let i = offset; i < len; i++) {
        if (arr[i]>0)
            str += String.fromCharCode(arr[i]);
    }
    return str;
};


// -------------------------------------------- Read Node ---------------------------------------------------------------------

/** read text data in node.js
 * @alias BisGenericIO~readtextdatanode
 * @param {string} filename - the filename
 * @param {BisGenericIO.TextDataRead} callback - callback function (arguments = data,filename)
 * @param {BisGenericIO.MessageCallback} errror - error callback function
 */
var readtextdatanode = function (filename, loadedcallback, errorcallback) {

    try {
        fs.readFile(filename, 'utf-8', (err, d1) => {
            if (err) {
                errorcallback(err);
            } else {               
                loadedcallback(d1, filename);
            }
        });
    } catch (e) {
        errorcallback('failed to load from ' + filename);
    }
};

/** read binary data in node.js
 * if filename ends in .gz also decompress.
 * @alias BisGenericIO~readbinarydatanode
 * @param {string} filename - the filename
 * @param {BisGenericIO.BinaryDataRead} callback - callback function
 * @param {BisGenericIO.MessageCallback} errror - error callback function
 */
var readbinarydatanode = function (filename, loadedcallback, errorcallback) {

    try {
        fs.readFile(filename,  (err, d1) => {
            if (err) {
                console.log(' failed to read binary data error=' + err);
                errorcallback(' failed to read binary data error=' + err);
            }
            
            let comp = iscompressed(filename);
            if (comp) {
                zlib.gunzip(d1, function (err, data) {
                    if (err) {
                        console.log(' failed to read binary data error=' + err.toString);
                        errorcallback(' failed to read binary data error=' + err.toString);
                    }
                    var dt = new Uint8Array(data);
                    loadedcallback(dt, filename);
                    dt = null;
                });
            } else {
                let dt = new Uint8Array(d1).buffer;
                loadedcallback(dt, filename);
                dt = null;
        }
        });
    } catch(e) {
        errorcallback(e);
    }
};

// -------------------------------------------- Read Browser ---------------------------------------------------------------------

// -------------------------------------------------------------------------------------
/** read text data in browser.
 * @alias BisGenericIO~readtextdatabrowser
 * @param {Blob} file - the file object
 * @param {BisGenericIO.TextDataRead} callback - callback function
 * @param {BisGenericIO.MessageCallback} errror - error callback function
 */
var readtextdatabrowser = function (file, loadedcallback, errorcallback) {

    var reader = new FileReader();
    var url = file.name;

    reader.onerror = function (e) {
        errorcallback('failed to read ' + file.name + ' e=' + e);
    };

    reader.onload = function (e) {
        loadedcallback(e.target.result, url);
    };

    reader.readAsText(file);
    return false;
};

/** read binary data in browser.
 * if filename ends in .gz also decompress.
 * @alias BisGenericIO~readbinarydatabrowser
 * @param {string} file - the file object
 * @param {BisGenericIO.BinaryDataRead} callback - callback function
 * @param {BisGenericIO.MessageCallback} errror - error callback function
 */
var readbinarydatabrowser = function (file, loadedcallback, errorcallback) {

    var reader = new FileReader();
    var url = file.name;
    var comp = iscompressed(url);

    reader.onerror = function (e) {
        errorcallback('failed to read ' + file.name + ' e=' + e);
    };

    reader.onload = function (e) {

        var dat = new Uint8Array(e.target.result);
        if (!comp) {
            loadedcallback(dat, url);
            dat = null;
            return;
        }

        var a = pako.ungzip(dat);
        loadedcallback(a, url);
        a = null;
        dat = null;
    };

    reader.readAsArrayBuffer(file);
    return false;
};

// -------------------------------------------- Read URL ---------------------------------------------------------------------

/** read text data from url.
 * @alias BisGenericIO~readtextdataurl
 * @param {string} url - the url
 * @param {BisGenericIO.TextDataRead} callback - callback function
 * @param {BisGenericIO.MessageCallback} errror - error callback function
 */
var readtextdatafromurl = function (url, loadedcallback, errorcallback, requestheader = null, realname = null) {

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'text';

    if (requestheader !== null)
        xhr.setRequestHeader('Authorization', 'Bearer ' + requestheader);

    let actualname = realname || url;

    xhr.onload = function () {
        if (this.status == 200) {
            loadedcallback(xhr.response, actualname);
        } else {
            errorcallback('failed to read ' + url);
        }
        return false;
    };

    xhr.onerror = function () {
        errorcallback('Failed to get url=' + url);
    };

    xhr.send();
    return false;
};

/** read binary data from url.
 * if filename ends in .gz also decompress.
 * @alias BisGenericIO~readbinarydataurl
 * @param {string} url - the url
 * @param {BisGenericIO.BinaryDataRead} callback - callback function
 * @param {BisGenericIO.MessageCallback} errror - error callback function
 */
var readbinarydatafromurl = function (url, loadedcallback, errorcallback, requestheader = null, realname = null) {

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    if (requestheader !== null)
        xhr.setRequestHeader('Authorization', 'Bearer ' + requestheader);

    let actualname = realname || url;
    let comp = iscompressed(actualname);

    xhr.onload = function () {
        if (this.status == 200) {
            var arr = new Uint8Array(xhr.response);
            if (!comp) {
                loadedcallback(arr, actualname);
            } else {
                var a = pako.ungzip(arr);
                loadedcallback(a, actualname);
                a = null;
            }
            arr = null;
        } else {
            errorcallback(url);
        }
        return false;
    };

    xhr.onerror = function () {
        errorcallback('Failed to get url=' + url);
    };

    xhr.send();
    return false;
};

// -------------------------------------------- Write Node ---------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------
/** write text data in node.js
 * if filename ends in .gz also compress.
 * @alias BisGenericIO~writetextdatanode
 * @param {string} filename - the filename
 * @param {string} data - the data to write
 * @param {BisGenericIO.MessageCallback} donecallback - callback function if done
 * @param {BisGenericIO.MessageCallback} errror - error callback function
 */
var writetextdatanode = function (filename, data, donecallback, errorcallback) {
    //  console.log('//----- write textdata node, type of data =',typeof(data));
    donecallback = donecallback || null;
    errorcallback = errorcallback || console.log;
    try {
        fs.writeFile(filename, data, (err) => {
            if (err) {
                errorcallback('Failed to save in ' + filename+' '+err);
            }
            if (donecallback !== null)
                donecallback(filename);
        });
    } catch (e) {
        errorcallback('Failed to save in ' + filename);
    }
};

/** write binary data in node.js
 * if filename ends in .gz also compress.
 * @alias BisGenericIO~writebinarydatanode
 * @param {string} filename - the filename
 * @param {Uint8Array} data - the data to write (or optionally array)
 * @param {BisGenericIO.MessageCallback} donecallback - callback function if done
 * @param {BisGenericIO.MessageCallback} errror - error callback function
 */
var writebinarydatanode = function (filename, data, donecallback, errorcallback) {

 
    let donecompressing = function (cdata, mode) {
        try {
            let fd = fs.openSync(filename, 'w');
            let buf = createBuffer(cdata);
            fs.write(fd, buf, 0, buf.length, (err) => {
                if (err) {
                    errorcallback('failed to save : ' + err);
                }  else {
                    fs.close(fd, (err) => {
                        if (err) {
                            errorcallback('failed to save : ' + err);
                        } else {
                            donecallback('saved in ' + filename + ' (file size=' + fs.statSync(filename)['size'] + ' '+mode+')');
                        }
                    });
                }
            });
        } catch (e) {
            errorcallback('failed to save : ' + e);
        }
    };

    if(iscompressed(filename)) {
        let buf = createBuffer(data);
        zlib.gzip(buf, function (err, data) {
            if (err) {
                console.log("---- Compression failed");
                errorcallback(' failed to save in ' + filename + ' err=' + err);
                buf = null;
                return;
            }
            donecompressing(data, true);
        });
        buf = null;
    } else {
        donecompressing(data, false);
    }

};


// -------------------------------------------- Write Browser ---------------------------------------------------------------------

/** write text data in browser.
 * if filename ends in .gz also compress.
 * @alias BisGenericIO~writetextdatabrowser
 * @param {string} filename - the filename
 * @param {string} data - the data to write
 * @param {BisGenericIO.MessageCallback} donecallback - callback function if done
 */
var writetextdatabrowser = function (filename, data, donecallback) {

    donecallback = donecallback || console.log;

    var blob = new Blob([data], { type: "text/plain" });

    filesaver(blob, filename);
    donecallback('');
};

/** write binary data in browser.
 * if filename ends in .gz also compress.
 * @alias BisGenericIO~writebinarydatabrowser
 * @param {string} filename - the filename
 * @param {Uint8Array} data - the data to write (or optionally array)
 * @param {BisGenericIO.MessageCallback} donecallback - callback function if done
 */
var writebinarydatabrowser = function (filename, data, donecallback) {
    donecallback = donecallback || console.log;


    var blob = null;
    var iscomp = iscompressed(filename);
    if (iscomp) {
        var compressed = pako.gzip(data);
        blob = new Blob([compressed]);
    } else {
        blob = new Blob([data]);
    }

    filesaver(blob, filename);
    donecallback('');
};


// -------------------------------------------------------------------------------------------------
// Upload Methods
// -------------------------------------------------------------------------------------------------
/**
 * Attempts to upload the file to the cloud provider specified in file. Invokes the 'uploadFile' method of module to perform the action.
 * @param {Object} file 
 * @param {Object} module
 */
/*let uploadFile = function (file, module) {
  module.uploadFile(file);
  };*/

// -------------------------------------------------------------------------------------------------
// Combo Methods
// -------------------------------------------------------------------------------------------------

/** Generic read text data. Depending on environment and url calls one of 
 * {@link BisGenericIO~readtextdatanode}, {@link BisGenericIO~readtextdatabrowser}, {@link BisGenericIO~readtextdataurl}
 * @alias BisGenericIO#readtextdata
 * @param {object} url - the url or filename or file object
 * @param {BisGenericIO.TextDataRead} callback - callback function
 * @param {BisGenericIO.MessageCallback} errror - error callback function
 */
var readtextdata = function (url, loadedcallback, errorcallback) {

    url = url || null;
    if (url === null) {
        errorcallback('no filename/url specified');
        return;
    }

    if (environment === 'node') {
        return readtextdatanode(url, loadedcallback, errorcallback);
    }

    if (environment === 'electron') {
        return readdataelectron(url, false, loadedcallback, errorcallback);
    }

    if (url.name !== undefined) {
        return readtextdatabrowser(url, loadedcallback, errorcallback);
    }

    return readtextdatafromurl(url, loadedcallback, errorcallback);
};

/** Generic read binary data. Depending on environment and url calls one of 
 * {@link BisGenericIO~readbinarydatanode}, {@link BisGenericIO~readbinarydatabrowser}, {@link BisGenericIO~readbinarydataurl}
 * @alias BisGenericIO#readbinarydata
 * @param {object} url - the url or filename or file object
 * @param {BisGenericIO.BinaryDataRead} callback - callback function
 * @param {BisGenericIO.MessageCallback} errror - error callback function
 */
var readbinarydata = function (url, loadedcallback, errorcallback) {

    url = url || null;
    if (url === null) {
        errorcallback('no filename/url specified');
        return;
    }

    if (environment === 'node') {
        return readbinarydatanode(url, loadedcallback, errorcallback);
    }

    if (environment === 'electron') {
        return readdataelectron(url, true, loadedcallback, errorcallback);
    }

    if (url.name !== undefined) {
        // We are in browser and have received a Files[] array
        //          console.log('Now reading binary data in browser',url);
        return readbinarydatabrowser(url, loadedcallback, errorcallback);
    }



    return readbinarydatafromurl(url, loadedcallback, errorcallback);
};

/*


// -------------------------------------------------------------------------------------------------

/** Write data for electron Depending on environment
 * @alias BisGenericIO#writedataelectron
 * @param {string} url - the url or filename or object of form
 * { title: 'dialog tile', filter  : filters, ', filename : initial filename }
 * @param {boolean} isbinary - if true write binary data
 * @param {string} data - the data to write (or optionally array)
 * @param {BisGenericIO.MessageCallback} callback - callback function if done
 * @param {BisGenericIO.MessageCallback} errror - error callback function
 */
var writedataelectron = function (url, data, isbinary, donecallback, errorcallback) {

    //  console.log('//+++++ in writedataelectron binary='+isbinary);
    var writecommand = writetextdatanode;
    if (isbinary)
        writecommand = writebinarydatanode; //window.BISELECTRON.writebinarydata;

    if (url.filename !== undefined) {
        window.BISELECTRON.dialog.showSaveDialog(null, {
            title: url.title,
            defaultPath: url.filename,
            filters: url.filters
        }, function (filename) {
            if (filename) {
                return writecommand(filename + '', data, donecallback, errorcallback);
            }
        });
    } else {
        return writecommand(url, data, donecallback, errorcallback);
    }
    return;
};

/** Write data for electron Depending on environment
 * @alias BisGenericIO#writedataelectron
 * @param {string} filename - the url or filename or object of form
 * { title: 'dialog tile', filter  : filters, ', filename : initial filename }
 * @param {boolean} isbinary - if true read binary data
 * @param {BisGenericIO.MessageCallback} donecallback - callback function if done
 * @param {BisGenericIO.MessageCallback} errrorcallback - error callback function
 */
var readdataelectron = function (url, isbinary, donecallback, errorcallback) {

    var readcommand = readtextdatanode;
    if (isbinary)
        readcommand = readbinarydatanode;


    if (url.path !== undefined) {
        //          console.log('//+++++ using url.path='+url.path);
        return readcommand(url.path, donecallback, errorcallback);
    }

    if (url.filename !== undefined) {
        window.BISELECTRON.dialog.showOpenDialog(null, {
            title: url.title,
            defaultPath: url.filename,
            filters: url.filters,
        }, function (filename) {
            if (filename) {
                return readcommand(filename + '', donecallback, errorcallback);
            }
        });
    } else {
        var path = window.BISELECTRON.path;
        var newurl = url + '';
        if (path.resolve(url) !== path.normalize(url))
            newurl = path.resolve(window.BISELECTRON.bispath, url);
        //          console.log('//+++++ normalized as url='+newurl+' from '+url);
        return readcommand(newurl, donecallback, errorcallback);
    }
    return;
};

/** Generic write text data. Depending on environment
 * {@link BisGenericIO~writetextdatanode} or {@link BisGenericIO~writetextdatabrowser}
 * @alias BisGenericIO#writetextdata
 * @param {string} filename - the url or filename or file object
 * @param {string} data - the data to write (or optionally array)
 * @param {BisGenericIO.MessageCallback} callback - callback function if done
 * @param {BisGenericIO.MessageCallback} errror - error callback function
 */

var writetextdata = function (url, data, donecallback, errorcallback) {

    url = url || null;
    if (url === null) {
        errorcallback('no filename/url specified');
        return;
    }

    if (environment === 'node') {
        return writetextdatanode(url, data, donecallback, errorcallback);
    }

    if (environment === 'electron') {
        return writedataelectron(url, data, false, donecallback, errorcallback);
    }

    var filename = url;
    if (url.filename !== undefined)
        filename = url.filename;

    return writetextdatabrowser(filename, data, donecallback, errorcallback);
};

/** Generic write binary data. Depending on environment
 * {@link BisGenericIO~writebinarydatanode} or {@link BisGenericIO~writebinarydatabrowser}
 * @alias BisGenericIO#writebinarydata
 * @param {string} filename - the url or filename or file object or an electron object with members 
 * { title: 'dialog tile', filter  : filters, ', filename : initial filename }
 * @param {Uint8Array} data - the data to write (or optionally array)
 * @param {BisGenericIO.MessageCallback} callback - callback function if done
 * @param {BisGenericIO.MessageCallback} errror - error callback function
 */
var writebinarydata = function (url, data, donecallback, errorcallback) {

    url = url || null;
    if (url === null) {
        errorcallback('no filename/url specified');
        return;
    }

    if (environment === 'node') {
        return writebinarydatanode(url, data, donecallback, errorcallback);
    }

    if (environment === 'electron') {
        return writedataelectron(url, data, true, donecallback, errorcallback);
    }

    var filename = url;
    if (url.filename !== undefined)
        filename = url.filename;

    return writebinarydatabrowser(filename, data, donecallback, errorcallback);
};

/** Return the fs package to use
 * @alias BisGenericIO#getfsmodule
 * @returns{Module} 
 */
var getfsmodule = function () {
    return fs;
};



/** Return the path package to use
 * @alias BisGenericIO#getpathmodule
 * @returns{Module} 
 */
var getpathmodule = function () {
    return path;
};

/** Return the path package to use
 * @alias BisGenericIO#getosmodule
 * @returns{Module} 
 */
var getosmodule = function () {
    return os;
};

/** Return the path package to use
 * @alias BisGenericIO#getglobmodule
 * @returns{Module} 
 */
var getglobmodule = function () {
    return glob;
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
            console.log('\n\n Reading from server');
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
            readbinarydata(url, success, failure);
        } else {
            readtextdata(url, success, failure);
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
            let p=url.responseFunction(url, data, isbinary);
            console.log(p);
            return p;
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
            writebinarydata(url, data, success, failure);
        else
            writetextdata(url, data, success, failure);
    });
};

/** Fixes the save filename depending on whether we have a string, a mouse event, or a FILE 
 * Essentially if this is an object only use it if has a .name member, else replace it
 * @alias BisGenericIO.fixSaveFilename
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
 * @alias BisGenericIO.getLoadFilename
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

let getimagepath=function() {

    let imagepath="";
    if (typeof window !== "undefined") {
        let scope=window.document.URL.split("?")[0];
        let index=scope.lastIndexOf("/");
        if (scope.indexOf("external")>0)  {
            scope=scope.substr(0,index)+"/../src/web/images";
            console.log('external=',external,scope);
        } else {
            scope=scope.substr(0,index)+"/images";
        }
        imagepath=scope;
    } else {
        
        const path=getpathmodule();
        console.log('Dirname=',__dirname);
        imagepath=path.resolve(__dirname, '../../web/images');
        if (!fs.existsSync(imagepath))
            imagepath=path.resolve(__dirname, '../images');
    }


    return imagepath;
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
    getmode : function() { return environment;},
    getenvironment : function() { return environment;},
    createBuffer : createBuffer,
    getfsmodule : getfsmodule,
    getpathmodule : getpathmodule,
    getosmodule : getosmodule,
    getglobmodule : getglobmodule,
    tozbase64 : tozbase64,
    fromzbase64 : fromzbase64,
    string2binary :     string2binary ,
    binary2string :     binary2string ,
    dataURLToBlob : dataURLToBlob,
    iscompressed :      iscompressed, // ends in .gz
    setWebWorkerScope :     setWebWorkerScope,
    setFileServerObject : setFileServerObject,
    readtextdatafromurl : readtextdatafromurl, // read from url
    readbinarydatafromurl : readbinarydatafromurl, // read from url
    readJSON : readJSON, // Gloabl ReadJSON
    read  : read, // Global Read data
    write : write, // Global Write data
    getFixedSaveFileName : getFixedSaveFileName,
    getFixedLoadFileName : getFixedLoadFileName,
    getimagepath : getimagepath,
};


module.exports = bisgenericio;
