'use strict';

const AWS = require('aws-sdk');
const AWSCognitoIdentity = require('amazon-cognito-identity-js');
const AWSParameters = require('../../web/aws/awsparameters.js');
const bis_webutil = require('bis_webutil.js');
const bisweb_filedialog = require('bisweb_filedialog.js');
const bisweb_simplefiledialog = require('bisweb_simplefiledialog.js');

/**
 * Class designed to save and load files from Amazon S3, using Amazon Cognito for authentication. 
 * Does not require the use of an app key like Dropbox and Google Drive. 
 */
class AWSModule {

    constructor() {
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

        this.saveImageModal = null;

        //UI features
        this.createUserModal = null;
        this.authUserModal = null;

        this.refreshCredentials = true;

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
     * @param {Array} filters - Filters object passed from bis_genericio.
     * @param {String} modalTitle - Name to display at the top of the modal.
     * @param {String} suffixes - Comma separated list of file extensions for files that should be displayed in the modal. 
     */
    createLoadImageModal(filters, modalTitle, suffixes) {
        this.s3.listObjectsV2( { 'Delimiter' : '/' }, (err, data) => {
            if (err) { console.log('an error occured', err); return; }

            console.log('contents', data);
            let formattedFiles = this.formatRawS3Files(data.Contents, data.CommonPrefixes, suffixes);

            this.fileDisplayModal.openDialog(formattedFiles, {
                'filters' : filters,
                'title' : modalTitle,
                'mode' : 'load'
            });
        });
    }

    /**
     * Downloads a file with a given name from the current S3 bucket. 
     * Called by bis_genericio starting from when a user sends the request by clicking on a file in a file display modal.
     * 
     * @param {String} filename - The name of the file 
     */
    downloadFile(filename) {

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

                console.log('data', data.Body);

                resolve({ 
                    data: data.Body, 
                    filename: filename 
                });
            });
        });
    }

    /**
     * Uploads a file to the current S3 bucket. 
     * Called by bis_genericio starting from when a user types a filename into the save filename modal and clicks confirm. 
     * 
     * @param {String} filename - The name of the file 
     * 
     */
    uploadFile(filename, data) {

        return new Promise( (resolve, reject) => {
            let uploadParams = {
                'Key' : filename,
                'Bucket' : AWSParameters.BucketName,
                'Body' : data
            };

            this.s3.upload(uploadParams, (err) => {
                if (err) { 
                    bis_webutil.createAlert('Failed to upload ' + filename + ' to S3 bucket', true, 0, 3000);
                    console.log('S3 error', err);
                    reject(err); 
                } else {
                    bis_webutil.createAlert('Uploaded ' + filename + ' to S3 bucket successfully', false, 0, 3000); 
                    resolve('Upload successful');
                }
            });
        });
    }

    /**
     * Creates the file list to allow a user to choose where to save an image on one of the viewers  
     */
    createSaveImageModal(filters, modalTitle) {
        this.s3.listObjectsV2( {}, (err, data) => {
            if (err) { console.log('an error occured', err); return; }

            let formattedFiles = this.formatRawS3Files(data.Contents);

            this.fileDisplayModal.fileRequestFn = this.uploadFile;
            this.fileDisplayModal.openDialog(formattedFiles, {
                 'filters' : filters,
                 'title' : modalTitle,
                 'mode' : 'save'
            });
        });
    }

    /**
     * Changes directories to another directory in the AWS bucket. Will also update the file dialog's GUI. Used as the fileListFn for AWS's file dialog (see changeDirectory in bisweb_simplefiledialog).
     * AWS returns all the files in the user's bucket (there are some limits with pagination but I haven't encountered problems with this as of 9/6/18).
     * This is functionally different from the file server, which fetches directories on demand. 
     * 
     * @param {String} path - Full path of the new directory, separated by '/'.
     */
    changeDirectory(path) {
        
        return new Promise( (resolve, reject) => {
            this.s3.listObjectsV2( { 'Prefix' : path, 'Delimiter' : '/' }, (err, data) => {
                if (err) { console.log('an error occured', err); reject(err); return; }

                let formattedFiles = this.formatRawS3Files(data.Contents);
                 
                let cdopts = {
                    'data' : formattedFiles,
                    'startDirectory' : path,
                    'rootDirectory' : '/'
                };

                resolve(cdopts);
            });
        })

    }

    /**
     * Gets the size of a file with a given name and returns it. Technically a synchronous function but templated as a promise for compatibility with bis_genericio.
     * @param {String} filename 
     */
    getFileSize(filename) {
        return new Promise( (resolve, reject) => {

        });
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
                    this.createLoadImageModal(opts.filters, opts.title, opts.suffix); 
                    break;
                }
                case 'uploadfile' : {
                    this.fileDisplayModal.fileRequestFn = opts.callback;
                    this.createSaveImageModal(opts.filters, opts.title, opts.suffix); 
                    break;
                }
                default : console.log('Unrecognized aws command', command, 'cannot complete request.');
            }
        };
        let expireTime = AWS.config.credentials.expireTime ? Date.parse(AWS.config.credentials.expireTime) : -1;

        if (expireTime < Date.now() || this.refreshCredentials) {
            this.refreshCredentials = false;
            this.awsAuthUser(parseCommand, opts.AWSParameters);
            return;
        } else {
            parseCommand();
        }

       
    }

    /**
     * Begins the AWS authentication process by opening a new winbow with the URL specified as 'biswebaws.html'. This performs the following steps:
     * 1.) Attempts to log in to the Amazon Cognito User Pool associated with BisWeb, which will prompt the user for their Amazon Cognito credentials. The user may create an account at this time.
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
                        authWindow.postMessage({ 'failure': 'auth failed' });
                    } else {
                        console.log('Exchanged access token for access key');
                        authWindow.postMessage({ 'success': 'auth complete' }, window.location);

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
        let folders = [];

        for (let file of files) {

            let splitFile = file.Key.split('/');

            //folders have an empty string after the last '/'
            if (splitFile[splitFile.length - 1] !== '') {
                let fileExtension = splitFile[splitFile.length - 1].split('.');

                if (suffixes) {
                    for (let filter of filtersArray) {
                        if (fileExtension[fileExtension.length - 1] === filter) {
                            paths.push({ 'filepath' : splitFile, 'size' : file.Size, 'fullpath' : file.FullPath });
                        }
                    }
                } else {
                    paths.push({ 'filepath' : splitFile, 'size' : file.Size, 'fullPath' : file.fullPath });
                }

            } else {
                folders.push({ 'filepath' : splitFile, 'fullPath' : file.fullPath });
            }
        }

        //sort files by hierarchical order (root folders first, then folders one level deep, and so on)
        paths.sort( (a,b) => { 
            return (a.length - b.length);
        });

        let formattedFiles = [];

        for (let path of paths) {
            let currentLocation = formattedFiles;
            for (let folder of path.filepath) {
                let enclosingFolder = findFileWithKey(folder, currentLocation);
                if (!enclosingFolder) {

                    //files should end in a filetype, i.e. a '.' and some extension
                    //otherwise it's a folder
                    if(folder.split('.').length === 1) {

                        let folderPath = makeFolderPath(path, folder);
                        let newEntry = { 
                            'text' : folder,
                            'path' : folderPath,
                            'type' : 'directory',
                            'children' : []
                        };

                        currentLocation.push(newEntry);

                        //we created the new file in the process of determining where to add the new file, so set the new folder to be the enclosing folder for files farther down the path
                        enclosingFolder = newEntry;
                    } else {

                        let folderPath = path.filepath.join('/');
                        let fileType = folder.split('.');

                        let newEntry = {
                            'text' : folder,
                            'path' : folderPath,
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


                        currentLocation.push(newEntry);
                    }
                } 
                
                currentLocation = enclosingFolder.children;
            }
        }

        //add empty folders to list
        //folders is an array of filepaths split on the character '/'
        for (let folder of folders) {
            console.log('folder', folder);
            let currentFolder = findFileWithKey(folder.filepath[0], formattedFiles);

            //skip the last index because every entry in folders ends in ''
            for (let i = 0; i < folder.filepath.length - 1; i++) {

                if (i === folder.filepath.length - 2) {
                    currentFolder = currentFolder || formattedFiles;
                    let folderName = folder.filepath[folder.filepath.length - 2];

                    if (!findFileWithKey(folderName, currentFolder)) {
                        let folderPath = folder.fullPath ? folder.fullPath : makeFolderPath(folder.filepath, folderName);
                        let newEntry = {
                            'text' : folderName,
                            'path' : folderPath,
                            'type' : 'directory',
                            'children' : []
                        };
                        currentFolder.unshift(newEntry);
                    }
                } else {
                    currentFolder = findFileWithKey(folder.filepath[i], currentFolder);
                }
            }
        }

        return formattedFiles;

        //helper function to find whether a folder or a file with the given name already exists in currentDirectory
        function findFileWithKey(key, currentDirectory) {
            console.log('current directory', currentDirectory);
            for (let file of currentDirectory) {
                if (file.text === key) {
                    return file;
                }
            }

            return false;
        }
    }
}

module.exports = AWSModule;
