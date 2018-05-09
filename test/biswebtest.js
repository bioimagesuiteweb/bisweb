/* global window,document */

"use strict";



const $=require('jquery');
const moduleindex=require('moduleindex');
const biswrap = require('libbiswasm_wrapper');
const BisWebDataObjectCollection = require('bisweb_dataobjectcollection.js');
const webutil=require('bis_webutil');
const systemprint=console.log;
const bis_genericio=require('bis_genericio');
const userPreferences = require('bisweb_userpreferences.js');
let replacing=false;

let logtext="";
let extradir="";


//    extradir="../test/";

    
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

        bis_genericio.read(extradir+paramfile).then( (res) => {
            
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

var execute_test=function(test) {

    return new Promise( (resolve,reject) => {

        let cmd=test.command.replace(/\t/g,' ').replace(/ +/g,' ');
        let command=cmd.split(' ');
        let modulename=command[0];
        let module=moduleindex.getModule(modulename);

        let params={};
        let inputs={};
        let paramfile='';
        let des=module.getDescription();

        for (let i=1;i<command.length;i=i+2) {
            let flag=command[i];
            if (flag.length>0) {
                let pname=flag.replace(/--/g,'').replace(/-/g,'');
                let value=command[i+1];
                let j=0,found=false;
                while (j<des.inputs.length && found===false) {
                    
                    let inp=des.inputs[j];
                    if (inp.shortname===pname || inp.varname===pname) {
                        inputs[inp.varname]=extradir+value;
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

        let tobj=get_test_object(test);
        let test_type = tobj['test_type'] || 'image';
        if (test_type==='registration')
            params['doreslice']=true;

        loadparamfile(paramfile,module.name,params).then( () => {

            console.log(' ');
            console.log('oooo Loading Inputs ',JSON.stringify(inputs));
            
            module.loadInputs(inputs).then( () => {
                console.log('oooo Loaded.');
                console.log('oooo Invoking Module with params=',JSON.stringify(params));
                let newParams = module.parseValuesAndAddDefaults(params);
                module.directInvokeAlgorithm(newParams).then(() => {
                    console.log('oooo -------------------------------------------------------');
                    resolve( {
                        result : ' Test completed, now checking results.',
                        module : module,
                    });
                    
                }).catch((e) => {
                    reject('---- Failed to invoke algorithm '+e);
                });
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
            if (comparison !== "maxabs") {
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
        let c=`<H4>C o m p a r i n g   ${test_type}   u s i n g   ${comparison}  and  t h r e s h o l d=${threshold}</H4>`;

        const orig_test_type=test_type;
        
        if (test_type === "matrixtransform" || test_type==="gridtransform") {
            test_type="transform";
        }
        
        BisWebDataObjectCollection.loadObject(extradir+test_target,test_type).then( (obj) => {

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

            if (result.testresult) {
                console.log(`++++ Module ${module.name} test passed.\n++++  deviation (${result.metric}) from expected: ${result.value} < ${threshold}`);
                resolve({ result : result.testresult,
                          text   : c+` Module ${module.name} test <span class="passed">passed</span>.<BR>  deviation (${result.metric}) from expected: ${result.value} < ${threshold}`
                        });
            } else {
                console.log(`---- Module ${module.name} test failed.\n---- Module produced output significantly different from expected.\n----  deviation (${result.metric}) from expected: ${result.value} > ${threshold}`);
                resolve({
                    result : result.testresult,
                    text : c+` Module ${module.name} test <span class="failed">failed</span>. Module produced output significantly different from expected.<BR>  deviation (${result.metric}) from expected: ${result.value} > ${threshold}`
                });
            }
        }).catch((e) => {
            reject(e);
        });
    });
};

var run_tests=async function(testlist,firsttest=0,lasttest=-1,testname='All') { // jshint ignore:line

    
    if (firsttest<0)
        firsttest=0;
    
    if (lasttest<=0 || lasttest>=testlist.length)
        lasttest=testlist.length-1;
    
    const main=$('#main');
    main.empty();
    if (testname!=="None") {
        main.append('<H2>Running Tests</H2>');
        main.append(`Executing tests ${firsttest}:${lasttest} (Max index=${testlist.length-1}).`);
        if (testname!=="All")
            main.append(`Only runnng tests with name=${testname}<HR>`);
    } else {
        main.append('<H2>Listing Tests</H2><HR>');
    }


    
    let run=0;
    let good=0;
    let bad=0;
    let skipped=0;
    
    for (let i=firsttest;i<=lasttest;i++) {
        let v=testlist[i];
        let name=testlist[i].command.split(' ')[0].trim();
        if (testname==='All' || testname.toLowerCase()===name.toLowerCase()) {

            run=run+1;
            main.append(`<H3 class="testhead">Running Test ${i}: ${name}</H3><p><UL><LI> Command: ${v.command}</LI><LI> Test details: ${v.test}</LI><LI> Should pass: ${v.result}</LI>`);
            console.log(`-------------------------------`);
            console.log(`-------------------------------\nRunning test ${i}: ${v.command}, ${v.test},${v.result}\n------------------------`);
            replacesystemprint(true);
            try {
                let obj=await execute_test(v,i); // jshint ignore:line
                main.append(`<p>${obj.result}</p>`);
                let obj2=await execute_compare(obj.module,v); // jshint ignore:line
                let result=obj2.result;
                let text=obj2.text;
                
                //                main.append(`.... result=${result}, expected=${v.result}`);
                
                if (result && v.result)  {
                    main.append(`<p>${text}</p>`);
                    good+=1;
                } else if (!result && !v.result) {
                    main.append(`<p>${text} <BR> <B>This is OK as this test WAS EXPECTED to fail!</B></p>`);
                    good+=1;
                }  else {
                    main.append(`<p><span style="color:red">${text}</span> </p>`);
                    main.append('<H4> T E S T  F A I L E D</H4>');
                    bad+=1;
                    
                }
            } catch(e) {
                main.append(`<p><span style="color:red">Test Failed ${e}</span></p>`);
                bad+=1;
            }
            replacesystemprint(false);
            main.append(`<details><summary><B>Details</B></summary><PRE>${logtext}</PRE></details><HR>`);
            window.scrollTo(0,document.body.scrollHeight-100);

            
        } else {
            if (testname==="None") {
                main.append(`<P>Test ${i}: ${v.command}</p>`);
                window.scrollTo(0,document.body.scrollHeight-100);
            }
            skipped+=1;
        }
        const webconsole=$('#results');
        webconsole.empty();
        let numtests=lasttest-firsttest+1;
        webconsole.append(`Tests completed=${run}/${numtests}, passed=${good}/${numtests}, failed=${bad}/${numtests}, skipped=${skipped}/${numtests}`);
    }

    if (testname!=="None") {
        main.append('<BR><BR><H3>All Tests Finished</H3>');
        window.scrollTo(0,document.body.scrollHeight-100);
    } else {
        main.append(`<BR> <BR> <BR>`);
        window.scrollTo(0,0);
    }

};  // jshint ignore:line

let initialize=function(txt) {

    biswrap.initialize();
    console.log('Read file:', extradir+'module_tests.json');
    let data=null;
    try {
        data=JSON.parse(txt);
    } catch(e) {
        throw new Error('Failed to parse ',extradir+'module_tests.json');
    }
    
    let testlist=data.testlist;
    console.log('There are ',testlist.length,' tests');
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
    
    let firsttest=parseInt(webutil.getQueryParameter('first')) || 0;
    if (firsttest<0)
        firsttest=0;
    
    let lasttest=parseInt(webutil.getQueryParameter('last') || 0);
    if (lasttest === undefined || lasttest<=0 || lasttest>=testlist.length)
        lasttest=testlist.length-1;
    
    $('#first').val(firsttest);
    $('#last').val(lasttest);
    $('#testselect').val('None');

    var fixRange=function(targetname) {

        let target=$(targetname);

        console.log('targ=',target);
        let val=target.val();
        if (val<0)
            val=0;
        if (val>=testlist.length)
            val=testlist.length-1;
        target.val(val);
        
    };
    
    $('#first').change( (e) => {
        e.preventDefault();
        console.log('Here ',e);
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
        if (last===undefined)
            last=testlist.length-1;
        run_tests(testlist,first,last,testname);
    });
    
    
    $('#compute').click(fn);

};

window.onload = (() => {

    if (webutil.inElectronApp()) {
        window.BISELECTRON.remote.getCurrentWindow().openDevTools();
    }

    userPreferences.setImageOrientationOnLoad('None');
    console.log('Mode=',bis_genericio.getmode());
    
    bis_genericio.read(extradir+'module_tests.json').then( (obj) => {
        console.log('++++ Read',obj.filename);
        try {
            initialize(obj.data);
        } catch(e) {
            console.log(e);
        }
        console.log('Done Initializing');
        return;
    }).catch( () => {
        extradir="../test/";
        console.log('\n\n\n Failed to read ',extradir+'module_tests.json, trying again with extradir='+extradir);
        
        bis_genericio.read(extradir+'module_tests.json').then( (obj) => {
            console.log('++++ Read',obj.filename);
            initialize(obj.data);
        }).catch( () => {
            extradir="./test/";
            console.log('\n\n\n Failed to read ',extradir+'module_tests.json, trying again with extradir='+extradir);
            
            bis_genericio.read(extradir+'module_tests.json').then( (obj) => {
                console.log('++++ Read',obj.filename);
                initialize(obj.data);
            }).catch((e) => {
                console.log('Failed to read ',extradir+'module_tests.json.'+'\n'+e);
            });
        });
    });
    
        
});

