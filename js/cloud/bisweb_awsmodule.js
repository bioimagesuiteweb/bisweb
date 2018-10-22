'use strict';

const AWS = require('aws-sdk');
const AWSCognitoIdentity = require('amazon-cognito-identity-js');
const AWSParameters = require('../../web/aws/awsparameters.js');
const bis_webutil = require('bis_webutil.js');
const bisweb_simplefiledialog = require('bisweb_simplefiledialog.js');
const BaseServerClient = require('bis_baseserverclient.js');
const bis_genericio = require('bis_genericio.js');
const pako = require('pako');
const localforage = require('localforage');
const $ = require('jquery');

/**
 * Class designed to save and load files from Amazon S3, using Amazon Cognito for authentication. 
 * Does not require the use of an app key like Dropbox and Google Drive. 
 */
class AWSModule extends BaseServerClient {

    constructor() {
        
        super(); 
        this.hasGUI = true;

        AWS.config.update({
            'region' : AWSParameters.RegionName,
            'credentials' : new AWS.CognitoIdentityCredentials({
                'IdentityPoolId' : AWSParameters.IdentityPoolId()
            })
        });

        const userPoolData = {
            'UserPoolId' : AWSParameters.authParams.UserPoolId,
            'ClientId' : AWSParameters.authParams.ClientId
        };

        this.userPool = new AWSCognitoIdentity.CognitoUserPool(userPoolData);

        this.s3 = this.createS3(AWSParameters.BucketName);

        this.saveModal = null;

        //UI features
        this.createUserModal = null;
        this.authUserModal = null;

        this.refreshCredentials = true;

        this.awsstoredbuckets = null;
        this.bucketMenuModal = null;

        this.awsbucketstorage = localforage.createInstance({
            'driver' : localforage.INDEXEDDB,
            'name' : 'bis_webfileutil', 
            'version' : 1.0,
            'size' : 10000,
            'storeName' : 'AWSBuckets',
            'description' : 'A database of AWS buckets that the user has attempted to connect to'
        });

        this.awsbucketstorage.getItem('currentAWS', (err, value) => {
            if (err) {
                //console.log('an error occured fetching from aws bucket storage', err);
            }
            try {
                //console.log('value', value);
                let parsedAWS = JSON.parse(value);
                if (parsedAWS.bucketName && parsedAWS.identityPoolId)
                    this.currentAWS = JSON.parse(value);
                else 
                    this.currentAWS = null;
                //console.log('current aws', this.currentAWS);
            } catch(e) {
                //    console.log('an error occured parsing JSON', e);
                this.currentAWS = null;
            }
        });

        //file display modal gets deleted if you try to load it too soon
        //not completely sure why -Zach
        bis_webutil.runAfterAllLoaded( () => {   
            this.fileDisplayModal = new bisweb_simplefiledialog('Bucket Contents');
            this.fileDisplayModal.fileListFn = this.changeDirectory.bind(this);
        });
    }

    /**
     * Creates an instance of the S3 API that points to a given bucket with a given set of credentials. 
     * @param {String} bucketName - The name of the bucket
     * @param {AWS.Credentials} credentials - Amazon provided credentials to sign S3 requests with. Retrived through awsAuthUser
     * @param {AWS.Credentials} session_token - Amazon provided session_token to sign S3 requests with. Retrieved through awsAuthUser
     */
    createS3(bucketName, credentials = null, session_token = null) {
        let s3 = new AWS.S3({
            'apiVersion' : '2006-03-01',
            'credentials' : credentials,
            'sessionToken' : session_token,
            'params' : { Bucket : bucketName }
        });

        return s3;
    }

    /**
     * Lists the objects in the bucket referred to by the current S3 instance (this.S3). Note that S3 is a flat storage structure in which everything is stored in the same place.
     * Creates a file browsing dialog using bisweb_filedialog (see the documentation in that file for more details).
     * 
     * @param {Array} opts.filters - Filters object passed from bis_genericio.
     * @param {String} opts.modalTitle - Name to display at the top of the modal.
     * @param {String} opts.suffixes - Comma separated list of file extensions for files that should be displayed in the modal. 
     */
    createLoadModal(opts) {
        this.s3.listObjectsV2( { 'Delimiter' : '/' }, (err, data) => {
            if (err) { console.log('an error occured', err); return; }

            //TODO: suffixes is NULL mostly should not be passed in
            let formattedFiles = this.formatRawS3Files(data.Contents, data.CommonPrefixes, null);
            this.fileDisplayModal.openDialog(formattedFiles, opts);
        });
    }

