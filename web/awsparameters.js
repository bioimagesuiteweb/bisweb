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

module.exports = awsparams;