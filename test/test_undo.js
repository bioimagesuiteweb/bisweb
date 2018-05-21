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
require('bisweb_userpreferences.js').setImageOrientationOnLoad('None');
const assert = require("assert");
const UndoStack=require('bis_undostack');

let un=new UndoStack(10,2),i;
let ops = [ 'Operation 1','Operation 2','Operation 3','Operation 4','Operation 5'];
for (i=0;i<ops.length;i++)
    un.addOperation([ops[i]]);

//console.log=function(a) { };

describe('Testing Undo (from bisundo.js) \n', function() {

    this.timeout(50000);
    
    it('undoing 1 is correct ',function() {
        let a1=un.getUndo()[0];
        console.log('+++ undo = ' ,a1,' ==  ',ops[4]);
        assert.equal(a1,ops[4]);
    });

    it('undoing 2 is correct ',function() {
        let a2=un.getUndo()[0];
        console.log('+++ undo ', a2,' ==  ',ops[3]);
        assert.equal(a2,ops[3]);
    });


    it('redoing 1 is correct ',function() {
        let a3=un.getRedo()[0];
        console.log('+++ redo ',a3,' ==  ',ops[3]);
        assert.equal(a3,ops[3]);
    });
    
    it ('check shuffle by adding 8 new items',function() {
        for (i=0;i<8;i++)  {
            let s='New '+(i+1);
            un.addOperation([s]);
        }
        console.log('+++ top of stack=',un.getCopyOfElement(0),'==',ops[2]);
        assert.equal(un.getCopyOfElement(0),ops[2]);
    });


    it ('redo should be null post 6 undos and new add', function() { 
        for (i=0;i<6;i++) {
            un.getUndo();
        }
        un.addOperation(['Starting again']);
        console.log(un.getElementsAsString());
        let d=un.getRedo();
        console.log('+++ post add redo is null ===',d);
        assert.equal(d,null);
    });
    
    it ('back to 3 undos',function() {
        un.getUndo();
        un.getUndo();
        let a=  un.getUndo();
        console.log('+++',a,' ===','New 2');
        assert.equal(a,'New 2');
    });

    it ('back to 2 redos',function() {
        un.getRedo();
        un.getRedo();
        let a=un.getRedo();
        console.log('+++',a,'===','Starting again');
        assert.equal(a,'Starting again');
    });

    it ('one more redo',function() {
        let a=un.getRedo();
        console.log('+++',a,'===','null');
        assert.equal(a,null);
    });

    it ('test shuffle',function() {

        let v;
        let newout=[];
        for (let i=0;i<=12;i++) {
            v=i*10;
            un.addOperation([ v]);
            if (i>3)
                newout.push(v);
        }
        newout.push(null);
        
        console.log('+++ added 9 new \t:',un.getElementsAsString(),' newout=',newout.join());
        assert.equal(newout.join(),un.getElementsAsString());
        
        
        un.getUndo();un.getUndo();un.getUndo();
        v=un.getUndo();
        console.log('+++ three undos \t:',un.getElementsAsString(),'last=',v);
        assert.equal(v,'90');
        un.shift=3;
        newout.shift(); newout.shift();  newout.push(null);newout.push(null);
        un.shuffle();
        
        console.log('+++ shuffle 3\t\t:',un.getElementsAsString(),'vs', newout.join());
        assert.equal(un.getElementsAsString(),newout.join());

    });

    it ('test adding different things ',function() {
        
        let flags=[ false,false,false,false];

        try {
            un.addOperation({ 'name':'apoel'});
        } catch (e) {
            console.log('+++ correctly caught\t',e);
            flags[0]=true;
        }

        try {
            un.addOperation(null);
        } catch(e) {
            flags[1]=true;
            console.log('+++ correctly caught\t',e);
        }

        try {
            un.addOperation('apoel');
            flags[2]=true;
        } catch (e) {
            console.log('--- badly caught, string should pass ',e);
        }

        try {
            un.addOperation(false);
        } catch (e) {
            console.log('+++ correctly caught\t',e);
            flags[3]=true;
            
        }

        console.log('+++ new add  \t:',un.getElementsAsString());
        assert.equal(( flags[0] && flags[1] && flags[2] && flags[3]),true);
    });
});