    /**
     * Downloads a file with a given name from the current S3 bucket. 
     * Called by bis_genericio starting from when a user sends the request by clicking on a file in a file display modal.
     * 
     * @param {String} filename - The name of the file 
     * @param {Boolean} isbinary - Whether the file is in a binary format or not
     */
    downloadFile(filename, isbinary) {

        return new Promise( (resolve, reject) => {

            //strip leading '/'s from name 
            let splitName = filename.split('/');
            for (let i = 0; i < splitName.length; i++) {
                if (splitName[i] === '') {
                    splitName.splice(i,1);
                    i--;
                } else {
                    break;
                }
            }

            filename = splitName.join('/');

            let getParams = { 
                'Key' : filename,
                'Bucket' : AWSParameters.BucketName()
            };

            this.s3.getObject(getParams, (err, data) => {
                if (err) { 
                    reject(err); 
                    return;
                }

                //                console.log('data', data.Body);

                //check to see if data needs to be uncompressed before loading
                if (!isbinary) {
                    resolve({
                        'data': data.Body,
                        'filename': filename
                    });
                    return;
                } else {
                    let compressed = bis_genericio.iscompressed(filename);
                    if (!compressed) {
                        resolve({
                            'data': data.Body,
                            'filename': filename
                        });
                    } else {
                        let unzippedData = pako.ungzip(data.Body);
                        resolve({
                            'data': unzippedData,
                            'filename': filename
                        });
                    }
                }

            });
        });
    }

    /**
     * Uploads a file to the current S3 bucket. 
     * Called by bis_genericio starting from when a user types a filename into the save filename modal and clicks confirm. 
     * 
     * @param {String} filename - The name of the file 
     * @param {String|Uint8Array} data - The raw image data
     * @param {Boolean} isbinary - if true then data is binary
     */
    uploadFile(filename, data, isbinary = false) {

        let sendData=data;
        if (isbinary && bis_genericio.iscompressed(filename))
            sendData = pako.gzip(data);
        
        return new Promise( (resolve, reject) => {

            //a leading '/' will create an empty folder with no name in the s3 bucket, so we want to trim it here.
            if (filename[0] === '/') filename = filename.substring(1,filename.length);
            console.log('filename', filename);

            let uploadParams = {
                'Key' : filename,
                'Bucket' : AWSParameters.BucketName(),
                'Body' : sendData
            };

            this.s3.upload(uploadParams, (err) => {
                if (err) { 
                    bis_webutil.createAlert('Failed to upload ' + filename + ' to S3 bucket', true, 0, 3000);
                    console.log('S3 error', err);
                    reject(err); 
                } else {
                    bis_webutil.createAlert('Uploaded ' + filename + ' to S3 bucket successfully', false, 0, 3000); 
                    resolve(filename);//'Upload successful');
                }
            });
        });
    }

    /**
     * Creates the file list to allow a user to choose where to save an image on one of the viewers  
     */
    createSaveModal(opts) {
        this.s3.listObjectsV2( { 'Delimiter' : '/' }, (err, data) => {
            if (err) { console.log('an error occured', err); return; }

            console.log(JSON.stringify(opts,null,2));
            let formattedFiles = this.formatRawS3Files(data.Contents, data.CommonPrefixes);
            this.fileDisplayModal.openDialog(formattedFiles, opts);
        });
    }

    /**
     * Changes directories to another directory in the AWS bucket. Will also update the file dialog's GUI. Used as the fileListFn for AWS's file dialog (see changeDirectory in bisweb_simplefiledialog).
     * AWS returns all the files in the user's bucket (there are some limits with pagination but I haven't encountered problems with this as of 9/6/18).
     * This is functionally different from the file server, which fetches directories on demand. 
     * 
     * @param {String} pathname - Full path of the new directory, separated by '/'. If the path is 
     */
    changeDirectory(pathname) {

        pathname = pathname ||'';

        if (pathname==='[Root]') {
            pathname='';
        } else {
            if (pathname.indexOf('/') === 0)
                pathname=pathname.substr(1,pathname.length);
            if (pathname.lastIndexOf('/')!==pathname.length-1)
                pathname=pathname+'/';
        }

        return new Promise( (resolve, reject) => {
            this.s3.listObjectsV2( { 'Prefix' : pathname, 'Delimiter' : '/' }, (err, data) => {
                if (err) { console.log('an error occured', err); reject(err); return; }

                let formattedFiles = this.formatRawS3Files(data.Contents, data.CommonPrefixes);
                 
                let cdopts = {
                    'data' : formattedFiles, 
                    'path' : pathname,
                    'root' : '',
                };

                resolve(cdopts);
            });
        });

    }

