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
 * @file Browser/Node Js module. Contains {@link BisCoreGenericIO}.
 * @author Xenios Papademetris
 * @version 1.0
 */


let filesaver, fs = null, zlib, nodewin = {}, path = null, os=null,glob=null,rimraf=null,noderequest=null,colors=null,child_process=null;
let environment = '';
let inelectron = false;
let webWorkerScope;

if (typeof (window) !== "undefined") {
    if (typeof (window.BISELECTRON) !== "undefined") {
        inelectron = true;
    }
}

let pako = require('pako');
let webpack = process.browser || false;
const bisexternals=require('bis_externals');

if (!webpack) {

    fs = bisexternals['fs'];
    zlib = bisexternals['zlib'];
    path = bisexternals['path'];
    os = bisexternals['os'];
    noderequest = bisexternals['request'];
    glob = bisexternals['glob'];
    rimraf= bisexternals['rimraf'];
    nodewin.atob = bisexternals['atob'];
    nodewin.btoa = bisexternals['btoa'];
    child_process= bisexternals['child_process'];
    colors= bisexternals['colors'];
    environment = 'node';
} else {
    try  {
        filesaver = bisexternals['FileSaver'];
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
    if (Buffer.from && Buffer.from !== Uint8Array.from) {
        return  Buffer.from(cdata);
    } 

    return new Buffer(cdata);

    /* jshint ignore:end */
};


if (inelectron) {
    fs = window.BISELECTRON.fs;
    rimraf = window.BISELECTRON.rimraf;
    zlib = window.BISELECTRON.zlib;
    path = window.BISELECTRON.path;
    os = window.BISELECTRON.os;
    glob = window.BISELECTRON.glob;
    child_process= window.BISELECTRON['child_process'];
    colors= window.BISELECTRON['colors'];
    environment = 'electron';
    createBuffer = function (cdata) {
        return new window.BISELECTRON.Buffer(cdata);
    };
}


/**
 * Set the scope of the web worker
*/
const setWebWorkerScope=function(w) {
    webWorkerScope=w;
};


/**
 * converts dataURL to a blob for saving
 * URL often created using canvas.toDataURL("image/png");
 * @alias BisCoreGenericIO#dataURLToBlob
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
 * @namespace BisCoreGenericIO
 */


/** This is a type of function that is used as a callback from binary data loading
 * @function 
 * @name BisCoreGenericIO.BinaryDataRead
 * @param {Uint8Array} data - the data that was read
 * @param {string} url - the filename/url that was read
 */

/** This is a type of function that is used as a callback from text data loading
 * @function 
 * @name BisCoreGenericIO.TextDataRead
 * @param {string} data - the data that was read
 * @param {string} url - the filename/url that was read
 */

/** This is a type of function that is used as a callback from i/o operations either for error or success
 * @function 
 * @name BisCoreGenericIO.MessageCallback
 * @param {string} message - a message about the operation
 */


// -------------------------------------------- Utilities ---------------------------------------------------------------------

/** inIOS. Checks if we are running in IOS
 * @alias BisCoreGenericIO#inIOS
 * @returns {boolean} 
 */
var inIOS = function () {

    try {
        if (/iP(hone|od|ad)/.test(navigator.platform)) {
            return true;
        }
    } catch(e) {
        return false;
    }
    return false;
};


/** is compressed. Checks if filename ends in .gz
 * @alias BisCoreGenericIO#iscompressed
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
 * @alias BisCoreGenericIO#tozbase64
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
 * @alias BisCoreGenericIO#frombase64
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
 * @alias BisCoreGenericIO#string2binary
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
 * @alias BisCoreGenericIO#binary2string
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

var removeSpacesFromFilenameWin32Electron=function(s) {

    if (environment !== 'electron') {
        return s;
    }
    
    const os=getosmodule();
    if (os.platform()!=='win32')
        return s;

    let q=s.trim().replace(/%20/g,' ');
    return q;

};

/** read text data in node.js
 * @alias BisCoreGenericIO~readtextdatanode
 * @param {string} filename - the filename
 * @param {BisCoreGenericIO.TextDataRead} callback - callback function (arguments = data,filename)
 * @param {BisCoreGenericIO.MessageCallback} errror - error callback function
 */
var readtextdatanode = function (filename, loadedcallback, errorcallback) {

    filename=removeSpacesFromFilenameWin32Electron(filename);
    
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
 * @alias BisCoreGenericIO~readbinarydatanode
 * @param {string} filename - the filename
 * @param {BisCoreGenericIO.BinaryDataRead} callback - callback function
 * @param {BisCoreGenericIO.MessageCallback} errror - error callback function
 */
var readbinarydatanode = function (filename, loadedcallback, errorcallback) {

    filename=removeSpacesFromFilenameWin32Electron(filename);
    
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
                        try {
                            let dt = pako.ungzip(new Uint8Array(d1));
                            loadedcallback(dt, filename);
                            dt = null;
                        } catch(e) {
                            console.log(' failed to read binary data error=' + err+' '+err.toString);
                            errorcallback(' failed to read binary data error=' + err.toString);
                        }
                    } else {
                        var dt = new Uint8Array(data);
                        loadedcallback(dt, filename);
                        dt = null;
                    }
                });
            } else {
                let dt = new Uint8Array(d1);//.buffer;
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
 * @alias BisCoreGenericIO~readtextdatabrowser
 * @param {Blob} file - the file object
 * @param {BisCoreGenericIO.TextDataRead} callback - callback function
 * @param {BisCoreGenericIO.MessageCallback} errror - error callback function
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
 * @alias BisCoreGenericIO~readbinarydatabrowser
 * @param {string} file - the file object
 * @param {BisCoreGenericIO.BinaryDataRead} callback - callback function
 * @param {BisCoreGenericIO.MessageCallback} errror - error callback function
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
/** read  data from url in node.js
 * @alias BisCoreGenericIO~readtextdataurl_node
 * @param {string} url - the url
 * @param {Boolean} binary - if true binary
 * @param {BisCoreGenericIO.TextDataRead} callback - callback function
 * @param {BisCoreGenericIO.MessageCallback} errror - error callback function
 */
var readdatafromurl_node = function (url, binary,loadedcallback, errorcallback) {

    let settings= {
        url : url,
        method : 'GET',
    };

    if (binary) {
        settings.encoding=null;
    }
    
    noderequest(settings, function (error, response, body) {

        if (error!==null)
            errorcallback(error);

        if (!binary) {
            loadedcallback(body,url);
            return;
        }

        let dt=new Uint8Array(body);
        
        let comp = iscompressed(url);
        if (comp) 
            dt = pako.ungzip(dt);
            
        loadedcallback(dt,url);
    });

};

/** read text data from url.
 * @alias BisCoreGenericIO~readtextdataurl
 * @param {string} url - the url
 * @param {BisCoreGenericIO.TextDataRead} callback - callback function
 * @param {BisCoreGenericIO.MessageCallback} errror - error callback function
 */
var readtextdatafromurl = function (url, loadedcallback, errorcallback, requestheader = null, realname = null) {

    if (environment === 'node') 
        return readdatafromurl_node(url,false,loadedcallback,errorcallback);

    
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
 * @alias BisCoreGenericIO~readbinarydataurl
 * @param {string} url - the url
 * @param {BisCoreGenericIO.BinaryDataRead} callback - callback function
 * @param {BisCoreGenericIO.MessageCallback} errror - error callback function
 */
var readbinarydatafromurl = function (url, loadedcallback, errorcallback, requestheader = null, realname = null) {


    if (environment === 'node') 
        return readdatafromurl_node(url,true,loadedcallback,errorcallback);

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
 * @alias BisCoreGenericIO~writetextdatanode
 * @param {string} filename - the filename
 * @param {string} data - the data to write
 * @param {BisCoreGenericIO.MessageCallback} donecallback - callback function if done
 * @param {BisCoreGenericIO.MessageCallback} errror - error callback function
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
 * @alias BisCoreGenericIO~writebinarydatanode
 * @param {string} filename - the filename
 * @param {Uint8Array} data - the data to write (or optionally array)
 * @param {BisCoreGenericIO.MessageCallback} donecallback - callback function if done
 * @param {BisCoreGenericIO.MessageCallback} errror - error callback function
 * @param {Boolean} donotcompress - if true then no compression is done even if filename ends in .gz
 */
var writebinarydatanode = function (filename, data, donecallback, errorcallback,nocompress=false) {

 
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

    if(iscompressed(filename) && nocompress===false) {
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
 * @alias BisCoreGenericIO~writetextdatabrowser
 * @param {string} filename - the filename
 * @param {string} data - the data to write
 * @param {BisCoreGenericIO.MessageCallback} donecallback - callback function if done
 */
var writetextdatabrowser = function (filename, data, donecallback) {

    donecallback = donecallback || console.log;

    var blob = new Blob([data], { type: "application/octet-stream" });

    filesaver(blob, filename);
    donecallback('');
};

/** write binary data in browser.
 * if filename ends in .gz also compress.
 * @alias BisCoreGenericIO~writebinarydatabrowser
 * @param {string} filename - the filename
 * @param {Uint8Array} data - the data to write (or optionally array)
 * @param {BisCoreGenericIO.MessageCallback} donecallback - callback function if done
 */
var writebinarydatabrowser = function (filename, data, donecallback) {
    donecallback = donecallback || console.log;


    var blob = null;
    var iscomp = iscompressed(filename);
    if (iscomp) {
        var compressed = pako.gzip(data);
        blob = new Blob([compressed],{ type: "application/gzip" });
    } else {
        blob = new Blob([data],{ type: "application/octet-stream" });
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
 * {@link BisCoreGenericIO~readtextdatanode}, {@link BisCoreGenericIO~readtextdatabrowser}, {@link BisCoreGenericIO~readtextdataurl}
 * @alias BisCoreGenericIO#readtextdata
 * @param {object} url - the url or filename or file object
 * @param {BisCoreGenericIO.TextDataRead} callback - callback function
 * @param {BisCoreGenericIO.MessageCallback} errror - error callback function
 */
var readtextdata = function (url, loadedcallback, errorcallback) {

    url = url || null;
    if (url === null) {
        errorcallback('no filename/url specified');
        return;
    }

    if (typeof url === 'string') {
        if (url.indexOf('http')===0) {
            return readtextdatafromurl(url, loadedcallback, errorcallback);
        }
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
 * {@link BisCoreGenericIO~readbinarydatanode}, {@link BisCoreGenericIO~readbinarydatabrowser}, {@link BisCoreGenericIO~readbinarydataurl}
 * @alias BisCoreGenericIO#readbinarydata
 * @param {object} url - the url or filename or file object
 * @param {BisCoreGenericIO.BinaryDataRead} callback - callback function
 * @param {BisCoreGenericIO.MessageCallback} errror - error callback function
 */
var readbinarydata = function (url, loadedcallback, errorcallback) {

    url = url || null;
    if (url === null) {
        errorcallback('no filename/url specified');
        return;
    }

    if (typeof url === 'string') {
        if (url.indexOf('http')===0) {
            return readbinarydatafromurl(url, loadedcallback, errorcallback);
        }
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
 * @alias BisCoreGenericIO#writedataelectron
 * @param {string} url - the url or filename or object of form
 * { title: 'dialog tile', filter  : filters, ', filename : initial filename }
 * @param {boolean} isbinary - if true write binary data
 * @param {string} data - the data to write (or optionally array)
 * @param {BisCoreGenericIO.MessageCallback} callback - callback function if done
 * @param {BisCoreGenericIO.MessageCallback} errror - error callback function
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
 * @alias BisCoreGenericIO#writedataelectron
 * @param {string} filename - the url or filename or object of form
 * { title: 'dialog tile', filter  : filters, ', filename : initial filename }
 * @param {boolean} isbinary - if true read binary data
 * @param {BisCoreGenericIO.MessageCallback} donecallback - callback function if done
 * @param {BisCoreGenericIO.MessageCallback} errrorcallback - error callback function
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
 * {@link BisCoreGenericIO~writetextdatanode} or {@link BisCoreGenericIO~writetextdatabrowser}
 * @alias BisCoreGenericIO#writetextdata
 * @param {string} filename - the url or filename or file object
 * @param {string} data - the data to write (or optionally array)
 * @param {BisCoreGenericIO.MessageCallback} callback - callback function if done
 * @param {BisCoreGenericIO.MessageCallback} errror - error callback function
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
 * {@link BisCoreGenericIO~writebinarydatanode} or {@link BisCoreGenericIO~writebinarydatabrowser}
 * @alias BisCoreGenericIO#writebinarydata
 * @param {string} filename - the url or filename or file object or an electron object with members 
 * { title: 'dialog tile', filter  : filters, ', filename : initial filename }
 * @param {Uint8Array} data - the data to write (or optionally array)
 * @param {BisCoreGenericIO.MessageCallback} callback - callback function if done
 * @param {BisCoreGenericIO.MessageCallback} errror - error callback function
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
 * @alias BisCoreGenericIO#getfsmodule
 * @returns{Module} 
 */
var getfsmodule = function () {
    return fs;
};



/** Return the path package to use
 * @alias BisCoreGenericIO#getpathmodule
 * @returns{Module} 
 */
var getpathmodule = function () {
    return path;
};

/** Return the path package to use
 * @alias BisCoreGenericIO#getosmodule
 * @returns{Module} 
 */
var getosmodule = function () {
    return os;
};

/** Return the path package to use
 * @alias BisCoreGenericIO#getglobmodule
 * @returns{Module} 
 */
var getglobmodule = function () {
    return glob;
};

/** Return the path package to use
 * @alias BisCoreGenericIO#getrimrafmodule
 * @returns{Module} 
 */
var getrimrafmodule = function () {
    return rimraf;
};


/* Return the colors package to use
 * @alias BisCoreGenericIO#getcolorsmodule
 * @returns{Module} 
 */
var getcolorsmodule = function () {
    return colors;
};


/* Return the child process package to use
 * @alias BisCoreGenericIO#getchildprocessmodule
 * @returns{Module} 
 */
var getchildprocessmodule = function () {
    return child_process;
};

// --------------------------------------------------------------------
/** returns the image path for bisweb */
let getimagepath=function() {

    let imagepath="";
    if (typeof window !== "undefined" && !inelectron) {
        let scope=window.document.URL.split("?")[0];
        let index=scope.lastIndexOf("/");
        if (scope.indexOf("external")>0)  {
            scope=scope.substr(0,index)+"/../src/web/images";
            console.log('external=',scope);
        } else {
            scope=scope.substr(0,index)+"/images";
        }
        imagepath=scope;
    } else if (inelectron) {
        let scope=window.document.URL.split("?")[0];
        let index=scope.lastIndexOf("/");
        // First 8 characters are file:///
        const os=getosmodule();
        if (os.platform()==='win32')
            scope=scope.substr(8,index-8)+"/images";
        else
            scope=scope.substr(7,index-7)+"/images";
        const path=getpathmodule();
        imagepath=path.resolve(scope);
        //        console.log('Imagepath=',imagepath);

    } else if (webWorkerScope) {
        console.log('In Web Worker ...');
        console.log('Web Worker can not get path, or perform fetch');

    } else {
        const path=getpathmodule();
        console.log('Dirname=',__dirname);
        imagepath=path.resolve(__dirname, '../../web/images');
        if (!fs.existsSync(imagepath))
            imagepath=path.resolve(__dirname, '../images');
    }


    return imagepath;
};

// --------------------------------------------------------------------------------------

// Export object
const biscoregenericio = {
    getmode : function() { return environment;},
    getenvironment : function() { return environment;},
    createBuffer : createBuffer,
    getfsmodule : getfsmodule,
    getpathmodule : getpathmodule,
    getosmodule : getosmodule,
    getglobmodule : getglobmodule,
    getcolorsmodule : getcolorsmodule,
    getchildprocessmodule : getchildprocessmodule,
    getrimrafmodule :     getrimrafmodule,
    tozbase64 : tozbase64,
    fromzbase64 : fromzbase64,
    string2binary :     string2binary ,
    binary2string :     binary2string ,
    dataURLToBlob : dataURLToBlob,
    iscompressed :      iscompressed, // ends in .gz
    inIOS : inIOS, // are we running in iOS Safari
    setWebWorkerScope :     setWebWorkerScope,
    readtextdatafromurl : readtextdatafromurl, // read from url
    readbinarydatafromurl : readbinarydatafromurl, // read from url
    readtextdata : readtextdata,
    readbinarydata: readbinarydata,
    writetextdata : writetextdata,
    writebinarydata : writebinarydata,
    writetextdatanode : writetextdatanode,
    writebinarydatanode : writebinarydatanode,
    getimagepath : getimagepath,
};


module.exports = biscoregenericio;
