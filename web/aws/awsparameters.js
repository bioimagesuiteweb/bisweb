'use strict';

// https://git.yale.edu/pages/zls5/webapp/

let IdentityPoolId = 'us-east-1:13a0bffd-384b-43d8-83c3-050815009aa6';
let BucketName = 'bisweb-test';
let RegionName = 'us-east-1'; //N. Virginia
let AccountId = '687575629668'; //My (Zach's) Amazon AWS account


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

//console.log('redirect sign in', awsparams.RedirectUriSignIn);

module.exports = {
    'authParams' : awsparams,
    'IdentityPoolId' : IdentityPoolId,
    'RegionName' : RegionName,
    'BucketName' : BucketName,
    'AccountId' : AccountId
};
