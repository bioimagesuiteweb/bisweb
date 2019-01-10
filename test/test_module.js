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
/*global describe, it, before */
"use strict";

require('../config/bisweb_pathconfig.js');
const program=require('commander');
const assert = require("assert"),
      colors=require('colors/safe'),
      bisnodecmd = require("bis_commandlineutils"),
      genericio=require('bis_genericio'),
      path = require('path'),
      fs = require('fs');
const modules = require('moduleindex.js');

const githuburl='https://bioimagesuiteweb.github.io/test/module_tests.json'

// ---------------------------------------------------------------------------------
const help = function() {
    console.log('\nThis program runs the bisweb module tests');
};

program.version('1.0.0')
    .option('--input <s>','filename of the tests to run')
    .option('--first <n>','first test to run. If negative count from the end.',parseInt)
    .option('--last <n>','last test to run. If negative count from the end.',parseInt)
    .option('--testname <items>','comma separated list of names of tests to run. If not specified all are run (subject to first:last)')
    .option('-f , --findmodules <n>','if 1 then print list of all modules and their tests',parseInt)
    .option('--tpath <s>','path to bisweb-test.js')
    .option('--local','use local data')
    .on('--help',function() {
        help();
    })
    .parse(process.argv);


// Global Variables
// ---------------------
let begin_test=0,end_test=0,testnamelist,testlist,testscript='';

let load_module=function(testfilename) {

    return new Promise( (resolve,reject) => {

        console.log("Reading",testfilename);
        
        if (testfilename.indexOf('http')!==0) {
            let testfile= fs.readFileSync(testlistfilename, 'utf-8');
            try {
                let obj = JSON.parse(testfile);
                resolve(obj);
            } catch (e) {
                console.log('Failed to parse testfile from',testlistfilename,e);
                reject('Failed to parse from '+testfilename);
            }
        } else {
            genericio.read(testfilename,false).then( (out) => {
                try {
                    let obj = JSON.parse(out.data);
                    resolve(obj);
                } catch (e) {
                    console.log('Failed to parse testfile from',testlistfilename,e);
                    reject('Failed to parse from '+testfilename);
                }
            }).catch( (e) => {
                console.log('Failed to load ',testlistfilename);
                reject('Failed to load from '+testfilename);
            });
        }
    });
};

let get_testfilename=function(inp) {

    let testlistfilename=inp || null;
    
    if (testlistfilename===null) {
        if (program.local) 
                testlistfilename=path.join(__dirname,'module_tests.json');
            else
                testlistfilename=githuburl;
    }
    return testlistfilename;
};


let get_testlist=function(fname)  {
    
    return new Promise( (resolve,reject) => {

        console.log('testlistfilename=',fname);
        
        load_module(fname).then( (obj) => {
            resolve(obj['testlist']);
        }).catch( (e) => { reject(e); });
    });
}

let getTestScript=function() { 

    let tpath=program.tpath || path.join(__dirname,path.join("..", path.join("js","bin")));
    let testscript=path.resolve(path.join(tpath,'bisweb-test.js'));
    
    
    if (!fs.existsSync(testscript)) {
        tpath=program.tpath || path.join(__dirname,path.join("..", "lib"));
        testscript=path.resolve(path.join(tpath,'bisweb-test.js'));
    }

    if (!fs.existsSync(testscript)) {
        console.log(`---- bisweb-test.js can not be found`);
        process.exit(1);
    }
    
    testscript='node '+testscript;
    return testscript;
};

let fixBounds=function(testlist) {


    let first_test = program.first || 0;
    let last_test  = program.last;
    
    if (last_test === undefined)
        last_test=-1;
    
    begin_test=0;
    if (first_test<0)
        begin_test=testlist.length+first_test;
    else if (first_test>0)
        begin_test=first_test;
    
    end_test=testlist.length-1;
    if (last_test>=0)
        end_test=last_test;
    else if (last_test<0)
        end_test=testlist.length+last_test;
    
    let testname = program.testname || null;
    testnamelist = null;
    if (testname) {
        testnamelist= testname.split(",");
        for (let i=0;i<testnamelist.length;i++) {
            testnamelist[i]=testnamelist[i].toLowerCase();
        }
    }


    if (program.findmodules) {
        let foundmodule = {};
        let modulelist = Object.keys(modules.moduleNamesArray);
        for (let i=0;i<modulelist.length;i++)  {
            foundmodule[modulelist[i]]=[];
        }
        
        for (let i=0;i<testlist.length;i++) {
            let tname=testlist[i].command.split(" ")[0].toLowerCase();
            foundmodule[tname].push(i);
        }
        
        for (let i=0;i<modulelist.length;i++)  {
            let lst=foundmodule[modulelist[i]];
            if (lst.length>0) {
                console.log('module='+modulelist[i]+' numtests='+lst.length+' ('+lst.join(',')+')');
            } else {
                console.log('module='+modulelist[i]+' H A S  N O  T E S T S.');
            }
        }
        process.exit(0);
    }
}


let run_test=function(i,done) {

    let tname=testlist[i].command.split(" ")[0].toLowerCase();
    let command=testlist[i].command+" "+testlist[i].test;
    
    let expected_result=testlist[i].result;
    
    let proceed= (testnamelist ===null);
    if (proceed===false) {
        proceed= (testnamelist.indexOf(tname)>=0);
    }
    
    if (proceed) {

        console.log(colors.green('\n-------------------- test',i,'----------------------------------------------\n'));
        bisnodecmd.executeCommand(testscript+' '+command,__dirname, ((completed,exitcode) => {
            let success= (parseInt(exitcode) ===0);
            console.log(bisnodecmd.getTime(), 'Returning, completed =',completed, 'exitcode=',exitcode,'success=', success, ' expected=', expected_result);
            if (completed===false)
                success=false;
            
            assert.equal(success,expected_result);
            console.log(colors.blue('\n------------------------------------------------------------------\n'));
            done();
        }));
    } else {
        done();
    }
}

describe(`Invoking command line tests `,function() {

    before(function(done) {

        testscript=getTestScript();
        console.log('Testscript=',testscript);
        let testfilename=get_testfilename(program.input);
        get_testlist(testfilename).catch( (e) => {
            console.log('Error=',e);
            proecess.exit(1);
        }).then( (obj) => {
            testlist=obj;
            console.log(obj[0]);
            fixBounds(testlist);
            console.log('Running tests:',begin_test,':',end_test,' out a total of=',testlist.length,'tests. Filter name='+(testnamelist || ['all']).join(" "));
            done();
        });
    });

    /*    it ('test ',function(done) {
        this.timeout(500000);
        let i=begin_test-1;
        let fn=() => {
            i=i+1;
            if (i<end_test) {
                run_test(i,fn);
            } else {
                done();
            }
        };
        fn();
        });*/
    for (let i=begin_test;i<=end_test;i++) {
        it('Test '+i,function(done) {
            run_test(i,done);
        });
    }
});
