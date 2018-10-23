require('../../config/bisweb_pathconfig.js');

const crypto = require('crypto');
const path=require('path');
const os = require('os');
const timers = require('timers');
const util = require('bis_util');
const bisgenericio=require('bis_genericio');
const glob=bisgenericio.getglobmodule();
const biscmdline = require('bis_commandlineutils');
const bidsutils=require('bis_bidsutils.js');
// TODO: IP Filtering
// TODO: Check Base Directories not / /usr (probably two levels)

const fs = require('fs');

// One time password library
const otplib = require('otplib');
const hotp = otplib.hotp;
hotp.options  = { crypto };
const secret = otplib.authenticator.generateSecret();
let onetimePasswordCounter=1;



// .................................................. This is the class ........................................

const server_fields = [
    { name : 'verbose',   value: false  },
    { name : 'baseDirectoriesList', value: null },
    { name : 'readonly', value: false },
    { name : 'insecure', value: false },
    { name : 'tempDirectory', value: '' }
];

// Used to make temp directories
let tempDirectoryCounter=0;

class BaseFileServer {

    constructor(opts={}) {

        //  .................... Per Connection .......................................................
        //file transfer may occur in chunks, which requires storing the chunks as they arrive
        this.fileInProgress = null;

        let cnf={};
        if (opts.config) {
            try {
                let dat=fs.readFileSync(opts.config);
                cnf=JSON.parse(dat);
            } catch(e) {
                console.log('Error ',e);
                process.exit(0);
            }
        }

        this.opts={};

        this.opts.dcm2nii='/usr/bin/dcm2nii';
        
        for (let i=0;i<server_fields.length;i++) {
            let name=server_fields[i].name;
            this.opts[name]=server_fields[i].value;
            if (opts[name])
                this.opts[name]=opts[name];
            else if (cnf[name])
                this.opts[name]=cnf[name];
        }

        
        if (this.opts.tempDirectory.length<1) {
            if (path.sep==='\\') {
                this.opts.tempDirectory=util.filenameWindowsToUnix(os.homedir()+'/temp');
            } else if (os.platform()==='darwin' ) {
                this.opts.tempDirectory='/'+fs.readlinkSync('/tmp');
            } else {
                this.opts.tempDirectory='/tmp';
            }
        } else {
            this.opts.tempDirectory=this.validateDirectories([this.opts.tempDirectory],'temp')[0];
        }
        
        if (!this.opts.baseDirectoriesList) {
            if (path.sep==='/')  {
                this.opts.baseDirectoriesList=[ os.homedir() ];
            } else {
                this.opts.baseDirectoriesList=[ util.filenameWindowsToUnix(os.homedir()) ];
            }
        }
        
        this.opts.baseDirectoriesList=this.validateDirectories(this.opts.baseDirectoriesList,'base');
        
        
        let temp=this.opts.tempDirectory.trim();
        let i=0,found=false;

        while (i<this.opts.baseDirectoriesList.length && found===false) {
            let nm=this.opts.baseDirectoriesList[i].trim();
            if (temp.trim() === nm.trim() ||
                temp.indexOf(nm)===0) {
                found=true;
            }  else {
                i=i+1;
            }
        }
        if (!found) {
            this.opts.baseDirectoriesList.push(this.opts.tempDirectory);
        }
        
        if (opts.createconfig || this.opts.verbose) {
            console.log('\n.................................');
            console.log('..... Starting configuration:\n');
            console.log(JSON.stringify(this.opts,null,4));
            console.log('\n.................................\n');
            if (opts.createconfig)
                process.exit(0);
        }
        

        

        // Former global variables
        this.portNumber=0;
        this.hostname='ws://localhost';
        this.datatransfer=false;
        this.netServer=null;
        // Formerly global variable
        this.timeout = undefined;
        this.terminating=false;
        this.lastDirectory=null;
        this.indent='.....';
    }
    
