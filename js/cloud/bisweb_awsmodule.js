'use strict';

const AWS = require('aws-sdk');
const AWSCognitoIdentity = require('amazon-cognito-identity-js');
const AWSCognitoAuth = require('amazon-cognito-auth-js');
const bis_genericio = require('bis_genericio.js');
const bisweb_image = require('bisweb_image.js');
const bis_webutil = require('bis_webutil.js');
const wsutil = require('../../fileserver/wsutil.js');


class AWSModule {

    constructor() {

        //data related to Amazon AWS services
        this.bucketName = 'bisweb-test';
        this.regionName = 'us-east-1'; //N. Virginia

        const userPool = 'us-east-1_BAOsizFzq';
        const identityPool = 'us-east-1:13a0bffd-384b-43d8-83c3-050815009aa6';
        const clientId = '5edh465pitl9rb04qbi37csv8e';
        const redirectURI = 'http://localhost:8080/web/biswebaws.html';

        AWS.config.update({
            'region' : this.regionName,
            'credentials' : new AWS.CognitoIdentityCredentials({
                'IdentityPoolId' : identityPool
            })
        });

        //AWSCognitoIdentity.config.region = this.regionName;

        const userPoolData = {
            'UserPoolId' : userPool,
            'ClientId' : clientId
        };

        this.userPool = new AWSCognitoIdentity.CognitoUserPool(userPoolData);
        this.userData = {
            'username' : null,
            'pool' : null
        };

        this.authData = {
            'ClientId' : clientId,
            'AppWebDomain' : 'bisweb-test.auth.us-east-1.amazoncognito.com',
            'TokenScopesArray' : [ 'email', 'openid' ],
            'RedirectUriSignIn' : redirectURI,
            'RedirectUriSignOut' : redirectURI,
            'IdentityProvider' : 'COGNITO', 
            'UserPoolId' : userPool
        };

        this.awsAuth = null
        this.s3 = this.createS3(this.bucketName);
        this.listObjectsInBucket();

        //set to the values provided by Cognito when the user signs in
        this.cognitoUser = null;

        //UI features
        this.createUserModal = null;
        this.authUserModal = null;
    }

    createS3(bucketName) {
        let s3 = new AWS.S3({
            'apiVersion' : '2006-03-01',
            'params' : { Bucket : bucketName}
        });

        return s3;
    }

    listObjectsInBucket() {
        this.s3.listObjects({ 'Delimiter' : '/'}, (err, data) => {
            if (err) { console.log('an error occured', err); return; }
            console.log('got objects', data);
        });
    }

    makeRequest(type, object = null) {
        type = type.toLowerCase();
        let parsedType;
        switch (type) {
            case 'get' :  parsedType = 'GET'; break;
            case 'put' :  parsedType = 'PUT'; break;
            case 'select' : parsedType = 'SELECT'; break;
            case 'delete' : parsedType = 'DELETE'; break;
            default : console.log('trying to make request for unknown type', type, 'aborting request'); return;
        }

        let xmlRequest = new XMLHttpRequest();
        xmlRequest.onreadystatechange = () => {
            if (xmlRequest.readyState === 4 && xmlRequest.status === 200) {
                console.log('xmlRequest', xmlRequest, 'type of response', xmlRequest.responseText.length);
    
                if(typeof(xmlRequest.response) === 'string') {
                    let buffer = new ArrayBuffer(xmlRequest.responseText.length);
                    let bufferView = new Uint8Array(buffer);
                    for (let i = 0; i < xmlRequest.response.length; i++) {
                        bufferView[i] = xmlRequest.response.charCodeAt(i);
                    }
                    
                    let unzippedFile = wsutil.unzipFile(bufferView);awsAuth
                    console.log('bufferView', bufferView, 'buffer', buffer, 'unzipped file', unawsAuthzippedFile);

                    let parsedImage = new bisweb_image();
                    parsedImage.parseNII(unzippedFile);
                    console.log('parsedImage', parsedImage);
                }
            }
        };

        xmlRequest.open(parsedType, `http://${this.bucketName}.s3.amazonaws.com/${object}`, true);
        //xmlRequest.setRequestHeader('Content-Type', 'application/json');
        xmlRequest.setRequestHeader('response-content-type', 'application/octet-stream');
        xmlRequest.send(null);
        
        
        /*let request = `
        ${parsedType} /${object} HTTP/1.1\n
        Host: ${this.bucketName}.s3.amazonaws.com\n
        Date: ${new Date()}
        `;
        
        console.log('request', request);
        */
    }

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

    confirmRegistration(code) {
        if (!this.cognitoUser) {
            console.log('No user, cannot confirm');
            return;
        }

        this.cognitoUser.confirmRegistration(code, true, (err, result) => {
            if (err) {
                console.log('Error confirming user registration', err);
                return;
            }

            console.log('Registration confirmed!');
        });
    }

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
                let password = this.authenticateModal.body.find('.form-control')[0].value;

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

    wrapInAuth(command, parameters = null) {

        if (!this.cognitoUser) {
            this.awsAuthUser();
            return;
        }

        switch(command) {
            case 'showfiles' : this.listFilesInBucket(); break;
            case 'uploadfile' : this.uploadFileToBucket(parameters); break;
            default : console.log('Unrecognized aws command', command, 'cannot complete request.');
        }
        console.log('called command', command, 'with parameters', parameters);
    }

    awsAuthUser() {
        let authPage = window.open('../web/biswebaws.html', '_blank', 'width=400, height=400');
        let authData = this.authData;
        /*$(authPage).ready( function() {
            let auth = new AWSCognitoAuth.CognitoAuth(authData);
            auth.userhandler = {
                onSuccess: () => { console.log('logged in successfully!') },
                onFailure: () => { console.log('failed to login'); }
            }
            console.log('window', window);
            console.log('auth', auth);
            //auth.getSession();
        });*/
    }
}

module.exports = AWSModule;