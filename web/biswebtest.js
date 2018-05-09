const $=require('jquery');
const moduleindex=require('moduleindex');
const biswrap = require('libbiswasm_wrapper');
const BisWebDataObjectCollection = require('bisweb_dataobjectcollection.js');
const webutil=require('bis_webutil');
const systemprint=console.log;
let replacing=false;

let logtext="";

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
        
        fetch('/test/'+paramfile).then( (response) => { 
            if(response.ok) {
                response.json().then( (obj) => {
                    console.log('.... Parameter File read from /test/'+paramfile);
                    obj=obj.params;
                    let keys=Object.keys(obj);
                    for (let i=0;i<keys.length;i++) {
                        if (keys[i]!=='module') {
                            if (params[keys[i]]=== undefined)
                                params[keys[i]]=obj[keys[i]];
                        }
                    }
                    resolve('');
                });
            } else {
                reject('Network response was not ok.');
            }
        }).catch( (e) => {
            reject(e);
        });
    });
};

var execute_test=function(test) {

    return new Promise( (resolve,reject) => {

        let cmd=test.command.replace(/\t/g,' ').replace(/ +/g,' ')
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
                        inputs[inp.varname]="/test/"+value;
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
                        result : 'Test completed, now checking results.',
                        module : module,
                    });
                    
                }).catch((e) => {
                    reject('---- Failed to invoke algorithm'+e);
                });
            }).catch((e) => {
                reject('----- Bad input filenames '+e);
            });
        }).catch((e) => {
            reject('----- Bad param file '+e);
        });
    });
        
};

const execute_compare=function(module,test) {

    return new Promise( (resolve,reject) => {

        let testtrue=test.result;
        let t=test.test.replace(/\t/g,' ').replace(/ +/g,' ').replace(/-+/g,'').split(' ');
        let tobj={ };
        for (let i=0;i<t.length;i=i+2) {
            tobj[t[i]]=t[i+1];
        }
        
        let threshold = tobj['test_threshold'] || 0.01;
        let comparison = tobj['test_comparison'] || "maxabs";
        let test_type = tobj['test_type'] || 'image';
        let test_target = "/test/"+tobj['test_target'];
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
        let c=`==== C o m p a r i n g  ${test_type}  u s i n g  ${comparison} and  t h r e s h o l d=${threshold}.<BR>====<BR>`;

        if (test_type === "matrixtransform" || test_type==="gridtransform") {
            test_type="transform";
        }
        
        BisWebDataObjectCollection.loadObject(test_target,test_type).then( (obj) => {

            let resultObject=module.getOutputObject();
            if (test_type==='registration') {
                resultObject=module.getOutputObject('resliced');
                console.log('.... using resliced output for test');
            }
            let result=resultObject.compareWithOther(obj,comparison,threshold);

            if (result.testresult) {
                console.log(`++++ Module ${module.name} test pass.<BR>++++  deviation (${result.metric}) from expected: ${result.value} < ${threshold}`);
                resolve({ result : result.testresult,
                          text   : c+`++++ Module ${module.name} test pass.<BR>++++  deviation (${result.metric}) from expected: ${result.value} < ${threshold}`
                        });
            } else {
                console.log(`---- Module ${module.name} test failed. Module produced output significantly different from expected.<BR>----  deviation (${result.metric}) from expected: ${result.value} > ${threshold}`);
                resolve({
                    result : result.testresult,
                    text : c+`---- Module ${module.name} test failed. Module produced output significantly different from expected.<BR>----  deviation (${result.metric}) from expected: ${result.value} > ${threshold}`
                });
            }
        }).catch((e) => {
            reject(e);
        });
    });
};


const run_tests=async function(testlist,firsttest=0,lasttest=-1,testname='All') {

    
    if (firsttest<0)
        firsttest=0;
    
    if (lasttest<=0 || lasttest>=testlist.length)
        lasttest=testlist.length-1;
    
    const main=$('#main');
    main.empty();
    main.append('<H3>Running Tests</H3><HR>');
    main.append(`Executing tests ${firsttest}:${lasttest} of ${testlist.length}. Name filter=${testname}<HR>`);

    
    let run=0;
    let good=0;
    let bad=0;
    let skipped=0;
    
    for (let i=firsttest;i<=lasttest;i++) {
        run=run+1;
        let v=testlist[i];
        let name=testlist[i].command.split(' ')[0].trim();
        console.log('Comparing ',name,testname);
        if (testname==='All' || testname.toLowerCase()===name.toLowerCase()) {
            
            main.append(`<P>Running test ${i+1}: ${v.command}<UL><LI>${v.test},${v.result}</LI></P>`);
            console.log(`-------------------------------`);
            console.log(`-------------------------------\nRunning test ${i+1}: ${v.command}, ${v.test},${v.result}\n------------------------`);
            replacesystemprint(true);
            try {
                let obj=await execute_test(v,i)
                main.append(`<p>${obj.result}</p>`);
                let obj2=await execute_compare(obj.module,v);
                let result=obj2.result;
                let text=obj2.text;
                
                main.append(`.... result=${result}, expected=${v.result}`);
                
                if (result && v.result)  {
                    main.append(`<p>${text}</p>`);
                    good+=1;
                } else if (!result && !v.result) {
                    main.append(`<p>${text} <BR>++++ <B>This is OK as this test WAS EXPECTED to fail!</B></p>`);
                    good+=1;
                }  else {
                    main.append(`<p><span style="color:red">${text}</span> </p>`);
                    bad+=1;
                }
            } catch(e) {
                main.append(`<p><span style="color:red">Skipping Test ${e}</span></p>`);
                skipped+=1;
            }
            replacesystemprint(false);
            main.append(`<details><summary><B>Details</B></summary><PRE>${logtext}</PRE></details><HR>`);
            
            const webconsole=$('#results');
            webconsole.empty();
            webconsole.append(`<BR>Tests completed ${run}/${lasttest-firsttest+1}, passed=${good}, failed=${bad}, skipped=${skipped}`);
        } else {
            main.append(`<P>Ignoring test ${i+1}: ${v.command} <span style="color:green">as it does not match ${testname}</span></p>`);
        }
    }
    console.log('Done');
    main.append('<BR> <BR>All Tests Finished');
};



window.onload = function() {

    biswrap.initialize().then( () => {
        
        fetch('../test/module_tests.json').then( (response) => { 
            if(response.ok) {
                // Examine the text in the response
                response.json().then(function(data) {

                    let testlist=data.testlist;
                    
                    let firsttest=parseInt(webutil.getQueryParameter('first')) || 0;
                    if (firsttest<0)
                        firsttest=0;
                    
                    let lasttest=parseInt(webutil.getQueryParameter('last') || 0);
                    if (lasttest === undefined || lasttest<=0 || lasttest>=testlist.length)
                        lasttest=2;
                    
                    $('#first').val(firsttest);
                    $('#last').val(lasttest);
                    $('#testname').val('All');
                      let fn=( (e) => {
                          e.preventDefault(); // cancel default behavior
                          let first=parseInt($("#first").val())||0;
                          let last=parseInt($("#last").val());
                          let testname=$('#testname').val() || 'All';
                        if (last===undefined)
                            last=testlist.length-1;
                        run_tests(testlist,first,last,testname);
                    });

                    
                    $('#compute').click(fn);
                });
            } else {
                throw new Error('Network response was not ok.');
            }
        });
    });
}