    // .......................................................................................
    // password token
    // create function and global variable
    createPassword(abbrv=0) {
        onetimePasswordCounter+=1;
        let token = hotp.generate(secret, onetimePasswordCounter);
        if (abbrv===0) {
            console.log(this.indent,'BioImage Suite Web FileServer datatransfer=',this.datatransfer,' Initialized\n'+this.indent+'');
            console.log(this.indent,'\t The websocket server is listening for incoming connections,\n'+this.indent+' \t using the following one time info.\n'+this.indent+'');
            // the ".ss." in the next lines is needed for mocha testing
            console.log('..ss. \t\t hostname: ws://'+this.hostname+':'+this.portNumber);
        }  else if (abbrv===1) {
            console.log(this.indent+'\n'+this.indent+' Create New Password ... try again.');
        } else {
            console.log(this.indent+'\n'+this.indent+' Create New Password as this one is now used successfully.');
        }
        // the ".ss." in the next lines is needed for mocha testing
        console.log('..ss. \t\t ws://'+this.hostname+':'+this.portNumber+', password: '+token+'\n'+this.indent);
    }


    checkPassword(password) {
        return hotp.check(parseInt(password), secret, onetimePasswordCounter);
    }
    // ..............................................................................................
    /**
     * send JSON data
     * @param{Socket} socket - the socket to use
     * @param{String} type - either binary or the name of the package
     * @param{Object} obj - the dictionary to send
     * @returns {Promise} 
     */
    sendCommand(socket,type,obj) {
        return Promise.reject('Cannot send anything '+socket+' '+type+' '+obj);
    }


    /** Close Socket Event
     * @param{Socket} socket - the socket to close
     * @param{Boolean} destroy - if true call socket.destroy() in addition
     */
    closeSocket(socket,destroy=false) {
        throw new Error('Cannot close'+socket+' '+destroy);
    }
    
    /** Stop Server
     * @param{Server} server - the server to stop
     */
    stopServer(server) {
        throw new Error('Cannot stop'+server);
    }
    
    /**  decodes text from socket
     * @param{Blob} text - the string to decode
     * @param{Number} length - the length of the string
     * @returns {String} - the decoded string
     */
    decodeUTF8(text,length) {
        throw new Error('Cannot decode ' + text + ' '+length);
    }

        /**
     * Sends a message to the client describing the server error that occured during their request. 
     * 
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place. 
     * @param {String} reason - Text describing the error.
     * @param {Number} id - the request id
     */
    handleBadRequestFromClient(socket, reason,id=-1) {
        let error = "An error occured:"+reason;
        this.sendCommand(socket,'error', { 'text' : error, 'id': id}).then( () => {
            console.log(this.indent,'request returned an error', reason, '\n'+this.indent+'\t sent error to client');
        });
    }

    /**
     * Closes the server side of the socket gracefully. Meant to be called upon receipt of a 'connection close' packet from the client, i.e. a packet with opcode 8.
     * 
     * @param {String} rawText - Unparsed JSON denoting the file or series of files to read. 
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place. 
     * @param {Object} control - Parsed WebSocket header for the file request.
     */
    handleCloseFromClient(rawText, socket, control) {
        let text = this.decodeUTF8(rawText, control);
        console.log(this.indent,'received CLOSE frame from client',text);

        //TODO: send a close frame in response
        this.closeSocket(socket,false);

        console.log(this.indent,'closed connection');
    }


    // ......................... Filename Validation Code (not used) .............................................

