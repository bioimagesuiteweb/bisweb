

let tf=null;

const tfmodule = {

    models : {},
    modelcount : 0,

    // Straight Wrappers
    disposeVariables() {
        tf.disposeVariables();
        return this.tf.memory().numTensors;
    },

    // More complicated wrappers
    loadFrozenModel : function(MODEL_URL,WEIGHTS_URL)  {
        return new Promise( (resolve,reject) => {
            tf.loadFrozenModel(MODEL_URL, WEIGHTS_URL).then ( (model) => {
                this.modelcount++;
                this.models[this.modelcount]=model;
                resolve( {
                    index :  this.modelcount,
                    shape :  model.inputs[0].shape,
                    numtensors : tf.memory().numTensors,
                });
            }).catch( (e) => {
                console.log('Error loading',e);
                reject(e);
            });
        });
    },
    
    predict : function(model,patch,shape,debug) {

        console.log('Shape=',shape,'model=',model,'debug=',debug);
        let sz=shape[0]*shape[1]*shape[2]* ( shape[3]||1);

        let ipatch=new Uint8Array(patch);
        console.log('Patch=',ipatch.constructor.name,ipatch.length);
        let fpatch=new Float32Array(ipatch.buffer);
        console.log('Patch=',fpatch.constructor.name,fpatch.length);
        const tensor= tf.tensor(fpatch, shape);
        console.log('Tensor=',tensor);
        const output=this.models[model.index].predict(tensor);
        console.log('Output=',tensor);
        const final=output.dataSync();
        console.log('final',final);
        tensor.dispose();
        output.dispose();
        return final;
    },

};

module.exports=function(ipcMain) {

    if (tf!==null)
        return false;

    tf=require('@tensorflow/tfjs');
    require('@tensorflow/tfjs-node');

    ipcMain.on('tfLoadFrozenModel',function(event,arg) {
        
        console.log("Received tfLoadFrozenModel",arg);
        
        tfmodule.loadFrozenModel(arg.mod,arg.wgt).then( (m) => {
            event.sender.send('tfSuccess',{
                result : m,
                id: arg.id
            });
        }).catch( (e) => {
            event.sender.send('tfError', {
                result : e,
                id : arg.id
            });
        });
    });

    ipcMain.on('tfDisposeVariables',function(event,arg) {
        
        console.log("Received tfDisposeVariables",arg);
        
        tfmodule.loadFrozenModel(arg).then( (m) => {
            event.sender.send('tfSuccess', {
                result : m,
                id : arg.id
            });
        }).catch( (e) => {
            event.sender.send('tfError', {
                result : e,
                id : arg.id
            });
        });
    });

    ipcMain.on('tfPredict',function(event,arg) {

        console.log("Received tfPredict",arg);
        
        tfmodule.predict(arg.model,
                         arg.patch,
                         arg.shape,
                         arg.debug).then( (m) => {
                             event.sender.send('tfSuccess', {
                                 result : m,
                                 id : arg.id,
                             });
                         }).catch( (e) => {
                             event.sender.send('tfError', {
                                 result : e,
                                 id : arg.id
                             });
                         });
    });
    
    return true;
};