    /**
     * Looks for a file with a given name on the S3 bucket, resolves its size if it exists, and rejects otherwise. 
     * This function is called when saving a file with a user supplied name to check whether the user will be overwriting an existing file.
     * 
     * @param {String} filename - Name of the file to search for.
     */
    getFileSize(filename) {

        return new Promise( (resolve, reject) => {

            let splitName = filename.split('/');
            let splitFolder = splitName.slice(0, splitName.length - 1);
            let folderName = splitFolder.join('/');
            this.s3.listObjectsV2( { 'Prefix' : folderName + '/', 'Delimiter' : '/' }, (err, data) => {
                if (err) { reject(err); return; }

                for (let item of data.Contents) {
                    if (item.Key === filename) {
                        resolve(item.Size);
                    }
                }

                reject('No file found');
            });
            
        });
    }

    /** 
     * Checks whether the url is a directory or not by querying S3. Overwrites BaseServerClient.isDirectory.
     * @param {String} url - the filename
     * @returns {Promise} payload true or false
     */
    isDirectory(url) {
        return new Promise( (resolve, reject) => {
            if (url[url.length - 1] !== '/') { url = url + '/'; }

            this.s3.listObjectsV2( { 'Prefix' : url, 'Delimiter' : '/' }, (err, data) => {
                if (err) { reject(err); return; }

                if (data.Contents.length > 0) { resolve(true); }                
                else { reject('No file found'); }
            });
            
        });
    }

    /** 
     * This function is not supported by bisweb_awsmodule, but overwritten to avoid a caller using the BaseServerClient.makeDirectory.
     * @param {String} filename - The directory name
     * @returns A rejected promise notifying the caller that makeDirectory is not supported in this file mode.
     */
    makeDirectory(filename) {
        return new Promise( (resolve, reject) => {
            //a leading '/' will create an empty folder with no name in the s3 bucket, so we want to trim it here.
            if (filename[0] === '/') { filename = filename.substring(1,filename.length); }
            if (filename[filename.length] !== '/') { filename = filename + '/'; }
            console.log('filename', filename);

            let uploadParams = {
                'Key' : filename,
                'Bucket' : AWSParameters.BucketName(),
                'Body' : ''
            };

            this.s3.upload(uploadParams, (err) => {
                if (err) { 
                    bis_webutil.createAlert('Failed to upload ' + filename + ' to S3 bucket', true, 0, 3000);
                    console.log('S3 error', err);
                    reject(err); 
                } else {
                    bis_webutil.createAlert('Uploaded ' + filename + ' to S3 bucket successfully', false, 0, 3000); 
                    resolve(filename);//'Upload successful');
                }
            });
        });
    }

    /** 
     * This function is not supported by bisweb_awsmodule, but overwritten to avoid a caller using the BaseServerClient.deleteDirectory.
     * @param {String} directory - The directory name
     * @returns A rejected promise notifying the caller that deleteDirectory is not supported in this file mode.
     */
    deleteDirectory(directory) {

        return new Promise((resolve, reject) => {
            if (directory.indexOf('/') === 0)
                directory = directory.substr(1, directory.length);
            if (directory.lastIndexOf('/') !== directory.length - 1)
                directory = directory + '/';

            this.s3.listObjectsV2({ 'Prefix': directory, 'Delimiter': '/' }, (err, data) => {
                if (err) { console.log('Error trying to delete directory', directory, err); reject(err); return; }

                let deleteParams = {
                    'Delete' : {
                        'Objects': [],
                        'Quiet': false
                    },
                };

                for (let entry of data.Contents) {
                    deleteParams.Delete.Objects.push({ 'Key': entry.Key });
                }

                this.s3.deleteObjects(deleteParams, (err, data) => {
                    if (err) { console.log('err', err); reject(err); return; }
                    console.log('deleted items', data);
                    resolve();
                });
            });
        });
    }

    //TODO: Implement getMatchingFiles
    /** getMatching Files
     * @param {String} querystring - e.g. "data/*.nii.gz"  -> return all files in data with .nii.gz as their suffix. 
     * @returns {Promise} payload list of filenames that match
     */
    getMatchingFiles(querystring = '*') {
        return Promise.reject('AWS does not currently support this operation');
        //return this.fileSystemOperation('getMatchingFiles',querystring);
    }