    /**
     * Takes a path specifying a file to load on the server machine and determines whether the path is clean, i.e. specifies a file that exists, does not contain symbolic links.
     * Recursively checks every file and directory on the path.
     * 
     * @param {String} filepath - Path to check.
     * @return {Boolean} true if OK, false if not OK,
     */
    validateFilename(filepath) {

        filepath=filepath||'';
        if (filepath.length<1) {
            return false;
        }

        if (path.sep==='\\') 
            filepath=filepath.toLowerCase();

        let i=0,found=false;
        while (i<this.opts.baseDirectoriesList.length && found===false) {
            if (path.sep==='\\') {
                if (filepath.indexOf(this.opts.baseDirectoriesList[i].toLowerCase())===0) {
                    found=true;
                }
            } else if (filepath.indexOf(this.opts.baseDirectoriesList[i])===0) {
                found=true;
            } else {
                i=i+1;
            }
        }

        if (found===false) {
            return false;
        }

        let realname=filepath;
        if (path.sep==='\\')
            realname=util.filenameUnixToWindows(filepath);


        if (fs.existsSync(realname)) {
            let stats=fs.lstatSync(realname);
            if (stats.isSymbolicLink()) {
                return false;
            }
        } else {
            let dirname=path.dirname(realname);
            try {
                let stats=fs.lstatSync(dirname);
                if (stats.isSymbolicLink()) {
                    return false;
                }
            } catch(e) {
                return false;
            }
        }

        return true;
    }

    /** Validate Directories
     * @params{Array} - array of directories
     * @params{String} - name of list for debugging
     * @returns{Array} - fixed array
     */
    validateDirectories(lst,name="") {

        let newlist=[];
        for (let i=0;i<lst.length;i++) {

            let p=lst[i];
            if (path.sep==='\\') 
                p=util.filenameUnixToWindows(p);
            
            p = path.normalize(p);
            let stats=null;
            try {

                stats=fs.lstatSync(p);
            } catch(e) {
                p=null;
            }

            
            
            if (stats) {
                
                if (stats.isSymbolicLink()) {
                    let q=fs.readlinkSync(p);
                    p=q;
                }

                if (!stats.isDirectory()) {
                    p=null;
                }

                if (p.lastIndexOf(path.sep)==(p.length-1)) {
                    p=p.substr(0,p.length-1);
                } 
            } else {
                p=null;
            }

            if (p!=null) {
                
                if (path.sep==='/') {
                    let ignore=false;
                    if (p!=='/tmp') {
                        let l=p.split('/');
                        if (l.length<3)
                            ignore=true;
                    }
                    if (!ignore) 
                        newlist.push(p);
                } else {
                    let l=p.split('\\');
                    if (l.length>=3)
                        newlist.push(util.filenameWindowsToUnix(p));
                }                
            }
        }
        if (this.opts.verbose)
            console.log(this.indent,'Validating '+name+' directory list=',lst.join(','),'-->\n'+this.indent+'\t ' , newlist.join(','));
        return newlist;
    }

    
    /**
     * Sets a function to execute after a given delay. Uses Node Timers class.
     * 
     * @param {Function} fn - Function to call at the end of the timer period. 
     * @param {Number} delay - Approximate amount of time before end of timeout period (see reference for Node Timers class).
     */
    setSocketTimeout(fn, delay = 2000) {
        let timer = timers.setTimeout(fn, delay);
        return timer;
    }



    /**
     * Parses JSON sent by the client from a raw bytestream to a JavaScript Object.
     * 
     * @param {Uint8Array} rawText - The bytestream sent by the client.
     * @returns The JSON object corresponding to the raw bytestream.
     */
    parseClientJSON(rawText) {
        let text = this.decodeUTF8(rawText, rawText.length);

        let parsedText;
        try {
            parsedText = JSON.parse(text);
        } catch (e) {
            console.log(this.indent,'an error occured while parsing the data from the client', e);
        }

        return parsedText;
    }
    
    // --------------------------------------------------------------------------
    
    createFileInProgress(upload) {

        this.fileInProgress = {
            'totalSize': upload.totalSize,
            'packetSize': upload.packetSize,
            'isbinary' : upload.isbinary,
            'name': upload.filename,
            'storageSize' : upload.storageSize,
            'checksum' : upload.checksum,
            'offset' : 0,
            'uploadCount' : upload.uploadCount,
        };
        this.fileInProgress.data = new Uint8Array(upload.storageSize);
        console.log('._._._._._._-\n._._._._._._- \t fileinProgress data created=',this.fileInProgress.totalSize,
                    'count=',this.fileInProgress.uploadCount,
                    'name=',upload.filename);
    }
    
