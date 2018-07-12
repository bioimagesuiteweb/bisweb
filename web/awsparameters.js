'use strict';

let awsparams = {
    'ClientId': '5edh465pitl9rb04qbi37csv8e',
    'AppWebDomain': 'bisweb-test.auth.us-east-1.amazoncognito.com',
    'TokenScopesArray': ['email', 'openid'],
    'RedirectUriSignIn': 'http://localhost:8080/web/biswebaws.html',
    'RedirectUriSignOut': 'http://localhost:8080/web/biswebaws.html',
    'IdentityProvider': 'COGNITO',
    'UserPoolId': 'us-east-1_BAOsizFzq'
};

let IdentityPoolId = 'us-east-1:13a0bffd-384b-43d8-83c3-050815009aa6';
let BucketName = 'bisweb-test';
let RegionName = 'us-east-1'; //N. Virginia
let AccountId = '687575629668'; //My (Zach's) Amazon AWS account

module.exports = {
    'authParams' : awsparams,
    'IdentityPoolId' : IdentityPoolId,
    'RegionName' : RegionName,
    'BucketName' : BucketName,
    'AccountId' : AccountId
};