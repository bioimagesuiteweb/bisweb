'use strict';

const localforage = require('localforage');
let cachedAWSBuckets = localforage.createInstance({
    'name' : 'bis_webfileutil',
    'storeName' : 'AWSBuckets'
});

// https://git.yale.edu/pages/zls5/webapp/
let IdentityPoolID;
let BucketName;
let RegionName = 'us-east-1'; //N. Virginia
let AccountId = '687575629668'; //My (Zach's) Amazon AWS account

cachedAWSBuckets.getItem('currentAWS', (err, value) => {
    if (err) { console.log('An error occured while fetching from the AWS bucket', err); return; }
    try {
        let parsedItem = JSON.parse(value);
        console.log('parsed item', parsedItem);
        IdentityPoolID = parsedItem.identityPoolID;
        BucketName = parsedItem.bucketName;
    } catch(e) {
        console.log('an error occured while parsing the aws bucket item', e);
    }
});

let apath="http://localhost:8080/build/web/";

if (typeof window.BIS ==='undefined') {
    let scope=window.document.URL.split("?")[0];
    scope=scope.split("#")[0];
    apath=scope;
    scope=scope.split("/").pop();
    let index=scope.indexOf(".html");
    scope=scope.substr(0,index);
    apath=apath.substr(0,apath.length-scope.length-5);
}


let awsparams = {
    'ClientId': '5edh465pitl9rb04qbi37csv8e',
    'AppWebDomain': 'bisweb-test.auth.us-east-1.amazoncognito.com',
    'TokenScopesArray': ['email', 'openid'],
    'RedirectUriSignIn': apath+'biswebaws.html',
    'RedirectUriSignOut': apath+'biswebaws.html',
    'IdentityProvider': 'COGNITO',
    'UserPoolId': 'us-east-1_BAOsizFzq'
};


let updateBucketInfo = (bucketName, identityPoolId) => {
    BucketName = bucketName;
    IdentityPoolID = identityPoolId;
};

let getIdentityPoolID = () => {
    return IdentityPoolID;
};

let getBucketName = () => {
    return BucketName;
};

console.log('redirect sign in', awsparams.RedirectUriSignIn);

module.exports = {
    'authParams' : awsparams,
    'RegionName' : RegionName,
    'AccountId' : AccountId,
    'BucketName' : getBucketName,
    'IdentityPoolId' : getIdentityPoolID,
    'updateBucketInfo' : updateBucketInfo
};