    // .................................................................................................................................................................
    /**
     * Parses a textual request from the client and serves accordingly. 
     * 
     * @param {String} rawText - Unparsed JSON denoting the file or series of files to read. 
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place.
     * @param {Object} control - Parsed WebSocket header for the file request.
     */
    handleTextRequest(rawText, socket, control=null)  {
        let parsedText = this.parseClientJSON(rawText);
        parsedText=parsedText || -1;
        if (this.opts.verbose)
            console.log(this.indent,'text request', JSON.stringify(parsedText));
        switch (parsedText.command)
        {
            //get file list
            case 'getfilelist': {
                this.serveFileList(socket, parsedText.directory,parsedText.id);
                break;
            }
            case 'readfile': {
                this.readFileAndSendToClient(parsedText, socket, control);
                break;
            }
            case 'uploadfile' : {
                console.log('._._._._._._-\n._._._._._._- beginning upload event');
                this.getFileFromClientAndSave(parsedText, socket, control);
                break;
            }
            case 'getserverbasedirectory' : {
                this.serveServerBaseDirectory(socket,parsedText.id);
                break;
            }
            
            case 'restart' : {
                console.log(this.indent,'Received restart, sending tryagain');
                this.sendCommand(socket,'tryagain', '');
                break;
            }
            
            case 'getservertempdirectory' : {
                this.serveServerTempDirectory(socket,parsedText.id);
                break;
            }
            case 'filesystemoperation' : {
                this.fileSystemOperations(socket,parsedText.operation,parsedText.url,parsedText.id);
                break;
            }

            case 'dicomConversion' : {
                this.dicomConversion(socket,parsedText);
                break;
            }

            case 'dicom2BIDS' : {
                this.dicom2BIDS(socket,parsedText);
                break;
            }

            case 'ignore':  {
                console.log(this.indent,'Received ignore, ignoring');
                break;
            }
            
            case 'terminate': {
                console.log(this.indent,'received terminate from client');
                this.closeSocket(socket,true);
                this.stopServer(this.netServer);
                this.netServer.close();
                this.terminating=true;
                setTimeout( () => { process.exit(0);},500);
                break;
            }
            
            default: {
                console.log(this.indent,'Cannot interpret request with unknown command', parsedText.command);
            }
        }
    }

    // .................................................................................................................................................................
    // ............................................. Send File To Client ...............................................................................................
    // .................................................................................................................................................................

    /**
     * Takes a request from the client and returns the requested file or series of files. 
     * 
     * @param {String} rawText - Unparsed JSON denoting the file or series of files to read. 
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place. 
     */
    readFileAndSendToClient(parsedText, socket) {
        let filename = parsedText.filename;
        let isbinary = parsedText.isbinary;
        let id=parsedText.id;
        
        if (!this.validateFilename(filename)) {
            this.handleBadRequestFromClient(socket,
                                            'filename '+filename+' is not valid',
                                            parsedText.id);
            return;
        }

        
        if (path.sep==='\\')
            filename=util.filenameUnixToWindows(filename);

        let handleError=(filenane,err) => {
            if (err.code==="EACCES")
                this.handleBadRequestFromClient(socket, 'Failed to read file'+filename+' permission denied');
            else if (err.code==="ENOENT")
                this.handleBadRequestFromClient(socket, 'Failed to read file'+filename+' (no such file)');
            else
                this.handleBadRequestFromClient(socket, 'Failed to read file'+filename+' (code='+err.code+')');
        };
        
        if (isbinary) {
            fs.readFile(filename,  (err, d1) => {
                
                if (err) {
                    handleError(filename,err);
                } else {
                    console.log(`${this.indent} load binary file ${filename} successful, writing to socket`);
                    let checksum=`${util.SHA256(new Uint8Array(d1))}`;
                    if (this.opts.verbose)
                        console.log(this.indent,'Sending checksum=',checksum, 'id=',id);
                    this.sendCommand(socket,'checksum', {
                        'checksum' : checksum,
                        'id' : id
                    });
                    this.sendCommand(socket,'binary',d1);
                }
            });
        } else {
            //        console.log(this.indent,'filename', filename);
            fs.readFile(filename, 'utf-8', (err, d1) => {
                if (err) {
                    handleError(filename,err);
                } else {
                    console.log(`${this.indent} load text file ${filename} successful, writing to socket`);
                    this.sendCommand(socket,'text', { 'data' :  d1,
                                                      'id' : id});
                }
            });
        }        
    }


