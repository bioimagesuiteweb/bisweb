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

        window.addEventListener('message', (data) => {
            console.log('got a message', data); 
        });

        //file display modal gets deleted if you try to load it too soon
        //not completely sure why -Zach
        bis_webutil.runAfterAllLoaded( () => {   
            this.fileDisplayModal = new bisweb_filedialog('Bucket Contents', { 'makeFavoriteButton' : false });
            //fileListFn won't get called from wihin filedialog because the bucket is a flat storage structure
            this.fileDisplayModal.fileRequestFn = this.makeRequest.bind(this);
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
    makeRequest(params, cb = null, eb = null) {
        let command = params.command;
        let files = params.files || params.file;
        let viewer = params.viewer;
        console.log('this', this);
        switch (params.command) {
            case 'getfile' : 
            case 'getfiles' : this.requestFile(params.name, viewer, cb, eb); break;
            case 'uploadfile' : 
            case 'uploadfiles' : this.uploadFile(params.name, files, cb, eb); break;
            default : console.log('Cannot execute unknown command', command);
        }
    }

    /**
     * Makes a RESTful request for a file from the S3 bucket referenced by the current instance of this.S3 and attempts to put it on the default viewer (this.defaultViewer.
     * Generally called from bisweb_filedialog.
     *
     * @param {String} name - Name of the file to request from the S3 bucket. 
     */
    requestFile(name, viewer = this.defaultViewer, cb = () => {}, eb = () => {}) {

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
    uploadFile(name, body, cb = null, eb = null) {

        console.log('image', body);
        let rawData = body.serializeToNII();
        let zippedData = wsutil.zipFile(rawData);
        console.log('zipped data', zippedData);
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

    //TODO: Remove unnecessary function? 
    createUser(username, password, email, phoneNumber = null) {
        let dataEmail = {
            'Name' : 'email', 
            'Value' : email 
        };
        let dataPhoneNumber = { 
            'Name' : 'phone_number', 
            'Value' : phoneNumber 
        };

        let attributeEmail = new AWSCognitoIdentity.CognitoUserAttribute(dataEmail);
        let attributeList = [attributeEmail];

        if (phoneNumber) {
            let attributePhoneNumber = new AWSCognitoIdentity.CognitoUserAttribute(dataPhoneNumber);
            attributeList.push(attributePhoneNumber);
        }

        this.userPool.signUp(username, password, attributeList, null, (err, result) => {
            if (err) {
                console.log('Error in user pool signup', err);
                return;
            }
            this.cognitoUser = result.user;
            console.log('user returned by cognito', this.cognitoUser);
        });
    }

    //TODO: Remove unnecessary function? 
    confirmRegistration(code) {
        if (!this.cognitoUser) {
            console.log('No user, cannot confirm');
            return;
        }

        this.cognitoUser.confirmRegistration(code, true, (err) => {
            if (err) {
                console.log('Error confirming user registration', err);
                return;
            }

            console.log('Registration confirmed!');
        });
    }

    //TODO: Remove unnecessary function? 
    displayCreateUserModal() {
        if (!this.createUserModal) {
            this.createUserModal = bis_webutil.createmodal('Enter User Details', 'modal-lg');
            this.createUserModal.dialog.find('.modal-footer').find('.btn').remove();

            let confirmButton = bis_webutil.createbutton({ 'name': 'Confirm', 'type': 'btn-success' });
            let cancelButton = bis_webutil.createbutton({ 'name': 'Cancel', 'type': 'btn-danger' });

            this.createUserModal.footer.append(confirmButton);
            this.createUserModal.footer.append(cancelButton);

            let userTextPrompt = $(`<p>Enter the details to associate to your Amazon AWS profile</p>`);
            let entryBoxes = $(`
                    <div class='form-group'>
                        <label for='username'>Username:</label>
                        <input type='text' class = 'name-field form-control'>
                        <label for='email'>Email:</label>
                        <input type='text' class = 'email-field form-control'>
                        <label for='password'>Password:</label>
                        <input type='password' class = 'password-field form-control'>
                    </div>
                `);

            $(confirmButton).on('click', () => {
                //let password = this.authenticateModal.body.find('.form-control')[0].value;

            });

            $(cancelButton).on('click', () => {
                this.authenticateModal.dialog.modal('hide');
            });

            //clear entry fields when modal is closed
            $(this.createUserModal.dialog).on('hidden.bs.modal', () => {
                this.authenticateModal.body.empty();
            });

            this.createUserModal.body.append(userTextPrompt);
            this.createUserModal.body.append(entryBoxes);
        }
    }

    /**
     * Creates a small modal dialog to allow the user to enter the name for a file they are attempting to save to the fileserver. 
     */
    createSaveImageDialog() {
        let saveDialog = $(`<p>Please enter a name for the current image on the viewer. Do not include a file extension.</p>`);
        let nameEntryBox = $(`
                <div class='form-group'>
                    <label for='filename'>Filename:</label>
                    <input type='text' class = 'form-control'>
                </div>
            `);

        if (!this.saveImageModal) {
            this.saveImageModal = bis_webutil.createmodal('Save Current Image?', 'modal-sm');
            this.saveImageModal.dialog.find('.modal-footer').find('.btn').remove();

            let confirmButton = bis_webutil.createbutton({ 'name': 'Confirm', 'type': 'btn-success' });
            let cancelButton = bis_webutil.createbutton({ 'name': 'Cancel', 'type': 'btn-danger' });

            this.saveImageModal.footer.append(confirmButton);
            this.saveImageModal.footer.append(cancelButton);

            $(confirmButton).on('click', () => {
                let image = this.algorithmController.getImage(this.defaultViewer, 'image');
                let name = this.saveImageModal.body.find('.form-control')[0].value;


                 //update the modal with a success message after successful transmission.
                 let cb = () => {
                     let transmissionCompleteMessage = $(`<p>Upload completed successfully.</p>`);

                     this.saveImageModal.body.empty();
                     this.saveImageModal.body.append(transmissionCompleteMessage);

                     setTimeout(() => { this.saveImageModal.dialog.modal('hide'); }, 1500);
                };

                //update modal with an error message if things went wrong
                let eb = () => {
                    let errorMessage = $(`<p>An error occured during transmission. File not uploaded.</p>`);

                    this.saveImageModal.body.empty();
                    this.saveImageModal.body.append(errorMessage);

                    setTimeout(() => { this.saveImageModal.dialog.modal('hide'); }, 1500);
                };

                this.makeRequest( { 'command' : 'uploadfile' , 'file' : image, 'name' : name }, cb, eb);

                let imageSavingDialog = $(`<p>Uploading image to Amazon S3...</p>`);
                this.saveImageModal.body.empty();
                this.saveImageModal.body.append(imageSavingDialog);
            });

            $(cancelButton).on('click', () => {
                this.saveImageModal.dialog.modal('hide');
            });

            //clear name entry input when modal is closed
            $(this.saveImageModal.dialog).on('hidden.bs.modal', () => {
                this.saveImageModal.body.empty();
            });
        }

        this.saveImageModal.body.append(saveDialog);
        this.saveImageModal.body.append(nameEntryBox);

        this.saveImageModal.dialog.modal('show');
    }


    /**
     * Attempts to authenticate the current user before executing a given S3 command (one of either 'showfiles' or 'uploadfiles' as of 7-23-18, which respectively call listObjectsInBucket and createImageSaveDialog).
     * If the user is not authenticated, a popup will appear that will prompt the user to enter their AWS credentials, or if the credentials are already cached, it will begin the authentication process.
     * If the user is authenticated, wrapInAuth will call the appropriate command. 
     * @param {String} command - A string indicating the command to execute. 
     * @param {Object} parameters - Object containing parameters to pass to the function that corresponds to command. Currently unused. 
     */
    wrapInAuth(command, parameters = null) {
        let expireTime = AWS.config.credentials.expireTime ? Date.parse(AWS.config.credentials.expireTime) : -1;
        console.log('expire time', expireTime);

        if (expireTime < Date.now()) {
            this.awsAuthUser();
            return;
        }

        switch(command) {
            case 'showfiles' : this.listObjectsInBucket(); break;
            case 'uploadfile' : this.createSaveImageDialog(); break;
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
        let paths = [], list = [];
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
            console.log('path', path);
            let currentLocation = formattedFiles;

            for (let folder of path) {
                console.log('current location', currentLocation);
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
        };
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