    /**
     * Attempts to authenticate the current user before executing a given S3 command (one of either 'showfiles' or 'uploadfiles' as of 7-23-18, which respectively call listObjectsInBucket and createImageSaveDialog).
     * If the user is not authenticated, a popup will appear that will prompt the user to enter their AWS credentials, or if the credentials are already cached, it will begin the authentication process. It will execute the command once the user has been successfully authenticated.
     * If the user is authenticated, wrapInAuth will call the appropriate command. 
     * 
     * @param {String} command - A string indicating the command to execute. 
     * @param {Object} opts - An options object
     * @param {Function} opts.callback - A callback function propagated from bis_webfileutil that will handle the non-AWS I/O for the retrieved data, , and a list of acceptable file suffixes.
     * @param {String} opts.title - The title to display on the load/save modal
     * @param {Object} opts.AWSParameters - AWS parameters related to the bucket the user is trying to log in to.
     */
    wrapInAuth(command, opts) {
        console.log('opts', opts);
        let parseCommand = () => {
            switch(command) {
                case 'showfiles' : {
                    this.fileDisplayModal.fileRequestFn = opts.callback;
                    this.createLoadModal(opts); 
                    break;
                }
                case 'uploadfile' : {
                    this.fileDisplayModal.fileRequestFn = opts.callback.bind(this);
                    this.createSaveModal(opts); 
                    break;
                }
                default : console.log('Unrecognized aws command', command, 'cannot complete request.');
            }
        };

        let expireTime = AWS.config.credentials.expireTime ? Date.parse(AWS.config.credentials.expireTime) : -1;

        //check if the user has an AWS bucket selected and if their credentials are still valid
        if (!this.currentAWS) {
            if (!this.bucketMenuModal) {
                this.createAWSBucketMenu();
            }
            console.log('Items=',this.awsbucketstorage);
            this.bucketMenuModal.dialog.modal('show');
            return;
        } else if (expireTime < Date.now() || this.refreshCredentials) {
            this.refreshCredentials = false;
            this.awsAuthUser(parseCommand, opts.AWSParameters);
            return;
        } else {
            parseCommand();
        }

       
    }