    // .....................................................................................................................................................................
    //  .......... Directory and File List Operations
    // .....................................................................................................................................................................    

    /**
     * Sends the list of available files to the user, hiding files above the ~/ directory.
     * 
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place. 
     * @param {String} basedir - Directory on the server machine to display files starting from, null indicates '~/'. Writes different responses to the socket if basedir is null or not ('filelist' vs 'supplementalfiles').
     * @param {String} type - The type of modal that will be served the file list. Either 'load' or 'save'. 
     * @param {Number} id - the request id
     * @returns A file tree rooted at basedir.
     */
    serveFileList(socket, basedir, id=-1)  {

        const debug=this.opts.verbose;
        let foundDirectory='';

        if (basedir===null && this.lastDirectory!==null) {
            basedir=this.lastDirectory;
        }

        if (basedir===null) {
            foundDirectory=true;
            if (this.opts.baseDirectoriesList.length===1)
                basedir=this.opts.baseDirectoriesList[0];
            else
                basedir='[Root]';
        }

        if (basedir==='[Root]') {
            this.lastDirectory=null;
        } else {
            let found=false,i=0;
            while(i<this.opts.baseDirectoriesList.length && !found) {
                if (basedir.indexOf(this.opts.baseDirectoriesList[i])===0) {
                    found=true;
                    foundDirectory=this.opts.baseDirectoriesList[i];
                } else  {
                    i=i+1;
                }
            }
            if (found===false) {
                basedir='[Root]';
                foundDirectory=null;
            } else {
                this.lastDirectory=basedir;
            }
        }

        let getmatchedfiles=function(basedir) {

            if (debug)
                console.log(this.indent,'Reading directory=',basedir);
            
            let pathname=basedir;
            if (path.sep==='\\') 
                pathname=util.filenameUnixToWindows(basedir);
            
            let p=path.join(pathname,'*');
            
            return new Promise( (resolve,reject) => {
                glob(p, function(er,files) {
                    if (er) 
                        reject(er);
                    resolve({
                        pathname : pathname,
                        files : files});
                });
            });
        };

        let getstats=function(fname) {

            return new Promise( (resolve,reject) => {

                fs.lstat(fname,(err,result) => {
                    if (err)
                        reject(err);

                    resolve(result);
                });
            });
        };
        
        let createTree=async function(files) {

            let treelist=[];
            for (let f=0;f<files.length;f++) {
                
                let fname=files[f];
                let basename=path.basename(fname);
                if (fname.indexOf(".")!==0 && basename.indexOf("#")!==0) {
                    
                    let treeEntry = { };
                    treeEntry.text=basename;
                    
                    //let stats=fs.lstatSync(fname);
                    let stats;
                    try{
                        stats=await getstats(fname);
                    } catch(e) {
                        return null;
                    }
                    if (!stats.isSymbolicLink()) {
                        if (stats.isDirectory()) {
                            treeEntry.type = 'directory';
                            treeEntry.size = 0;
                        } else {
                            let extension = path.parse(fname).ext;
                            switch (extension)
                            {
                                case 'gz' : {
                                    treeEntry.type = 'picture'; break;
                                }
                                default : {
                                    treeEntry.type = 'file';
                                }
                            }
                            treeEntry.size = stats["size"];
                        }
                    }
                    let f2=util.filenameWindowsToUnix(path.resolve(path.normalize(fname)));

                    if (treeEntry.type === 'directory') {
                        if (f2.lastIndexOf('/')===f2.length-1)
                            f2=f2.substr(0,f2.length-1);
                    }
                    treeEntry.path = f2;
                    treelist.push(treeEntry);
                }
            }

            return treelist;
        };



        if (basedir===['Root'] && this.opts.baseDirectoriesList.length<2)
            basedir = this.opts.baseDirectoriesList[0];

        
        if (basedir!=='[Root]') {
            
            getmatchedfiles(basedir).then( (obj) => {

                let pathname=obj.pathname;
                if (path.sep==='\\')
                    pathname=util.filenameWindowsToUnix(pathname);
                
                createTree(obj.files).then( (treelist) => {
                    this.sendCommand(socket,'filelist', { 'path' : pathname,
                                                          'root' : foundDirectory,
                                                          'data' : treelist,
                                                          'id' : id });
                });
            }).catch( (e) => {
                console.log(this.ident,e,e.stack);
            });
        } else {
            let lst=this.opts.baseDirectoriesList;
            if (path.sep==='\\') {
                lst=[];
                for (let i=0;i<this.opts.baseDirectoriesList.length;i++) {
                    lst.push(util.filenameUnixToWindows(this.opts.baseDirectoriesList[i]));
                }
            }
            
            createTree(lst).then( (treelist) => {
                this.sendCommand(socket,'filelist', { 'path' : "/",
                                                      'root' : "/",
                                                      'data' : treelist,
                                                      'id' : id });
            }).catch( (e) => {
                console.log(this.indent,e,e.stack);
            });
        }
    }

