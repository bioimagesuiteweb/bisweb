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

/* global  HTMLElement, window,document */

"use strict";

const $=require('jquery');
const moduleindex=require('moduleindex');
const biswrap = require('libbiswasm_wrapper');
const BisWebDataObjectCollection = require('bisweb_dataobjectcollection.js');
const webcss=require('bisweb_css');
const webutil=require('bis_webutil');
const systemprint=console.log;
const bis_genericio=require('bis_genericio');
const userPreferences = require('bisweb_userpreferences.js');
const bisdate=require('bisdate.js').date;
const wrapperutil=require('bis_wrapperutils');
const BisWebImage=require('bisweb_image');
const bis_webfileutil=require('bis_webfileutil');
const gettestdata=require('./bis_gettestdata');


import module_testlist from '../../test/module_tests.json';
let replacing=false;
let logtext="";
let testDataRootDirectory="";
let testDataModelDirectory="";
let threadController=null;
let oldTestDataRootDirectory='';
let serverDirectory=null;

let disableServer=function() {
    bis_webfileutil.setMode('local',false);
    testDataRootDirectory=oldTestDataRootDirectory;
};

let enableServer=async function() {
    bis_webfileutil.setMode('server',false);

    let serverClient=bis_genericio.getFileServerObject();
    if (serverClient===null)
        return false;

    let name=serverClient.getServerType();
    
    if (name==='bisfileserver') {
        try {
            await serverClient.authenticate();
        } catch(e) {
            disableServer();
            return Promise.reject(e);
        }
    }

    if (serverDirectory===null) {
        
        return new Promise( (resolve,reject) => {
            
            let clb=function(f) {
                
                if (f.length>0) {
                    serverDirectory=f;
                    testDataRootDirectory=serverDirectory+'/';
                    webutil.createAlert('Connected to '+serverClient.getServerInfo()+'. Using '+testDataRootDirectory+' as data directory on server');
                    resolve();
                } else {
                    reject();
                }
            };
            
            bis_webfileutil.genericFileCallback({
                filters : "DIRECTORY",
                suffix : "DIRECTORY",
                title : "Select Testdata directory",
                save : false,
            },clb);
        });
    }

    return true;


    
};

var replacesystemprint=function(doreplace=true) {
    if (doreplace===true && replacing===false) {
        const oldLog = console.log;
        replacing=true;
        logtext="";
        console.log = function () {
            // DO MESSAGE HERE.
            let keys=Object.keys(arguments);
            let s='';
            for(let i=0;i<keys.length;i++) {
                let v=arguments[keys[i]];
                if (typeof(v) === "object") {
                    let l=v.length || null;
                    if (l!==null) {
                        s+=' [' + v.join(' ')+' ] ';
                    } else  {
                        let d=Object.keys(v);
                        s+=' { ';
                        for (let i=0;i<d.length;i++) {
                            s+=`${d}: ${v[d]} `;
                        }
                        s+=' } ';
                    }
                } else {
                    s+=v+' ';
                }
            }
            logtext=logtext+s+'<BR>';
            oldLog.apply(console, arguments);
        };
    }

    if (doreplace===false && replacing===true) {
        console.log=systemprint;
        replacing=false;
    }
};

var loadparamfile=function(paramfile,modulename,params) {

    if (paramfile.length<2)
        return Promise.resolve();

    return new Promise( (resolve,reject) => {

        bis_genericio.read(testDataRootDirectory+paramfile).then( (res) => {
            
            try {
                let obj=JSON.parse(res.data);
                obj=obj.params;
                let keys=Object.keys(obj);
                for (let i=0;i<keys.length;i++) {
                    if (keys[i]!=='module') {
                        if (params[keys[i]]=== undefined)
                            params[keys[i]]=obj[keys[i]];
                    }
                }
                resolve('');
            } catch(e) {
                reject('Network response was not ok.');
            }
        }).catch( (e) => {
            reject(e);
        });
    });
};

