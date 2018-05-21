"use strict";

let modules=require("moduleindex.js");

const wwdebug=false;
const BisWebDataObjectCollection=require('bisweb_dataobjectcollection.js');

/**
 * A set of functions to help module execution in a WebWorker
 *
 * Workflow
 * Main Thread
 *    inMainThreadExecuteModule --> 
 *         creates a job id and saves a callback to a a job list (workerparams)
 *         Serializes inputs and calls Worker.postMessage
 * Worker
 *    Message received in self.onmessage and parsed to dictionary (self is the context of the webworker in global space)
 *    call to inWorkerExecuteModule
 *    when done call postMessage
 * Main Thread
 *    Message is received in Worker.onmessage and parsed to dictionary
 *    call to inMainThreadModuleDone
 *
 * @namespace BisWebWorker
 */



/**
 * Command to execute a module inside a Web Worker
 * @alias BisWebWorker.inWorkerExecuteModule
 * @param{Dictionary} obj - the job description
 * @param{String} obj.id - the job id string
 * @param{String} obj.modulename - the name of the module to execute
 * @param{Object} obj.inputs - a dictionary serialization of BisWebDataObjectCollection containing the inputs
 * @param{Object} obj.parameters -  a dictionary of module parameters
 * @param{Callback} messageCommand - the command to call when done (set this to postMessage inside a web worker)
*/
let inWorkerExecuteModule=function(obj,messageCommand) {

    if (wwdebug) console.log('\n---------------------------------------------\n\nwwww inWorkerExecuteModule');
    let id=obj.id;
    let modulename=obj.modulename;
    let parameters=obj.parameters;

    let collection=new BisWebDataObjectCollection();
    collection.parseFromDictionary(obj.inputs);
    
    let numitems=collection.getNumberOfItems();
    let inputs={};
    for (let i=0;i<numitems;i++) {
        let item=collection.getItem(i);
        if (wwdebug) console.log('wwww Adding ',item.metadata,' desc=',item.data.getDescription());
        inputs[item.metadata]=item.data;
    }

    let module=modules.getModule(modulename);

    module.execute(inputs,parameters).then( () => {

        module.storeCommentsInOutputs("WebWorker",parameters,"WebWorker");
        let outcollection=new BisWebDataObjectCollection();
        let des=module.getDescription();
        
        des.outputs.forEach((opt) => {
            let outobj = module.getOutputObject(opt.varname);


            
            if (outobj) {
                outcollection.addItem(outobj,opt.varname);
                if (wwdebug) console.log('wwww Done adding to outcollection', opt.varname,' ' ,outobj.getDescription());
            } else {
                if (wwdebug) console.log('zzzz Bad object',opt.varname);
            }
        });

        let output= {
            "modulename" :  modulename,
            "id" : id,
            "parameters" : parameters,
            "outputs" : outcollection.serializeToDictionary(),
        };
        
        module.cleanupMemory();

        messageCommand(JSON.stringify(output));

    }).catch( (e) =>  {
        let a=JSON.stringify({ "modulename" : modulename,
                               "id" : id,
                               "error" : e,
                               "parameters" : parameters,
                               "outputs" : [],
                               "details" : "Failed to execute module"+ modulename
                             });
        messageCommand(a);
    });
};


/** Job Queue */

const workerparams = {
    lastjob : 0,
    pending : { }
};

/**
 * Command to execute a module in a Web Worker called from the Main thread
 * @alias BisWebWorker.inMainThreadExecuteModule
 * @param{WebWorker} worker - the worker to call to do the job
 * @param{String} modulename - the name of the module to execute
 * @param{Object} inputs - a dictionary containing the inputs
 * @param{Object} parameters - a dictionary containing the parameters
 * @param{Callback} callback - the command to call when the module is done
*/
let inMainThreadExecuteModule=function(worker,modulename,inputs,params,callback=null) {

    if (wwdebug) console.log('\n-------------------------------------------\nwwww In inMainThreadExecuteModule ',modulename,params,'\n');
    
    workerparams.lastjob=workerparams.lastjob+1;

    //let serialized_inputs={};

    let keys=Object.keys(inputs);
    let collection=new BisWebDataObjectCollection();

    for (let i=0;i<keys.length;i++) {
        let inpobj = inputs[keys[i]];
        if (inpobj) {
            if (wwdebug) console.log('wwww adding input to collection=',keys[i],inpobj.getDescription());
            collection.addItem(inpobj,keys[i]);
        }
    }

    let id=workerparams.lastjob;

    let obj= {
        "modulename" :  modulename,
        "parameters" :  params,
        "inputs" :      collection.serializeToDictionary(),
        "id" : id,
    };

    if (wwdebug) console.log('wwww Calling PostMessage Modulename=',obj.modulename,'id=',obj.id);
    

    workerparams.pending[id]= { "modulename"  : modulename,
                                "parameters"  : params,
                                "callback"    : callback };

    
    if (wwdebug) console.log('wwww Stack=',JSON.stringify(workerparams.pending[id]));
    
    worker.postMessage(JSON.stringify(obj));
};


/**
 * Command to handle the end of the job  a module execute inside a Web Worker.
 * It calls the callback function set in inMainThreadExecuteModule
 * This is called from Worker.onmessage
 * @alias BisWebWorker.inMainThreadModuleDone
 * @param{Dictionary} obj - the job description of the output
 * @param{String} obj.id - the job id string
 * @param{String} obj.modulename - the name of the module to execute
 * @param{Object} obj.outputs - a dictionary serialization of BisWebDataObjectCollection of the module outputs
*/
let inMainThreadModuleDone=function(obj) {

    if (wwdebug) console.log('\n-------------------------------------------\nwwww In inMainThreadModuleDone\n');

    let modulename=obj.modulename;
    let id=obj.id;
    //let parameters=obj.parameters;

    let collection=new BisWebDataObjectCollection();
    collection.parseFromDictionary(obj.outputs);
    
    let numitems=collection.getNumberOfItems();
    let outputs = { };
    for (let i=0;i<numitems;i++) {
        let item=collection.getItem(i);
        if (wwdebug) console.log('Adding ',item.metadata,' desc=',item.data.getDescription());
        outputs[item.metadata]=item.data;
    }

    let clb=workerparams.pending[id];

    if (clb.modulename === modulename) {
        delete workerparams.pending[id];

        if (wwdebug) console.log('\n-------------------------------------------\n');

        clb.callback(outputs);
    } else {
        console.log('id '+id+' does not exist in pending job collection');
    }

};


/** A Dummy worker object to simulate running through a worker for testing purposes */

let DummyWorker = {

    messageCommand : function(str) {
        console.log('\n\n-------------------------------------------\nwwww In dummy message command ',str.length);
        let obj=JSON.parse(str);
        console.log('wwww Calling inMainThreadModuleDone',Object.keys(obj));
        inMainThreadModuleDone(obj);
    },
    
    postMessage : function(str) {
        console.log('\n\n-------------------------------------------\nwwww In dummy post message ',str.length);
        const that=this;
        let obj=JSON.parse(str);
        console.log('wwww Calling inWorkerExecuteModule',Object.keys(obj));
        inWorkerExecuteModule(obj,that.messageCommand);
    },
};


module.exports = {

    inWorkerExecuteModule : inWorkerExecuteModule,
    inMainThreadModuleDone :  inMainThreadModuleDone,
    inMainThreadExecuteModule : inMainThreadExecuteModule,
    DummyWorker : DummyWorker,
};
