let AWS = require('aws-sdk');

class AWSModule {

    constructor() {

        this.bucketName = 'bisweb-test';
        this.regionName = 'us-east-1'; //N. Virginia
        const identityPool = 'us-east-1:13a0bffd-384b-43d8-83c3-050815009aa6'
        AWS.config.update({
            'region' : this.regionName,
            'credentials' : new AWS.CognitoIdentityCredentials({
                'IdentityPoolId' : identityPool
            })
        });

        this.s3 = this.createS3(this.bucketName);
        this.listObjectsInBucket();
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
            if (xmlRequest.readyState === 4) {
                console.log('xmlRequest', xmlRequest);
            }
        }
        xmlRequest.open('get', `http://${this.bucketName}.s3.amazonaws.com`, true);
        xmlRequest.send(null);
        
        
        /*let request = `
        ${parsedType} /${object} HTTP/1.1\n
        Host: ${this.bucketName}.s3.amazonaws.com\n
        Date: ${new Date()}
        `;
        
        console.log('request', request);
        */
    }
}

module.exports = AWSModule;