var execute_test=function(test,usethread=false) {

    return new Promise( (resolve,reject) => {

        let cmd=test.command.replace(/\t/g,' ').replace(/ +/g,' ');
        let command=cmd.split(' ');
        let modulename=command[0];
        let module=moduleindex.getModule(modulename);

        let params={};
        let inputs={};
        let paramfile='';
        let des=module.getDescription();
        
        let tobj=get_test_object(test);
        let test_type = tobj['test_type'] || 'image';

        
        for (let i=1;i<command.length;i=i+2) {
            let flag=command[i];
            if (flag.length>0) {
                let pname=flag.replace(/--/g,'').replace(/-/g,'');
                let value=command[i+1];
                let j=0,found=false;
                while (j<des.inputs.length && found===false) {
                    
                    let inp=des.inputs[j];
                    if (inp.shortname===pname || inp.varname===pname) {
                        inputs[inp.varname]=testDataRootDirectory+value;
                        found=true;
                    }
                    j=j+1;
                }
                
                if (found===false) {
                    j=0;
                    while (j<des.params.length && found===false) {
                        
                        let p=des.params[j];
                        let s=p.shortname || '';
                        if (pname===s || pname===p.varname) {
                            params[p.varname]=value;
                            found=true;

                            if (p.varname === "modelname" && test_type === "tfjs") {
                                params[p.varname]=testDataModelDirectory+value;
                                console.log('Setting ',p.varname,'to ',params[p.varname]);
                            }
                        }
                        j=j+1;
                    }
                }
                
                if (found===false) {
                    if (pname==='paramfile') {
                        paramfile=value;
                    } else {
                        reject(`parameter ${flag} not found`);
                    }
                }
            }
        }

        if (test_type==="tfjs")
            test_type="image";
        
        let doworker = test.webworker;
        if (doworker!==false)
            doworker=true;

        if (test_type==='registration')
            params['doreslice']=true;

        loadparamfile(paramfile,module.name,params).then( () => {

            console.log('oooo usethread=',usethread);
            console.log('oooo Loading Inputs ',JSON.stringify(inputs));
            
            module.loadInputs(inputs).then( () => {
                console.log('oooo Loaded.');
                console.log('oooo Invoking Module with params=',JSON.stringify(params));
                let newParams = module.parseValuesAndAddDefaults(params);


                if (!usethread) {
                    replacesystemprint(false);
                    module.directInvokeAlgorithm(newParams).then(() => {
                        replacesystemprint(false);
                        console.log('oooo -------------------------------------------------------');
                        resolve( {
                            result : ' Test completed, now checking results.',
                            module : module,
                        });
                    }).catch((e) => {
                        replacesystemprint(false);
                        reject('---- Failed to invoke algorithm '+e);
                    });
                } else if (doworker) {
                    console.log('oooo ..........---Calling Web Worker ..............................-');
                    replacesystemprint(true);
                    threadController.executeModule(module.name, module.inputs,newParams).then((outputs) => {
                        replacesystemprint(false);
                        if (Object.keys(outputs).length<1)
                            reject('---- Failed to execute in thread manager ');

                        
                        module.outputs=outputs;
                        console.log('oooo ..........---Back from Web Worker ..............................-');
                        resolve( {
                            result : ' Test completed, now checking results.',
                            module : module,
                        });
                    }).catch((e) => {
                        replacesystemprint(false);
                        reject('---- Failed to invoke algorithm via thread manager '+e);
                    });
                } else {
                    replacesystemprint(false);
                    reject('---- Cannot invoke this test via thread manager '+JSON.stringify(test,null,2));
                }
            }).catch((e) => {
                reject('----- Bad input filenames in test '+e);
            });
        }).catch((e) => {
            reject('----- Bad param file '+e);
        });
    });
        
};

let get_test_object=function(test) {
    
    let t=test.test.replace(/\t/g,' ').replace(/ +/g,' ').replace(/-+/g,'').split(' ');
    let tobj={ };
    for (let i=0;i<t.length;i=i+2) {
        tobj[t[i]]=t[i+1];
    }
    return tobj;
};

