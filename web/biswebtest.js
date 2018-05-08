const $=require('jquery');
const moduleindex=require('moduleindex');
const biswrap = require('libbiswasm_wrapper');
const BisWebDataObjectCollection = require('bisweb_dataobjectcollection.js');
const webutil=require('bis_webutil');

var execute_test=function(test) {

    return new Promise( (resolve,reject) => {

        let cmd=test.command.replace(/\t/g,' ').replace(/ +/g,' ')
        let command=cmd.split(' ');
        let modulename=command[0];
        let module=moduleindex.getModule(modulename);

        let params={};
        let inputs={};

        let des=module.getDescription();

        console.log('Num values for module=',modulename,'=',command.length,JSON.stringify(command));
            
        for (let i=1;i<command.length;i=i+2) {
            let flag=command[i];
            if (flag.length>0) {
                let pname=flag.replace(/--/g,'').replace(/-/g,'');
                let value=command[i+1];
                let j=0,found=false;
                console.log(`\n Looking for *${pname}*`);
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
                            console.log('Setting ',p.varname,' to ',value,JSON.stringify(params));
                            found=true;
                        }
                    j=j+1;
                    }
                }
                
                if (found===false) {
                    reject(`parameter ${flag} not found`);
                }
            }
        }
        console.log('Inputs=',JSON.stringify(inputs));
        console.log('Params=',JSON.stringify(params));

        module.loadInputs(inputs).then( () => {
            console.log('oooo Loaded.');
            module.directInvokeAlgorithm(params).then(() => {
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
    });
};

const execute_compare=function(module,test) {

    return new Promise( (resolve,reject) => {

        /** Process the result of a test
         * @param{Sting} toolname - the name of the tool
         * @param{String} resultFile - the filename of the output file
         * @param{String} test_target - the filename of the gold standard file
         * @param{String} test_type - the type of object we re testing (image,matrix,transform)
         * @param{Number} test_threshold - the threshold below which the test passes 
         * @param{String} test_comparison - one of "ssd" , "maxabs" or "cc" metric to compare objects with
         * @param{Function} cleanupAndExit - a function to call on exit (default =process.exit)
         * @alias CommandLine.processTestResult
         */
        let testtrue=test.result;
        let t=test.test.replace(/\t/g,' ').replace(/ +/g,' ').replace(/-+/g,'').split(' ');
        console.log('t',t);
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

        if (test_type === "matrixtransform" || test_type==="gridtransform") {
            test_type="transform";
        }
        
        BisWebDataObjectCollection.loadObject(test_target,test_type).then( (obj) => {

            console.log(module);
            let resultObject=module.getOutputObject();
            let result=resultObject.compareWithOther(obj,comparison,threshold);
            console.log('Result=',JSON.stringify(result),obj.getDescription(),resultObject.getDescription());
            if (result.testresult) {
                resolve({ result : result.testresult,
                          text   : `++++ Module ${module.name} test pass.<BR>++++  deviation (${result.metric}) from expected: ${result.value} < ${threshold}`
                        });
            } else {
                resolve({
                    result : result.testresult,
                    text : `---- Module ${module.name} test failed. Module produced output significantly different from expected.<BR>----  deviation (${result.metric}) from expected: ${result.value} > ${threshold}`
                });
            }
        }).catch((e) => {
            reject(e);
        });
    });
};


const run_tests=async function(testlist) {

    
    let firsttest=parseInt(webutil.getQueryParameter('first')) || 0;
    if (firsttest<0)
        firsttest=0;
    
    let lasttest=parseInt(webutil.getQueryParameter('last') || 0);
    if (lasttest === undefined || lasttest<=0 || lasttest>=testlist.length)
        lasttest=testlist.length-1;
    
    const main=$('#main');
    main.append(`Executing tests ${firsttest}:${lasttest} of ${testlist.length}<HR>`);

    let run=0;
    let good=0;
    let bad=0;
    let skipped=0;
    
    for (let i=firsttest;i<=lasttest;i++) {
        run=run+1;
        let v=testlist[i];
        main.append(`<P>Running test ${i+1}: ${v.command}<UL><LI>${v.test},${v.result}</LI></P>`);
        try {
            let obj=await execute_test(v,i)
            main.append(`<p>${obj.result}</p>`);
            let obj2=await execute_compare(obj.module,v);
            let result=obj2.result;
            let text=obj2.text;

            main.append(`.... result=${result}, expected=${v.result}`);
            
            if (result && v.result)  {
                main.append(`<p>${text}</p><HR>`);
                good+=1;
            } else if (!result && !v.result) {
                main.append(`<p>${text} <BR>++++ <B>This is OK as this test WAS EXPECTED to fail!</B></p><HR>`);
                good+=1;
            }  else {
                main.append(`<p><span style="color:red">${text}</span> </p><HR>`);
                bad+=1;
            }
        } catch(e) {
            main.append(`<p><span style="color:red">Skipping Test ${e}</span></p><HR>`);
            skipped+=1;
        }

        const webconsole=$('#console');
        webconsole.empty();
        webconsole.append(`<BR>Tests completed ${run}/${lasttest-firsttest+1}, passed=${good}, failed=${bad}, skipped=${skipped}`);
    }
    
};



window.onload = function() {

    biswrap.initialize().then( () => {
        
        fetch('../test/module_tests.json').then( (response) => { 
            if(response.ok) {
                console.log(response.body);
                // Examine the text in the response
                response.json().then(function(data) {
                    run_tests(data.testlist);
                });
            } else {
                throw new Error('Network response was not ok.');
            }
        });
    });
}
