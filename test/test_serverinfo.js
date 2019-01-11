/*  LICENSE
    
    _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
    
    BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
    
    - you may not use this software except in compliance with the License.
    - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
    
    __Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.__
    
    ENDLICENSE */

/* jshint node:true */
/*global describe, it, after, before */
"use strict";

require('../config/bisweb_pathconfig.js');
require('bisweb_userpreferences.js').setImageOrientationOnLoad('None');


const assert = require("assert");
const bisserverutil=require('bis_fileservertestutils');
const colors=require('colors/safe');

let client=null;

describe('Testing Server run module\n', function() {
    
    this.timeout(50000);


    
    before(function(done) {
        
        bisserverutil.createTestingServer().then( (obj) => {
            client=obj.client;
            done();
        }).catch( ()=> {
            process.exit(1);
        });
    });
    
    it ('check info',function(done) {

        client.runModule('infomodule',
                         { 'detail' : 3 },
                        ).then( (m) => {
                            console.log('Pass =',m);
                            assert(true,true);
                            done();
                        }).catch( (e) => {
                            console.log('Faile =',e);
                            assert(true,false);
                            done();
                        });
    });
    
    
    after(function(done) {
        console.log(colors.cyan('------------------------------------------------------------------------'));
        bisserverutil.terminateTestingServer(client).then( ()=> {
            done();
        }).catch( (e) => {
            console.log('---- termination error',e,e.stack);
            done();
        });
    });

});