    /**
     * Sends the default location for the client to load images from. Typically used during regression testing, when many files will be loaded without user interaction.
     *  
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place.  
     * @param {Number} id - the request id
     */
    serveServerBaseDirectory(socket,id=0)  {
        console.log(this.indent," Serving Base",this.opts.baseDirectoriesList);
        this.sendCommand(socket,'serverbasedirectory', { 'path' : this.opts.baseDirectoriesList,  'id' : id });
    }

    /**
     * Sends the default location for the client to save images to. Typically used during regression testing, when many files will be loaded without user interaction.
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place. 
     * @param {Number} id - the request id
     */
    serveServerTempDirectory(socket,id=0) {
        console.log(this.indent,"Serving Temp",this.opts.tempDirectory);
        this.sendCommand(socket,'servertempdirectory', { 'path' : this.opts.tempDirectory, 'id' : id });
    }


    /**
     * Performs file operations (isDirectory etc.)
     * @param {String} - operation name
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place. 
     * @param {Number} id - the request id
     */
    fileSystemOperations(socket,opname,url,id=0)  {

        let prom=null;

        if (opname!=='getMatchingFiles') {
            // This is a potential security hole as "*" and '?'
            
            if (!this.validateFilename(url)) {
                this.handleBadRequestFromClient(socket,
                                                'url '+url+' is not valid',
                                                id);
                return;
            }
        }

        
        if (path.sep==='\\')
            url=util.filenameUnixToWindows(url);

        switch (opname)
        {
            case 'getFileSize' : {
                prom=bisgenericio.getFileSize(url);
                break;
            }
            case 'isDirectory' : {
                prom=bisgenericio.isDirectory(url);
                break;
            }
            case 'getMatchingFiles' : {
                prom=bisgenericio.getMatchingFiles(url);
                break;
            }
            case 'makeDirectory' : {
                if (!this.opts.readonly) 
                    prom=bisgenericio.makeDirectory(url);
                else
                    prom=Promise.reject('In Read Only Mode');
                break;
            }
            case 'deleteDirectory' : {
                if (!this.opts.readonly) 
                    prom=bisgenericio.deleteDirectory(url);
                else
                    prom=Promise.reject('In Read Only Mode');
                break;
            }
        }

        if (prom===null)
            return;
        
        prom.then( (m) => {
            if (opname==='getMatchingFiles' && path.sep==='\\') {
                let s=[];
                for (let i=0;i<m.length;i++)
                    s.push(util.filenameWindowsToUnix(m[i]));
                m=s;
            }
            
            
            console.log(this.indent,'File system success=',opname,url,m,'\n'+this.indent+'');
            this.sendCommand(socket,'filesystemoperations', { 'result' : m,
                                                              'url' : url,
                                                              'operation' : opname,
                                                              'id' : id });
        }).catch( (e) => {
            console.log(this.indent,'File system fail',opname,url,e);
            this.sendCommand(socket,'filesystemoperationserror', { 'result' : e,
                                                                   'operation' : opname,
                                                                   'url' : url,
                                                                   'id' : id });
        });
    }


