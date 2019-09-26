
const webutil=require('bis_webutil');
const scope=webutil.getScope();
const genericio = require('bis_genericio');
const environment=genericio.getenvironment();

module.exports={


    getelectronpath : function() {
        const path=genericio.getpathmodule();
        const os=genericio.getosmodule();
        console.log('++++ Electron\n\tscope=',scope,'\n\t',os.platform());
        let index=8;
        if (os.platform()==='darwin' || os.platform()==='linux')
            index=7;
        return path.dirname(scope.substr(index,scope.length))+'/test';
    },
    
    islocal : function() {

        if (environment==='electron') {

            let p=this.getelectronpath();
            const fs=genericio.getfsmodule();
            if (fs.existsSync(p)){
                return true;
            }
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
            return 'https://bioimagesuiteweb.github.io/test/1.1'+extra;

        if (environment==='electron') {
            if (this.islocal())
                return this.getelectronpath()+extra;
            return 'https://bioimagesuiteweb.github.io/test/1.1'+extra;
        }
        
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
            testDataRootDirectory='https://bioimagesuiteweb.github.io/test/1.1'+extra;
        }
        return testDataRootDirectory;
    }

};