    /**
     * Begins the AWS authentication process by opening a new winbow with the URL specified as 'biswebaws.html'. This performs the following steps:
     * 1.) Attempts to log in to the Amazon Cognito User Pool associated with BisWeb, which will prompt the user for teeeheir Amazon Cognito credentials. The user may create an account at this time.
     * 2.) Attempts to register the user with an Amazon Cognito Identity pool authorized to access the relevant bucket. If successful, the user will be returned a set of credentials that expire in a short period of tiem (about an hour).
     * 
     * @param {Function} cb - Function to call after successful authentication
     */ 
    awsAuthUser(cb) {

        let returnf="./biswebaws.html";
        if (typeof window.BIS !== 'undefined') {
            returnf="../build/web/biswebaws.html";
        }

        let authParams = {
            'regionName' : AWSParameters.RegionName,
            'identityPoolId' : AWSParameters.IdentityPoolId(),
            'cognitoParams' : AWSParameters.authParams
        };

        window.addEventListener('awsready', () => {
            console.log('received awsready');
            authWindow.authParams = authParams;
            authWindow.dispatchEvent( new CustomEvent('handleIncoming'));
        });

        let authWindow = window.open(returnf, '_blank', 'width=400, height=400');

        //set timeout in case window doesn't return a storage event
        let timeoutEvent = setTimeout( () => {
            bis_webutil.createAlert('Timed out waiting for AWS to respond', true);
            window.removeEventListener('storage', idTokenEvent);
            //authWindow.close();
        }, 20000);

        let idTokenEvent = (data) => {
            if (data.key === 'aws_id_token') {
                window.removeEventListener('storage', idTokenEvent);
                clearTimeout(timeoutEvent);

                //---------------------------------------------------------------
                // 2.) log into identity pool
                //---------------------------------------------------------------

                let login = {}, cognitoUserPoolKey = `cognito-idp.${AWSParameters.RegionName}.amazonaws.com/${AWSParameters.authParams.UserPoolId}`;

                //construct credentials request from id token fetched from user pool, and the id of the identity pool
                //https://docs.aws.amazon.com/cognitoidentity/latest/APIReference/API_GetId.html#API_GetId_ResponseSyntax
                login[cognitoUserPoolKey] = data.newValue;
                AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                    'IdentityPoolId': AWSParameters.IdentityPoolId(),
                    'Logins': login,
                    'RoleSessionName': 'web'
                });

                AWS.config.credentials.get( (err) => {
                    if (err) {
                        console.log(err);
                        authWindow.postMessage({ 'failure': 'auth failed', 'error' : err.toString() }, '*');
                    } else {
                        console.log('Exchanged access token for access key');
                        authWindow.postMessage({ 'success': 'auth complete' }, '*');

                        //TODO: determine whether refresh is necessary
                        AWS.config.credentials.refresh( (err) => {
                            if (err) { console.log('an error occured refreshing', err); }
                            else { 
                                console.log('refresh successful.'); 
                                this.s3 = this.createS3(AWSParameters.BucketName(), AWS.config.credentials);
                                authWindow.close();
                                cb();
                            }
                        });
                    }
                });
            }
        };

        window.addEventListener('storage', idTokenEvent);
    }

    changeBuckets(bucketName, identityPoolId) {
        this.s3 = this.createS3(bucketName);
        this.currentAWS = { 'bucketName' : bucketName, 'identityPoolId' : identityPoolId };
        AWSParameters.updateBucketInfo(bucketName, identityPoolId);
        this.refreshCredentials = true;
    }

    /**
     * Takes the raw data returned by S3.listObjectsV2 and turns it into a nested file tree that bisweb_filedialog can render.
     *
     * @param {Object} files - The 'Contents' field of the data returned by S3.listObjects. May also contain a 'fullPath' field containing the full canonical path of the file, as file.Key is sometimes truncated.
     * @param {String} directories - The list of directories rooted in the current directory (i.e. the directory provided as 'Prefix' while fetching the objects)
     * @param {String} suffixes - A comma separated string of acceptable file types -- files with an extension not in filters are excluded. 
     * @returns An array of files parseable by bisweb_filedialog
     */
    formatRawS3Files(files, directories, suffixes = null) {
        
        let filtersArray = suffixes ? suffixes.split(',') : null;

        //filters start with a '.' which we strip out here for compatibility with String.split()
        if (suffixes) {
            for (let i = 0; i < filtersArray.length; i++) {
                filtersArray[i] = filtersArray[i].substring(1);
            }
        }

        //split filenames and strip out all the folders (filepaths that end with '/')
        let paths = [];

        for (let file of files) {

            let splitFile = file.Key.split('/');
            let fileExtension = splitFile[splitFile.length - 1].split('.');

            if (suffixes) {
                for (let filter of filtersArray) {
                    if (fileExtension[fileExtension.length - 1] === filter) {
                        paths.push({ 'filepath' : splitFile, 'size' : file.Size});
                    }
                }
            } else {
                paths.push({ 'filepath' : splitFile, 'size' : file.Size });
            }

        }

        let formattedFiles = [];

        for (let path of paths) {
            let fullpath = path.filepath.join('/');
            let name = path.filepath[path.filepath.length - 1];
            let fileType = name.split('.'); 
            fileType = fileType[fileType.length - 1];

            if (name.length > 0) {
                let newEntry = {
                    'text' : name,
                    'path' : fullpath,
                    'size' : path.size
                };

                switch(fileType[fileType.length - 1]){
                    case 'gz' : newEntry.type = (fileType[fileType.length - 2] === 'nii') ? 'picture' : 'file'; break;
                    case 'md' : newEntry.type = 'text'; break;
                    case 'mkv' : 
                    case 'avi' : 
                    case 'mp4' : newEntry.type = 'video'; break;
                    case 'mp3' :
                    case 'flac' :
                    case 'FLAC' :
                    case 'wav' : 
                    case 'WAV' : newEntry.type = 'audio'; break;
                    default : newEntry.type = 'file';
                }

                formattedFiles.push(newEntry);
            }

        }

        //sort files in alphabetical order
        formattedFiles.sort( (a,b) => { 
            let pathA = a.text.toLowerCase(), pathB = b.text.toLowerCase();
            if (pathA > pathB) return 1;
            if (pathA < pathB) return -1;
            return 0;
        });


        for (let directory of directories) {
            let name = directory.Prefix.split('/');
            name = name[name.length - 2]; //prefix is a string of folder names ending in '/', so the very last entry in the split prefix will be empty
            let newEntry = { 
                'text' : name,
                'path' : directory.Prefix,
                'type' : 'directory',
                'children' : []
            };

            formattedFiles.unshift(newEntry);
        }

        return formattedFiles;
    }

    createAWSBucketMenu() {
        let awsmodal = bis_webutil.createmodal('AWS Buckets');

        let tabView = this.createAWSTabView();

        let selectPane = this.createAWSBucketSelector(awsmodal, tabView);
        tabView.find('#aws-bucket-selector-pane').append(selectPane);

        let entryPane = this.createAWSBucketEntry(awsmodal);
        tabView.find('#aws-bucket-entry-pane').append(entryPane);

        awsmodal.body.append(tabView);
        awsmodal.dialog.find('.modal-footer').remove();

        awsmodal.dialog.on('hidden.bs.modal', () => {
            let bucketSelectorDropdown = awsmodal.body.find('#bucket-selector-dropdown');
            bucketSelectorDropdown.empty(); //remove all option elements from the dropdown
        });

        this.bucketMenuModal = awsmodal;
        return awsmodal;
    }

    createAWSTabView() {
        let tabView = $( `
                <ul class="nav nav-tabs" id="aws-tab-menu" role="tablist">
                    <li class="nav-item active">
                        <a class="nav-link" id="entry-tab" data-toggle="tab" href="#aws-entry-tab-panel" role="tab" aria-controls="entry" aria-selected="false">Enter New Bucket</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" id="selector-tab" data-toggle="tab" href="#aws-selector-tab-panel" role="tab" aria-controls="home" aria-selected="true">Select AWS Bucket</a>
                    </li>
                </ul>
                <div class="tab-content" id="aws-tab-content">
                    <div class="tab-pane fade active in" id="aws-selector-tab-panel" role="tabpanel" aria-labelledby="selector-tab">
                        <br>
                        <div id="aws-bucket-selector-pane"></div>
                    </div>
                    <div class="tab-pane fade" id="aws-entry-tab-panel" role="tabpanel" aria-labelledby="profile-tab">
                        <br>
                        <div id="aws-bucket-entry-pane"></div>
                    </div>
                </div>
                `);
        return tabView;
    }

    createAWSBucketSelector(awsmodal, tabView) {

        let selectContainer = $(`
            <div class='container-fluid form-group' style="margin-top: 10px">
                <label for='bucket-selector'>Select a Bucket:</label>
                <select class='form-control' id='bucket-selector-dropdown' css="margin-top:10px; margin-left:10px; margin-right:10px">
                </select>
                <div id='bucket-selector-table-container'></div>
                <div class='btn-group' role=group' aria-label='Viewer Buttons' style='float: left; margin-top:10px'></div>
            </div>
        `);

        let confirmButton = bis_webutil.createbutton({ 'name' : 'Confirm', 'type' : 'success', 'css' : { 'margin-right' : '10px' }});
        let cancelButton = bis_webutil.createbutton({ 'name' : 'Cancel', 'type' : 'danger', 'css' : { 'margin-right' : '10px' } });
        let entryButton = bis_webutil.createbutton({ 'name' : 'Enter New Bucket', 'type' : 'info' });
        $(confirmButton).prop('disabled', 'disabled');

        let buttonGroup = selectContainer.find('.btn-group');
        buttonGroup.append(confirmButton);
        buttonGroup.append(cancelButton);
        buttonGroup.append(entryButton);

        //delete the old dropdown list and recreate it using the fresh data from the application cache
        let refreshDropdown = () => {

            return new Promise((resolve, reject) => {
                //clear out old options and read localStorage for new keys. 
                let bucketSelectorDropdown = selectContainer.find('#bucket-selector-dropdown');
                bucketSelectorDropdown.empty();

                this.awsstoredbuckets = {};
                bucketSelectorDropdown.append(`<option id='aws-empty-entry'></option>`);
                this.awsbucketstorage.iterate((value, key) => {

                    try {
                        //ignore the 'currentAWS' key because it's a duplicate of an entry already in the bucket
                        if (key !== 'currentAWS') {
                            //data is stored as stringified JSON
                            let bucketObj = JSON.parse(value);
                            let entry = $(`<option id=${key} value=${bucketObj.bucketName}>${bucketObj.bucketName}</option>`);
                            bucketSelectorDropdown.append(entry);
                            this.awsstoredbuckets[key] = bucketObj;
                        }
                    } catch (e) {
                        console.log('an error occured while parsing the AWS bucket data', e);
                        reject(e);
                    }

                }).then( () => {
                    resolve(bucketSelectorDropdown);
                }).catch((err) => {
                    console.log('an error occured while fetching values from localstorage', err);
                    reject(err);
                });

            });

        };


        //recreate the info table each time the user selects a different dropdown item
        let dropdown = selectContainer.find('#bucket-selector-dropdown');
        dropdown.on('change', () => {
            let tableContainer = awsmodal.body.find('#bucket-selector-table-container');
            tableContainer.empty();

            let selectedItem = dropdown[0][dropdown[0].selectedIndex];
            let selectedItemId = selectedItem.id;

            if (selectedItemId !== 'aws-empty-entry') {
                let selectedItemInfo = this.awsstoredbuckets[selectedItemId];
                let tableHead = $(`
                    <table class='table table-sm table-dark'>
                        <thead> 
                            <tr>
                                <th scope="col">Bucket Name</th>
                                <th scope="col">Identity Pool ID</th>
                                <th scope="col"></th>
                            </tr>
                        </thead>
                        <tbody id='aws-selector-table-body' align='justify'>   
                        </tbody>               
                    </table> 
                `);

                let tableRow = $(`
                    <td class='bootstrap-table-entry bucket-name'>${selectedItemInfo.bucketName}</td>
                    <td class='bootstrap-table-entry identity-pool-id'>${selectedItemInfo.identityPoolId}</td>
                    <td class='bootstrap-table-entry'>
                        <span class='input-group-btn'>
                            <button class='btn btn-default btn-sm'>
                                <i class='glyphicon glyphicon-pencil'></i>
                            </button>
                        </span>
                    </td>
                `);

                //create edit modal and update UI with the changed values
                tableRow.find('.btn').on('click', () => {
                    this.createAWSEditModal(selectedItemId, selectedItemInfo.bucketName, selectedItemInfo.identityPoolId)
                    .then( (params) => {
                        console.log('params', params);
                        tableContainer.find('table .bucket-name')[0].innerHTML = params.bucketName;
                        tableContainer.find('table .identity-pool-id')[0].innerHTML = params.identityPoolId;

                        refreshDropdown().then( (dropdown) => {
                            console.log('refresh dropdown', dropdown, 'bucket name', params.bucketName);
                            dropdown.val(params.bucketName);
                        });
                    })
                    .catch( (e) => { 
                        if (e !== 'Edit Canceled') {
                            console.log('error', e);
                        } else {
                            bis_webutil.createAlert('Edit canceled', false, null, 2500);
                        }
                    });
                });

                tableHead.find('#aws-selector-table-body').append(tableRow);
                tableContainer.append(tableHead);

                //show confirm button if changed to a valid entry
                confirmButton.prop('disabled', '');
            } else {
                confirmButton.prop('disabled', 'disabled');
            }
        });

        awsmodal.dialog.on('hidden.bs.modal', () => {
            $('#bucket-selector-table-container').empty();
            $(confirmButton).prop('disabled', 'disabled');
        });


        //Set button actions
        confirmButton.on('click', (e) => {
            e.preventDefault();
            let selectedItem = dropdown[0][dropdown[0].selectedIndex];
            if (!selectedItem.id) {
                bis_webutil.showErrorModal('An error occured', 'Please select an item from the list');
                return;
            }

            let selectedItemInfo = this.awsstoredbuckets[selectedItem.id];
            selectedItemInfo['id'] = selectedItem.id;

            this.awsbucketstorage.setItem('currentAWS', JSON.stringify(selectedItemInfo));
            this.changeBuckets(selectedItemInfo.bucketName, selectedItemInfo.identityPoolId);
            awsmodal.dialog.modal('hide');
            bis_webutil.createAlert('Changed to bucket ' + selectedItemInfo.bucketName, false, null, 2500);
        });

        cancelButton.on('click', (e) => {
            e.preventDefault();
            awsmodal.dialog.modal('hide');
        });

        entryButton.on('click', (e) => {
            e.preventDefault();
            let newBucketTab = awsmodal.body.find('#entry-tab');
            console.log('new bucket tab');
            newBucketTab.click();
        });

        //we want the selector to populate both when the modal is opened and when the selector tab is selected
        tabView.find('#selector-tab').on('show.bs.tab', refreshDropdown);
        awsmodal.dialog.on('show.bs.modal', refreshDropdown);

        return selectContainer;
    }

    createAWSEditModal(id, bucketName, identityPoolId) {
        return new Promise( (resolve, reject) => {
            let editModal = bis_webutil.createmodal('Edit Entry', 'modal-sm');
            let editContainer = $(`
                <div class='container-fluid'>
                    <div class='form-group'>
                        <label for='bucket'>Bucket Name:</label><br>
                        <input name='bucket' class='edit-bucket-input' type='text' class='form-control'><br>
                        <label for='access-key'>Identity Pool ID:</label><br>
                        <input name='access-key' class='edit-identity-pool-input' type='text' class='form-control'>
                    </div>
                    <div class='btn-group' role=group' aria-label='Viewer Buttons' style='float: left'></div>
                </div>
            `);
    
            let confirmButton = bis_webutil.createbutton({ 'name' : 'Confirm', 'type' : 'success' });
            let cancelButton = bis_webutil.createbutton({ 'name' : 'Cancel', 'type' : 'danger' });
    
            editContainer.find('.edit-bucket-input').val(bucketName);
            editContainer.find('.edit-identity-pool-input').val(identityPoolId);
    
            let buttonGroup = editContainer.find('.btn-group');

            let resolvePromise = false;
            let newBucketName, newIdentityPoolName;

            confirmButton.on('click', () => {
                newBucketName = editContainer.find('.edit-bucket-input').val();
                newIdentityPoolName = editContainer.find('.edit-identity-pool-input').val();
    
                let paramsObj = {
                    'id' : id,
                    'bucketName': newBucketName,
                    'identityPoolId': newIdentityPoolName
                };
    
                this.awsbucketstorage.setItem(id, JSON.stringify(paramsObj));
                this.awsbucketstorage.setItem('currentAWS', JSON.stringify(paramsObj));
    
                this.changeBuckets(bucketName, identityPoolId);
                bis_webutil.createAlert('Settings changed.', false, null, 2500);

                resolvePromise = true;
                editModal.dialog.modal('hide');
            });
    
            cancelButton.on('click', () => {
                editModal.dialog.modal('hide');
            });

            editModal.dialog.on('hidden.bs.modal', () => {
                if (resolvePromise) { resolve({ 'id' : id, 'bucketName' : newBucketName, 'identityPoolId' : newIdentityPoolName }); }
                else { reject('Edit canceled'); }
            });
    
            editModal.body.append(editContainer);
            buttonGroup.append(confirmButton);
            buttonGroup.append(cancelButton);
    
            editModal.footer.remove();
            editModal.dialog.modal('show');
        });
    }

    createAWSBucketEntry(awsmodal) {

        let bucketInfoTitle = "The full name of your bucket, e.g. \"bisweb-test-bucket\"";
        let idpoolInfoTitle = "The Identity Pool ID will take the form region:identifier. For more info on how to find the ID, consult AWSBuckets.md in the docs section of the repository.";
        let entryContainer = $(`
            <div class='container-fluid'>
                <div class='form-group'>
                    <label for='bucket'>Bucket Name:</label><br>
                    <input name='bucket' class='bucket-input' type='text' class='form-control'>
                    <span class='glyphicon glyphicon-question-sign bucket-input-info' style='color: rgb(12, 227, 172);' data-toggle='tooltip' title='${bucketInfoTitle}'></span><br>
                    <label for='access-key'>Identity Pool ID:</label><br>
                    <input name='access-key' class='identity-pool-input' type='text' class='form-control'>
                    <span class='glyphicon glyphicon-question-sign idpool-input-info' style='color: rgb(12, 227, 172);' data-toggle='tooltip' title='${idpoolInfoTitle}'></span><br>
                </div>
                <div class='btn-group' role=group' aria-label='Viewer Buttons' style='float: left'></div>
            </div>
        `);

        let confirmButton = bis_webutil.createbutton({ 'name': 'Confirm', 'type': 'success','css' : { 'margin-right' : '10px' } });
        let cancelButton = bis_webutil.createbutton({ 'name': 'Cancel', 'type': 'danger' });

        confirmButton.on('click', () => {

            let bucketName = entryContainer.find('.bucket-input')[0].value;
            let identityPoolId = entryContainer.find('.identity-pool-input')[0].value;

            if (bucketName === '') { bis_webutil.showErrorModal('An error occured', 'Please fill out the required field \'Bucket Name\''); return; }
            if (identityPoolId === '') { bis_webutil.showErrorModal('An error occured', 'Please fill out the required field \'Identity Pool ID\''); return;}

            //index contains the number of keys in the database
            let key = 'awsbucket' + bis_webutil.getuniqueid();

            let paramsObj = {
                'id' : key,
                'bucketName': entryContainer.find('.bucket-input')[0].value,
                'identityPoolId': entryContainer.find('.identity-pool-input')[0].value
            };

            this.awsbucketstorage.setItem(key, JSON.stringify(paramsObj));
            this.awsbucketstorage.setItem('currentAWS', JSON.stringify(paramsObj));

            this.changeBuckets(bucketName, identityPoolId);
            awsmodal.dialog.modal('hide');
            bis_webutil.createAlert('Created bucket ' + bucketName + ' and switched to it.', false, null, 2500);
        });

        cancelButton.on('click', () => {
            awsmodal.dialog.modal('hide');
        });

        //set tooltips for help buttons
        let bucketInfoSpan = entryContainer.find('.bucket-input-info');
        bucketInfoSpan.on('click hover', () => {
            bucketInfoSpan.tooltip('show');
        });

        let idpoolInfoSpan = entryContainer.find('.idpool-input-info');
        idpoolInfoSpan.on('click', () => {
            idpoolInfoSpan.tooltip('show');
        });

        let buttonBar = entryContainer.find('.btn-group');
        buttonBar.append(confirmButton);
        buttonBar.append(cancelButton);

        return entryContainer;
    }
}

module.exports = AWSModule;
