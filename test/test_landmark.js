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
/*global describe, it */
"use strict";

require('../config/bisweb_pathconfig.js');
const assert = require("assert");
const landmarkset=require('bis_landmarks');

let land = new landmarkset(5);
let str = "";

console.log(' ------- starting -------------');

describe('Testing the Landmarks class (from bis_landmark.js) \n', function() {

    this.timeout(50000);
    
    it('numpoints == 10 correct ',function() {
        for (let i=0;i<10;i++) {
            land.addpoint([i,i*10,i+4 ]);
            land.names[i]='Point '+i;
        }
        land.resetundo();
        let n=land.getnumpoints();
        console.log('+++ num[ = ' ,n,' ==  ',10);
        assert.equal(n,10);
    });

    

    it ('move point 5,delete 8 and rename 4',function() {

        str=land.serialize();

        let x = [ 1,2,3];
        land.movepoint(5,x);
        land.deletepoint(8);
        land.renamepoint(4,'Special');

        x=null;
        let y=land.points[5];
        let sum=Math.abs(y[0]-1)+Math.abs(y[1]-2)+Math.abs(y[2]-3);
        console.log('+++ y should be [1,2,3]',y);
        assert.equal(sum,0);
    });

    it ('test undo', function() {
        console.log('----------- Current State -------\n');
        let str2=land.serialize();
        console.log('----------- undos -------\n');
        land.undo(true);
        land.undo(true);  
        land.undo(true);  
        let str3=land.serialize();
        console.log('----------- redos -------\n');
        land.redo(true);  
        land.redo(true);  
        land.redo(true);  
        
        let str4=land.serialize();
        console.log('\n+++ At states 0 and 2\n\t',str,'\n\t',str3);
        assert.equal(str,str3);
        console.log('\n+++ At states 1 and 3\n\t',str2,'\n\t',str4);
        assert.equal(str2,str4);


    });

});