const execute_compare=function(module,test) {

    return new Promise( (resolve,reject) => {

        //let testtrue=test.result;
        let tobj=get_test_object(test);
        
        let threshold = tobj['test_threshold'] || 0.01;
        let comparison = tobj['test_comparison'] || "maxabs";
        let test_type = tobj['test_type'] || 'image';
        let test_target = tobj['test_target'];
        if (test_type === 'image') {
            if (comparison !== "maxabs" && comparison!=="ssd") {
                comparison = "cc";
            }
        }

        if (test_type === 'matrix' || test_type === "matrixtransform" || test_type === "gridtransform") {
            if (comparison !== "maxabs") {
                comparison = "ssd";
            }
        }

        console.log('====\n============================================================\n');
        console.log(`==== C o m p a r i n g  ${test_type}  u s i n g  ${comparison} and  t h r e s h o l d=${threshold}.\n====`);
        let c=`<B>Comparing   ${test_type} using ${comparison} and threshold=${threshold}</B>`;

        const orig_test_type=test_type;
        
        if (test_type === "matrixtransform" || test_type==="gridtransform") {
            test_type="transform";
        }
        
        BisWebDataObjectCollection.loadObject(testDataRootDirectory+test_target,test_type).then( (obj) => {

            let resultObject=module.getOutputObject();
            if (test_type==='registration') {
                resultObject=module.getOutputObject('resliced');
                console.log('.... using resliced output for test');
            }
            if (orig_test_type==='gridtransform') {
                obj=obj.getGridTransformation(0);
                console.log('.... extracting grid transformation from loaded result for test');
            }

            
            let result=resultObject.compareWithOther(obj,comparison,threshold);
            let good="<";
            let bad=">";
            if (result.metric==="cc") {
                bad=good;
                good=">";
            }

            
            if (result.testresult) {
                console.log(`++++ Module ${module.name} test passed.\n++++  deviation (${result.metric}) from expected: ${result.value} ${good} ${threshold}`);
                resolve({ result : result.testresult,
                          text   : c+` Module ${module.name} test <span class="passed">passed</span>.<BR>  deviation (${result.metric}) from expected: ${result.value} ${good} ${threshold}`
                        });
            } else {
                console.log(`---- Module ${module.name} test failed.\n---- Module produced output significantly different from expected.\n----  deviation (${result.metric}) from expected: ${result.value} ${bad} ${threshold}`);
                resolve({
                    result : result.testresult,
                    text : c+` Module ${module.name} test <span class="failed">failed</span>. Module produced output significantly different from expected.<BR>  deviation (${result.metric}) from expected: ${result.value} ${bad} ${threshold}`
                });
            }
        }).catch((e) => {
            reject(e);
        });
    });
};

var run_memory_test=function() {

    disableServer();


    let images = [ new BisWebImage(),new BisWebImage() ];
    let imgnames = [ 'thr.nii.gz',
                     'thr_sm.nii.gz',
                   ];

    let forcegithub= $('#usegithub').is(":checked") || false;
    testDataRootDirectory=gettestdata.getbase(forcegithub,false);
    console.log('++++ Test Data Directory=',testDataRootDirectory);
    
    let fullnames = [ '','','','' ];
    for (let i=0;i<=1;i++)
        fullnames[i]=testDataRootDirectory+'testdata/'+imgnames[i];
    
    let p=[ biswrap.reinitialize() ];
    for (let i=0;i<images.length;i++) {
        p.push(images[i].load(fullnames[i]));
    }

    console.log(p);

    const main=$('#main');
    main.empty();
    main.append('<H3>Running WASM Memory Torture Test</H3><P>');
    main.append('<p> This will run the web assembly memory test to try to get to just shy of 2GB. It purposely allocates lots of memory without releasing any.</p>');
    
    Promise.all(p).then( async function() { 

        main.append('<p>Images Loaded</p>');
        
        const c=5.0*0.4247;
        const paramobj={
            "sigmas" : [c,c,c],
            "inmm" : false,
            "radiusfactor" : 1.5
        };
        const debug=0;
        const jsonstring=JSON.stringify(paramobj);
        let Module=biswrap.get_module();
        let image1_ptr=0;

        let alloc=async function(delay=500) {
            
            return new Promise( (resolve) => {
                setTimeout( () => {
                    for (let j=0;j<=99;j++) {
                        if (j===0)
                            image1_ptr=wrapperutil.serializeObject(Module,images[0],'bisImage');
                        else
                            wrapperutil.serializeObject(Module,images[0],'bisImage');
                    }
                    let m=Module['wasmMemory'].buffer.byteLength/(1024*1024);
                    resolve(m);
                },delay);
            });
        };

        let max=22;
        main.append(`<HR><H4>Running Test</H4><OL>`);
        for (let k=1;k<=max;k++) {
            let delay=10;
            let m=await alloc(delay);
            main.append(`<LI>${k}. Memory size =  ${m} MB. Last pointer=${image1_ptr}.</LI>`);
        }
        
        main.append('</OL><BR>');
        let m=Module['wasmMemory'].buffer.byteLength/(1024*1024);
        main.append(`<p>Memory size (end) =${m} MB</p>`);   
        const wasm_output=Module.ccall('gaussianSmoothImageWASM','number',
                                       ['number', 'string', 'number'],
                                       [ image1_ptr, jsonstring, debug]);
        
        m=Module['wasmMemory'].buffer.byteLength/(1024*1024);
        main.append(`<p>Memory size=${m} MB, wasm_output=${wasm_output}</p>`);   
        const out=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',images[0]);
        let error=out.maxabsdiff(images[1]);
        main.append(`<p>Final error < 2.0 = ${error}</p>`);
        console.log(`Final error < 2.0 = ${error}`);
        
        let url=window.document.URL;
        let index=url.indexOf('.html');
        if (index>=0)
            url=url.substr(0,index+5);
        
        main.append(`<B><a href="${url}">Reload this page</a> before running any other tests.</B>`);
        window.scrollTo(0,document.body.scrollHeight-100);
    });
};


    

