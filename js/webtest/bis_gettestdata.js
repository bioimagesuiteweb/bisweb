
const webutil=require('bis_webutil');
const scope=webutil.getScope();
const genericio = require('bis_genericio');

const environment=genericio.getenvironment();

module.exports={

    islocal : function() {

        if (environment==='electron') {
            return false;
        }
        
        if (scope.indexOf('localhost')>=0 || scope.indexOf('192.168')>=0) 
            return true;
        return false;
    },

    getbase: function(forcegithub=false,display=false) {
        
        
        let extra='/';
        if (display)
            extra='/webtestdata';


        if (forcegithub)
            return 'https://bioimagesuiteweb.github.io/test'+extra;
        
        let testDataRootDirectory='';
        
        // Development mode hacks
        if (this.islocal()) {
            let l=scope.length;
            let ind=scope.lastIndexOf('/build/web');
            let ind2=scope.lastIndexOf('/web');
            if (ind===(l-11)) {
                testDataRootDirectory=scope.substr(0,l-11)+"/test"+extra;
            } else if (ind2===(l-5)) {
                testDataRootDirectory=scope.substr(0,l-5)+"/test"+extra;
            }
        }
        
        if (testDataRootDirectory.length<2) {
            // Not in development mode
            testDataRootDirectory='https://bioimagesuiteweb.github.io/test'+extra;
        }
        return testDataRootDirectory;
    }

};
