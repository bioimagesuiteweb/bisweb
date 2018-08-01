'use strict';

const AWS = require('aws-sdk');
const AWSCognitoIdentity = require('amazon-cognito-identity-js');
const AWSParameters = require('../../web/awsparameters.js');
const bisweb_image = require('bisweb_image.js');
const bis_webutil = require('bis_webutil.js');
const wsutil = require('../../fileserver/wsutil.js');
const bisweb_filedialog = require('bisweb_filedialog.js');
const $ = require('jquery');

/**
 * Class designed to save and load files from Amazon S3, using Amazon Cognito for authentication. 
 * Does not require the use of an app key like Dropbox and Google Drive. 
 */
class AWSModule {

    constructor() {
        AWS.config.update({
            'region' : AWSParameters.RegionName,
            'credentials' : new AWS.CognitoIdentityCredentials({
                'IdentityPoolId' : AWSParameters.IdentityPoolId
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

        //file display modal gets deleted if you try to load it too soon
        //not completely sure why -Zach
        bis_webutil.runAfterAllLoaded( () => {   
            this.fileDisplayModal = new bisweb_filedialog('Bucket Contents', { 'makeFavoriteButton' : false });
            this.fileDisplayModal.fileRequestFn = this.createFileRequest.bind(this);

            this.fileSaveModal = new bisweb_filedialog('Choose Folder to Save In', { 'makeFavoriteButton' : false, 'modalType' : 'save', 'displayFiles' : false });
            this.fileSaveModal.fileRequestFn = this.createFileRequest.bind(this);
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
            'params' : { Bucket : bucketName}
        });

        return s3;
    }

    /**
     * Lists the objects in the bucket referred to by the current S3 instance (this.S3). Note that S3 is a flat storage structure in which everything is stored in the same place.
     * Any semblance of a file structure (e.g. indexed locations like 'Pictures/7-23-2018') are artificial. 
     * Creates a file browsing dialog using bisweb_filedialog (see the documentation in that file for more details).
     */
    listObjectsInBucket() {
        this.s3.listObjectsV2( {}, (err, data) => {
            if (err) { console.log('an error occured', err); return; }
            console.log('got objects', data);

            let formattedFiles = this.formatRawS3Files(data.Contents);

            console.log('files', formattedFiles);
            this.fileDisplayModal.createFileList(formattedFiles);
            this.fileDisplayModal.showDialog();
        });
    }

    /**
     * Wrapper function for AWS functionality (as of 7-23-18 requestFile and uploadFile). 
     * Can be called from bisweb_filedialog (this function is attached to the FileDialog object and invoked from within when a user selects a file).
     *
     * @param {Object} params - Parameters object containing the following
     * @param {String} params.command - String name for the command to execute. One of 'getfiles' or 'uploadfiles' as of 7-23-18.
     * @param {String} params.name - Name of the file to fetch from the server, or what to name the file being saved to the server.
     * @param {bisweb_image} params.files - List of files to upload to the server. May be aliased as 'params.file' in the case of a single file.
     * @param {Function} cb - Function to call after successful execution of an upload. Optional.
     * @param {Function} eb - Function to call after unsuccessful execution of an upload. Optional.
     */
    //expected to be called from bisweb_fileserver (see 'fileRequestFn') 
    /*makeRequest(params, cb = null, eb = null) {

        let command = params.command;
        let files = this.algorithmController.getImage(this.defaultViewer, 'image');
        let viewer = params.viewer;
        console.log('this', this);
        switch (params.command) {
            case 'getfile' : 
            case 'getfiles' : this.requestFile(params.name, viewer, cb, eb); break;
            case 'uploadfile' : 
            case 'uploadfiles' : this.uploadFile(params.name, files, cb, eb); break;
            default : console.log('Cannot execute unknown command', command);
        }
}*/


    /**
     * Packages the relevant parameters and functionality for downloading an image from the cloud into an object to be invoked by bis_genericio.
     * 
     * @param {Object} params - Parameters object containing the following
     * @param {String} params.command - String name for the command to execute. One of 'getfiles' or 'uploadfiles' as of 7-23-18.
     * @param {String} params.name - Name of the file to fetch from the server, or what to name the file being saved to the server.
     * @param {bisweb_image} params.files - List of files to upload to the server. May be aliased as 'params.file' in the case of a single file.
     */
    createFileRequest(params) {
        let obj = {
            name: params.name,
            params: params,
            awsinfo: AWSParameters,
            responseFunction: () => {
                return new Promise( (resolve, reject) => {
                    self.s3.getObject(this.params, (err, data) => {
                        if (err) { 
                            reject(err); 
                            return;
                        }

                        resolve({ 
                            data: data.Body, 
                            filename: filehandle 
                        });
                    });
                });
            }
        };

        //this.callback is set when a modal is opened.
        this.callback(obj);
    }
    
    /**
     * Makes a RESTful request for a file from the S3 bucket referenced by the current instance of this.S3 and attempts to put it on the default viewer (this.defaultViewer.
     * Generally called from bisweb_filedialog.
     *
     * @param {String} name - Name of the file to request from the S3 bucket. 
     */
    requestFile(name, cb = () => {}, eb = () => {}) {

        let params = {
            'Bucket' : AWSParameters.BucketName,
            'Key' : name            
        };

        this.s3.getObject(params, (err, data) => {
            if (err) { console.log('an error occured', err); eb(); }
            else {
                let unzippedFile = wsutil.unzipFile(data.Body);
                console.log('unzipped file', unzippedFile);

                let loadedImage = new bisweb_image();
                loadedImage.initialize();
                loadedImage.parseNII(unzippedFile.buffer);
                console.log('loadedImage', loadedImage);

                //dismiss loading message
                let imageLoadEvent = new CustomEvent('imagetransmission');
                document.dispatchEvent(imageLoadEvent);

                this.algorithmController.sendImageToViewer(loadedImage, { 'viewername' : this.defaultViewer}); 
                cb();
            }
        });
        
    }

    /**
     * Uploads a file to the bucket referred to by this.S3. May call back when finished. 
     * 
     * @param {String} name - What to name the file being uploaded to the bucket. 
     * @param {bisweb_image} body - The bisweb_image meant to be attached as the body of the request. It is serialized and zipped before being sent. 
     * @param {Function} cb - The function to call after a successful upload. Optional.
     * @param {Function} eb - The function to call after an unsuccessful upload. Optional.
     */
            // replace body with rawData
            
    uploadFile(name, body, cb = null, eb = null) {

        let rawData = body.serializeToNII();
        let zippedData = wsutil.zipFile(rawData);
        let filename = name + '.nii.gz';

        let params = {
            'Bucket' : AWSParameters.BucketName,
            'Key' : filename,
            'Body' : zippedData
        };

        this.s3.upload(params, (err, data) => {
            if (err) { console.log(err); eb(); }
            else {
                console.log('uploaded file', name, 'with data', data);
                cb();
            }
        });
    }

    createSaveImageModal() {
        this.s3.listObjectsV2( {}, (err, data) => {
            if (err) { console.log('an error occured', err); return; }
            console.log('got objects', data);

            let formattedFiles = this.formatRawS3Files(data.Contents);

            console.log('files', formattedFiles);
            this.fileSaveModal.createFileList(formattedFiles);
            this.fileSaveModal.showDialog();
        });
    }

    /**
     * Attempts to authenticate the current user before executing a given S3 command (one of either 'showfiles' or 'uploadfiles' as of 7-23-18, which respectively call listObjectsInBucket and createImageSaveDialog).
     * If the user is not authenticated, a popup will appear that will prompt the user to enter their AWS credentials, or if the credentials are already cached, it will begin the authentication process.
     * If the user is authenticated, wrapInAuth will call the appropriate command. 
     * @param {String} command - A string indicating the command to execute. 
     * @param {Function} callback - A function propagated from bis_webfileutil that will handle the non-AWS I/O for the retrieved data. 
     */
    wrapInAuth(command, callback) {
        let expireTime = AWS.config.credentials.expireTime ? Date.parse(AWS.config.credentials.expireTime) : -1;

        if (expireTime < Date.now()) {
            this.awsAuthUser();
            return;
        }

        this.callback = callback;
        switch(command) {
            case 'showfiles' : this.listObjectsInBucket(); break;
            case 'uploadfile' : this.createSaveImageModal(); break;
            default : console.log('Unrecognized aws command', command, 'cannot complete request.');
        }
        console.log('called command', command, 'with parameters', parameters);
    }

    /**
     * Begins the AWS authentication process by opening a new winbow with the URL specified as 'biswebaws.html'. This performs the following steps:
     * 1.) Attempts to log in to the Amazon Cognito User Pool associated with BisWeb, which will prompt the user for their Amazon Cognito credentials. The user may create an account at this time.
     * 2.) Attempts to register the user with an Amazon Cognito Identity pool authorized to access the relevant bucket. If successful, the user will be returned a set of credentials that expire in a short period of tiem (about an hour).
     */ 
    awsAuthUser() {
        let authWindow = window.open('../web/biswebaws.html', '_blank', 'width=400, height=400');
        let idTokenEvent = (data) => {
            //console.log('storage event', data);
            if (data.key === 'aws_id_token') {
                window.removeEventListener('storage', idTokenEvent);

                //---------------------------------------------------------------
                // 2.) log into identity pool
                //---------------------------------------------------------------

                let login = {}, cognitoUserPoolKey = `cognito-idp.${AWSParameters.RegionName}.amazonaws.com/${AWSParameters.authParams.UserPoolId}`;

                //construct credentials request from id token fetched from user pool, and the id of the identity pool
                //https://docs.aws.amazon.com/cognitoidentity/latest/APIReference/API_GetId.html#API_GetId_ResponseSyntax
                login[cognitoUserPoolKey] = data.newValue;
                AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                    'IdentityPoolId': AWSParameters.IdentityPoolId,
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
                                this.s3 = this.createS3(AWSParameters.BucketName, AWS.config.credentials);
                            }
                        });
                    }
                });
            }
        };

        window.addEventListener('storage', idTokenEvent);
    }

    /**
     * Takes the raw data returned by S3.listObjectsV2 and turns it into a nested file tree that bisweb_filedialog can render.
     *
     * @param {Object} files - The 'Contents' field of the data returned by S3.listObjects.
     */
    formatRawS3Files(files) {

        //split filenames and strip out all the folders (filepaths that end with '/')
        let paths = [];
        for (let file of files) {
            let splitFile = file.Key.split('/');
            if (splitFile[splitFile.length - 1] !== '') {
                paths.push(splitFile);
            }
        }

        //sort files by hierarchical order (root folders first, then folders one level deep, and so on)
        paths.sort( (a,b) => { 
            return (a.length - b.length);
        });

        let formattedFiles = [];

        for (let path of paths) {
            let currentLocation = formattedFiles;

            for (let folder of path) {
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

                        let folderPath = path.join('/');
                        let fileType = folder.split('.');

                        let newEntry = {
                            'text' : folder,
                            'path' : folderPath
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
        return formattedFiles;

        //helper function to find whether a folder or a file with the given name already exists in currentDirectory
        function findFileWithKey(key, currentDirectory) {
            for (let file of currentDirectory) {
                if (file.text === key) {
                    return file;
                }
            }

            return false;
        }

        function makeFolderPath(fullPath, folderName) {
            let newPath = '';

            for (let i = 0; i < fullPath.length; i++) {
                if (fullPath[i] === folderName) {
                    return newPath.concat(folderName);
                }

                newPath = newPath.concat(fullPath[i]);
            }

            return -1; //should be unreachable
        }
    }
}

module.exports = AWSModule;

//Manual XML request stuff I mistakenly wrote instead of using the S3 API
//Left here in case I need it -Zach
        /*let xmlRequest = new XMLHttpRequest();
        xmlRequest.onreadystatechange = () => {
            if (xmlRequest.readyState === 4 && xmlRequest.status === 200) {
                console.log('xmlRequest', xmlRequest, 'type of response', xmlRequest.response.length);
    
                if(typeof(xmlRequest.response) === 'string') {
                    let buffer = new ArrayBuffer(xmlRequest.responseText.length);
                    let bufferView = new Uint8Array(buffer);
                    for (let i = 0; i < xmlRequest.response.length; i++) {
                        bufferView[i] = xmlRequest.response.charCodeAt(i);
                    }

                    let unzippedFile = wsutil.unzipFile(bufferView);
                    console.log('bufferView', bufferView, 'buffer', buffer, 'unzipped file', unzippedFile);

                    let parsedImage = new bisweb_image();
                    parsedImage.initialize();
                    parsedImage.parseNII(bufferView);
                    console.log('parsedImage', parsedImage);
                }
            }
        };

        xmlRequest.open('GET', `http://${AWSParameters.BucketName}.s3.amazonaws.com/${name}`, true);
        xmlRequest.setRequestHeader('Content-Type', 'application/json');
        xmlRequest.setRequestHeader('response-content-type', 'application/octet-stream');
        xmlRequest.send(null);
        */