var run_tests=async function(testlist,firsttest=0,lasttest=-1,testname='All',usethread=false,usefileserver=false) { // jshint ignore:line

    let forcegithub= $('#usegithub').is(":checked") || false;
    testDataRootDirectory=gettestdata.getbase(forcegithub,false);
    console.log('++++ Test Data Directory=',testDataRootDirectory);
    testDataModelDirectory=testDataRootDirectory;
    oldTestDataRootDirectory=testDataRootDirectory;
    
    if (webutil.inElectronApp()) {
        window.BISELECTRON.remote.getCurrentWindow().openDevTools();
    }
    let url=window.document.URL;
    let index=url.indexOf('.html');
    if (index>=0)
        url=url.substr(0,index+5);
    let thread=0;
    if (usethread)
        thread=1;
    let fileserverflag=0;
    if (usefileserver)
        fileserverflag=1;
            
    if (thread && threadController===null) { 
        threadController=document.createElement('bisweb-webworkercontroller');
        $('body').append($(threadController));
    }

    
    if (!usefileserver) {
        console.log('Disabling File Server');
        disableServer();
    } else {
        try {
            console.log('Enabling Disabling File Server');
            await enableServer();
        } catch(e) {
            //            webutil.createAlert('Server Error. Perhaps the server does not exist');
            console.log(e);
            return;
        }
    }

    userPreferences.setImageOrientationOnLoad('None');
    
    if (firsttest<0)
        firsttest=0;
    
    if (lasttest<=0 || lasttest>=testlist.length)
        lasttest=testlist.length-1;
    
    const main=$('#main');
    main.empty();
    if (testname!=="None") {
        main.append('<H3>Running Tests</H3>');
        main.append(`Executing tests ${firsttest}:${lasttest} (Max index=${testlist.length-1}).`);
        if (testname!=="All")
            main.append(`Only runnng tests with name=${testname}<HR>`);

    } else {
        main.append('<H3>Listing Tests</H3><HR>');
    }
    

    
    let run=0;
    let good=0;
    let bad=0;
    let skipped=0;
    
    let t00 = performance.now();

    let goodlist=[];
    let intentionalfail=[];
    let badlist=[];
    
    for (let i=firsttest;i<=lasttest;i++) {
        let v=testlist[i];
        let name=testlist[i].command.split(' ')[0].trim();
        let tname="Test_"+i;
        
        if (testname==='All' || testname.toLowerCase()===name.toLowerCase()) {

            run=run+1;
            main.append(`<a name="${tname}"></a><H4 class="testhead">Test ${i}: ${name}</H4><p><UL><LI> Command: ${v.command}</LI><LI> Test details: ${v.test}</LI><LI> Should pass: ${v.result}</LI>`);
            if (usethread)
                main.append(`<P> Running in WebWorker </P>`);
            console.log(`-------------------------------`);
            console.log(`-------------------------------\nRunning test ${i}: ${v.command}, ${v.test},${v.result}\n------------------------`);

            try {
                let t0 = performance.now();
                let obj=await execute_test(v,usethread); // jshint ignore:line
                var t1 = performance.now();
                main.append(`.... test execution time=${(0.001*(t1 - t0)).toFixed(2)}s`);

                try {
                    let a='<P>.... WASM memory size=' +biswrap.get_module()['wasmMemory'].buffer.byteLength/(1024*1024)+' MB.</P>';
                    main.append(a);
                } catch(e) {
                    // sometimes we have pure js modules, no wasm
                }

                main.append(`<p>${obj.result}</p>`);
                let obj2=await execute_compare(obj.module,v); // jshint ignore:line
                let result=obj2.result;
                let text=obj2.text;
                
                //                main.append(`.... result=${result}, expected=${v.result}`);
                
                if (result && v.result)  {
                    main.append(`<p>${text}</p>`);
                    good+=1;
                    goodlist.push(tname);
                } else if (!result && !v.result) {
                    main.append(`<p>${text} <BR> <B>This is OK as this test WAS EXPECTED to fail!</B></p>`);
                    good+=1;
                    intentionalfail.push(tname);
                }  else {
                    main.append(`<p><span style="color:red">${text}</span> </p>`);
                    main.append('<BR><H4 style="color:red"> T E S T  F A I L E D</H4><BR>');
                    bad+=1;
                    badlist.push(tname);
                    
                }
            } catch(e) {
                main.append(`<p><span style="color:red">Test Failed ${e}</span></p>`);
                bad+=1;
                badlist.push(tname);
            }


            main.append(`<details><summary><B>Details</B></summary><PRE>${logtext}</PRE></details><HR>`);
            window.scrollTo(0,document.body.scrollHeight-100);

            
        } else {
            if (testname==="None") {
                if (!webutil.inElectronApp()) {
                    let link=`${url}?first=${i}&last=${i}&testname=All&webworker=${thread}&run=1`;
                    main.append(`<p><a href="${link}">Test ${i}:</a> ${v.command}</p>`);
                } else {
                    main.append(`<p>Test ${i}: ${v.command}</p>`);
                }
                window.scrollTo(0,document.body.scrollHeight-100);
            }
            skipped+=1;
        }
        const webconsole=$('#results');
        webconsole.empty();
        let numtests=lasttest-firsttest+1;
        webconsole.append(`Tests for version=${bisdate}: completed=${run}/${numtests}, passed=${good}/${numtests}, failed=${bad}/${numtests}, skipped=${skipped}/${numtests}`);
    }
    
    let t11 = performance.now();


    
    if (testname!=="None") {
        main.append('<BR><BR><H3>All Tests Finished</H3>');
        main.append(`.... total test execution time=${(0.001*(t11 - t00)).toFixed(2)}s`);

        if (!webutil.inElectronApp()) {
            let link=`${url}?first=${firsttest}&last=${lasttest}&testname=${testname}&webworker=${thread}&fileserver=${fileserverflag}&run=1`;
            main.append(`<BR><p>To run this specific test directly click:<BR> <a href="${link}" target="_blank">${link}</a></p><HR><p></p>`);
        }

        window.scrollTo(0,document.body.scrollHeight-100);
    } else {
        main.append(`<BR> <BR> <BR>`);
        window.scrollTo(0,0);
    }

    if (goodlist.length>0 || badlist.length>0 || intentionalfail.length>0) {
        let names= [ 'Passed','Intentionally Failed (which means passed)','Actual Failed'];
        for (let i=0;i<=2;i++) {
            let lst=goodlist;
            if (i==1)
                lst=intentionalfail;
            else if (i==2)
                lst=badlist;
            main.append(`<H4>${names[i]}</H4>`);
            main.append(`<P>`);
            for (let j=0;j<lst.length;j++) {
                let n=lst[j];
            main.append(`<a href="#${n}">${n}</a>`);
                if (j<lst.length-1)
                    main.append(', ');
            }
            if (lst.length===0)
                main.append('None');
            main.append('</P><HR>');
        }
        main.append(`<BR> <BR> <BR>`); 
        window.scrollTo(0,document.body.scrollHeight-100);
    }

};  // jshint ignore:line