    // DICOM
    /**
     * Performs DICOM 2 NII conversion by calling the dcm2nii tool
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place. 
     * @param {Dictionary} opts  - the parameter object
     * @param {Number} opts.id - the job id
     * @param {String} opts.indir - the input directory
     * @param {Boolean} opts.debug - if true run debug setup
     */
    dicomConversion(socket,opts)  {

        let errorfn=( (msg) => {
            this.sendCommand(socket,'dicomConversionError', { 
                'output' : msg,
                'id' : id });
            return false;
        });
        
        let id=opts.id;
        let indir=opts.indir || '';
        let debug=opts.debug || false;

        if (path.sep==='\\') {
            indir=util.filenameUnixToWindows(indir);
        }
        
        if (!this.opts.dcm2nii) {
            return errorfn(' No dcm2nii tool in config');
        }
        
        if (!this.validateFilename(indir)) {
            return errorfn(indir+' is not valid');
        }


        tempDirectoryCounter+=1;
        let outdir=path.join(this.opts.tempDirectory,'dicom_'+tempDirectoryCounter);
        try {
            fs.mkdirSync(outdir);
        } catch(e) {
            return errorfn('can not make temp dir '+outdir);
        }
        

        
        let done= (status,code) => {
            if (status===false) {
                return errorfn('dcm2nii failed'+code);
            }
            
            this.sendCommand(socket,'dicomConversionDone', { 
                'output' : outdir,
                'id' : id });
            return;
        };

        let listen= (message) => {
            this.sendCommand(socket,'dicomConversionProgress', message);
        };

        
        let cmd=this.opts.dcm2nii+' -o '+outdir+' '+indir;
        if (debug)
            cmd='ls '+outdir+' '+indir;
        biscmdline.executeCommand(cmd,__dirname,done,listen);
        return;
    }

    // DICOM2BIDS
    /**
     * Performs NII 2 Bids conversion of data generated by dcm2nii
     * @param {Net.Socket} socket - WebSocket over which the communication is currently taking place. 
     * @param {Dictionary} opts  - the parameter object
     * @param {Number} opts.id - the job id
     * @param {String} opts.indir - the input directory (output of dcm2nii)
     * @param {String} opts.outdir - the output directory (output of this function)
     */
    dicom2BIDS(socket,opts)  {

        let id=opts.id;
        let indir=opts.indir || '';
        let outdir=opts.outdir || '';


        if (path.sep==='\\') {
            indir=util.filenameUnixToWindows(indir);
            outdir=util.filenameUnixToWindows(outdir);
        }

        if (!this.validateFilename(indir) || !this.validateFilename(outdir)) {
            console.log(this.indent,'Bad outputdir',indir,outdir);
                this.sendCommand(socket,'dicomConversionError', { 
                    'output' : indir+' or '+outdir+' is not valid',
                    'id' : id });
        }

        bidsutils.dicom2BIDS(
            { indir : indir,
              outdir : outdir
            }).then( (tlist) => {
                this.sendCommand(socket,'dicomConversionDone', { 
                    'output' : tlist,
                    'id' : id });
            }).catch( (msg) => {
                this.sendCommand(socket,'dicomConversionError', { 
                    'output' : msg,
                    'id' : id });
            });
    }
}


module.exports= BaseFileServer;

