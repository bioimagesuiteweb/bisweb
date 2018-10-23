'use strict';

const localforage = require('localforage');

// https://git.yale.edu/pages/zls5/webapp/
let IdentityPoolId;
let BucketName;
let ClientId = '5edh465pitl9rb04qbi37csv8e';
let UserPoolId = 'us-east-1_BAOsizFzq';
let AppWebDomain = 'bisweb-test.auth.us-east-1.amazoncognito.com';
let RegionName = 'us-east-1'; //N. Virginia
//let AccountId = '687575629668'; //My (Zach's) Amazon AWS account

let cachedAWSBuckets = localforage.createInstance({
    'name' : 'bis_webfileutil',
    'storeName' : 'AWSBuckets'
});

cachedAWSBuckets.getItem('currentAWS', (err, value) => {
    if (err) { console.log('An error occured while fetching from the AWS bucket', err); return; }
    try {
        let parsedItem = JSON.parse(value);
        //        console.log('parsed item', parsedItem);
        if (parsedItem) {
            IdentityPoolId = parsedItem.identityPoolId;
            BucketName = parsedItem.bucketName;
        }
    } catch(e) {
        //console.log('No current AWS found, requesting one once user attempts to connect.');
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
    'TokenScopesArray': ['email', 'openid'],
    'RedirectUriSignIn': apath+'biswebaws.html',
    'RedirectUriSignOut': apath+'biswebaws.html',
    'IdentityProvider': 'COGNITO'
};


let updateBucketInfo = (newBucketInfo) => {
    BucketName = newBucketInfo.bucketName;
    IdentityPoolId = newBucketInfo.identityPoolId;
    UserPoolId = newBucketInfo.userPoolId;
    ClientId = newBucketInfo.appClientId;
    AppWebDomain = newBucketInfo.appWebDomain;
};

let getClientId = () => {
    return ClientId;
};

let getAppWebDomain = () => {
    return AppWebDomain;
};

let getUserPoolId = () => {
    return UserPoolId;
};

let getIdentityPoolId = () => {
    return IdentityPoolId;
};

let getBucketName = () => {
    return BucketName;
};

let getCurrentCognitoParams = () => {
    let currentParams = awsparams;
    currentParams.ClientId = ClientId;
    currentParams.UserPoolId = UserPoolId;
    currentParams.AppWebDomain = AppWebDomain;

    return currentParams;
};


module.exports = {
    'authParams' : awsparams,
    'RegionName' : RegionName,
    'BucketName' : getBucketName,
    'IdentityPoolId' : getIdentityPoolId,
    'ClientId' : getClientId,
    'AppWebDomain' : getAppWebDomain,
    'UserPoolId' : getUserPoolId,
    'updateBucketInfo' : updateBucketInfo,
    'getCurrentCognitoParams' : getCurrentCognitoParams
    //'AccountId' : AccountId,
};