let initialize=function(data) {
    
    let testlist=data.testlist;
    let names=[];
    for (let i=0;i<testlist.length;i++) {
        let cmd=testlist[i].command.replace(/\t/g,' ').replace(/ +/g,' ');
        let command=cmd.split(' ');
        let modulename=command[0];
        if (names.indexOf(modulename)<0)
            names.push(modulename);
    }
    
    names=names.sort();
    let select=$("#testselect");
    for (let i=0;i<names.length;i++) {
        select.append($(`<option value="${names[i]}">${names[i]}</option>`));
    }

    // http://localhost:8080/web/biswebtest.html?last=77&testname=cropImage&webworker=0
    
    let firsttest=parseInt(webutil.getQueryParameter('first')) || 0;
    if (firsttest<0)
        firsttest=0;
    else if (firsttest>testlist.length-1)
        firsttest=testlist.length-1;
    
    let lasttest=parseInt(webutil.getQueryParameter('last') || 0);
    if (lasttest === undefined || lasttest<=0 || lasttest>=testlist.length)
        lasttest=testlist.length-1;

    let testname=webutil.getQueryParameter('testname') || 'None';
    if (testname !== 'None' && testname !=='All') {
        if (names.indexOf(testname)<0)
            testname='None';
    }
    
    let usethread=parseInt(webutil.getQueryParameter('webworker') || 0);
    let usefileserver=parseInt(webutil.getQueryParameter('fileserver') || 0);
    let dorun=parseInt(webutil.getQueryParameter('run') || 0);
    
    if (usethread)
        usethread=true;
    else
        usethread=false;
    
    if (usefileserver)
        usefileserver=true;
    else
        usefileserver=false;
        
    
    $('#first').val(firsttest);
    $('#last').val(lasttest);
    $('#testselect').val(testname);
    $('#usethread').prop("checked", usethread);
    if (!webutil.inElectronApp()) {
        $('#usefileserver').prop("checked", usefileserver);
    } else  {
        usefileserver=false;
    }

    var fixRange=function(targetname) {

        let target=$(targetname);
        let val=target.val();
        if (val<0)
            val=0;
        if (val>=testlist.length)
            val=testlist.length-1;
        target.val(val);
        
    };
    
    $('#first').change( (e) => {
        e.preventDefault();
        fixRange("#first");
    });

    $('#last').change( (e) => {
        e.preventDefault();
        fixRange("#last");
    });

    let fn=( (e) => {
        e.preventDefault(); // cancel default behavior
        let first=parseInt($("#first").val())||0;
        let last=parseInt($("#last").val());
        let testname=$('#testselect').val() || 'All';

        let usethread= $('#usethread').is(":checked") || false;
        let usefileserver=false;
        if (!webutil.inElectronApp()) {
            usefileserver= $('#usefileserver').is(":checked") || false;
        }
        
        if (last===undefined)
            last=testlist.length-1;


        
        run_tests(testlist,first,last,testname,usethread,usefileserver);
    });
    
    
    $('#compute').click(fn);

    if (dorun) {
        run_tests(testlist,firsttest,lasttest,testname,usethread,usefileserver);
    }

    if (!webutil.inElectronApp()) {
        $('#computemem').click(function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Starting');
            run_memory_test();
        });
    } else {
        $('#computemem').remove();
        $('#usefileserverdiv').remove();
    }
};

var startFunction = (() => {

    if (webutil.inElectronApp()) {
        $('#cnote').remove();
    }

    webcss.setAutoColorMode();
    /*
    
    if (typeof window.BIS !=='undefined')  {
        testDataRootDirectory="../test/";
        testDataModelDirectory="../test/";
        if (webutil.inElectronApp()) {
            testDataModelDirectory="./test/";
        }
    } else  {
        testDataRootDirectory="./test/";
        testDataModelDirectory="./test/";
    }*/

    initialize(module_testlist);

});


// -----------------------------------------------------------------
/**
 * A web element that runs the regression testing in conjuction with biswebtest.html
 */
class RegressionTestElement extends HTMLElement {
    
    // Fires when an instance of the element is created.
    connectedCallback() {

        if (gettestdata.islocal()) {
            console.log('Islocal');
            $("#githubdiv").css({"visibility" : "visible"});
        }  else {
            $("#usegithublab").text('');
        }
        
        
	window.onload=startFunction;
    }
}

webutil.defineElement('bisweb-regressiontestelement', RegressionTestElement);

