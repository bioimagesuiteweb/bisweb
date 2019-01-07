const BisWebImage=require('bisweb_image');
const bisutil=require('bis_util');


/**
 * tf recon module
 */

// ---------------------------------------------------------------------------------------
class TFWrapper {

    constructor(tf,mode='') {

        if (mode.length>1)
            this.mode=mode+' '+tf.getBackend();
        else
            this.mode=tf.getBackend();
        
        this.tf=tf;
        this.models={};
        this.modelcount=0;

    }

    getMode() {  return this.mode;   }
    

    disposeVariables(model) {
        return new Promise( (resolve) => {
            this.tf.disposeVariables();
            this.models[model.index]=undefined;
            resolve(this.tf.memory().numTensors);
        });
    }

    disposeTensor(tensor) {
        tensor.dispose();
    }

    predict(model,patch,shape,debug=false) {

        // shape[0] can be a string so map this to an integer
        // Needed in electron when crossing boundaries
        try {
            shape[0]=parseInt(shape[0]);
        } catch(e) {
            shape[0]=1;
        }
        
        return new Promise( (resolve) => {
            if (debug)
                console.log('++++ creating tensor',shape,'patch=',patch.length);
            const tensor= this.tf.tensor(patch, shape);
            const output=this.models[model.index].predict(tensor);
            tensor.dispose();
            resolve(output);
        });
    }

    loadFrozenModel(MODEL_URL,WEIGHTS_URL)  {

        console.log('... Loading model ',this.getMode());
        
        return new Promise( (resolve,reject) => {
            this.tf.loadFrozenModel(MODEL_URL, WEIGHTS_URL).then( (m) => {
                this.modelcount++;
                this.models[this.modelcount]=m;
                resolve( {
                    index :  this.modelcount,
                    shape :  m.inputs[0].shape,
                    numtensors : this.tf.memory().numTensors,
                });
            }).catch( (e) => {
                reject(e);
            });
        });
    }

    warmUp(model) {

        let shape=model.shape;
        shape[0]=1;
        this.tf.tidy( () => {
            console.log('___ Warm up model with zero input',shape);
            this.models[model.index].predict(this.tf.fill(shape,0,'float32'));
            console.log('___ Warm up done');
        });
    }
}





// ---------------------------------------------------------------------------------------
class BisWebTensorFlowRecon { 
    /**
     * @param{BisWebImage} img - the image
     * @param{Model} model - tensorflow model
     * @param{Number} padding - padding for stride increment
     */
    constructor(tfwrapper,input,model,padding=16) {

        this.debug=false;
        this.input=input;
        this.output=new BisWebImage();
        this.output.cloneImage(this.input);
        this.model=model;

        let shape=model.shape;

        let width=shape[1];
        let height=shape[2];
        let numslices=shape[3] || 1;

        let stridex=width-padding;
        let stridey=height-padding;
        
        let dims=this.input.getDimensions();
        let dimx=Math.floor(dims[0]/stridex);
        if (dims[0]%width>0)
            dimx+=1;

        let dimy=Math.floor(dims[1]/stridey);
        if (dims[1]%height>0)
            dimy+=1;

        if (numslices<1) 
            numslices=1;
        
        let thickness=Math.round(numslices/2)-1;
        if (thickness<0)
            thickness=0;

        this.patchinfo={
            'batchsize' : 1,
            'thickness' : thickness,
            'numslices' : numslices,
            'height' : height,
            'width'  : width,
            'numrows' : dimy,
            'numcols' : dimx,
            'stridex' : stridex,
            'stridey' : stridey,
            'numframes' : dims[3]*dims[4],
            'dims' : dims,
        };
        //        console.log('PatchInfo=',this.patchinfo);
        this.patch=null;
    }

    /** create temporary patch typedarray
     * @param{Number} b - the batchsize
     */
    createPatch(b=1) {
        this.patchinfo.batchsize=b;
        this.patchinfo.patchslicesize=this.patchinfo.width*this.patchinfo.height;
        this.patchinfo.patchvolumesize=this.patchinfo.patchslicesize*this.patchinfo.numslices;
        this.patch= new Float32Array(this.patchinfo.patchslicesize*this.patchinfo.batchsize);//this.internal.imginfo.type(width*height*numslices);
        if (this.debug)
            console.log('+++ Created patch temp array ',this.patch.length,'( ',this.patchinfo.patchvolumesize,'*',this.patchinfo.batchsize,')');
    }

    /** clean up internal objects */
    cleanup() {
        this.patch=null;
        this.input=null;
        this.patchinfo=null;
    }
    
    /** @returns{BisWebImage} - recon image */
    getOutput() {
        return this.output;
    }

    /** @returns{Object} - the patch information */
    getPatchInfo() {
        return this.patchinfo;
    }

    /** @returns{Float32Array} - the patch array */
    getPatch() {
        return this.patch;
    }

    /** Get Patch Limits 
     * @param{Number} slice - slice to extract -- 1D
     * @param{Number} frame - frame index for patch
     * @param{Number} row - row index for patch
     * @param{Number} col - col index for patch
     * @param{Boolean} store - if true, get middle portion
     * @returns{Object} - { begini, beginj, endi,endj,offset }
     */
    getPatchLimits(slice,frame,row,col,store=false) {

        let dims=this.input.getDimensions();
        let offset=slice*dims[0]*dims[1]+frame*dims[0]*dims[1]*dims[2];
        
        let begini=col*this.patchinfo.stridex;
        let endi=begini+this.patchinfo.width-1;
        let beginj=row*this.patchinfo.stridey;
        let endj=beginj+this.patchinfo.height-1;

        let obj = { 
            begini : begini,
            endi : endi,
            beginj : beginj,
            endj : endj,
            offset : offset

        };
        
        if (store) {

            let midx=Math.floor((this.patchinfo.width-this.patchinfo.stridex)*0.5);
            let midy=Math.floor((this.patchinfo.height-this.patchinfo.stridey)*0.5);
            
            if (col>0)
                obj.imin=begini+midx;
            else
                obj.imin=begini;
            
            if (row>0)
                obj.jmin=beginj+midy;
            else
                obj.jmin=beginj;

            if (col<this.patchinfo.numcols-1)
                obj.imax=endi-midx;
            else
                obj.imax=endi;
            
            if (row<this.patchinfo.numrows-1)
                obj.jmax=endj-midy;
            else
                obj.jmax=endj;

            if (obj.jmax>=dims[1])
                obj.jmax=dims[1]-1;
            if (obj.imax>=dims[0])
                obj.imax=dims[0]-1;
        } 

        if (obj.endj>=dims[1])
            obj.endj=dims[1]-1;
        
        return obj;
    }
    
    /** Get Patch  for tensorflow.js 
     * @param{Array} indices - [ slice,frame,row,col]  to extract -- 1D
     * @returns{TypedArray} - the patch (temporary)
     * @param{Number} batchindex - index in batch
     */
    extractPatch(indices,batchindex=0) {

        if (this.patch===null) {
            throw new Error('Call allocate Patch before');
        }

        if (this.debug)
            console.log('Indices=',indices);
        let in_slice=indices[0];
        let frame=indices[1];
        let row=indices[2];
        let col=indices[3];
        
        let dims=this.input.getDimensions();
        let minslice=in_slice-this.patchinfo.thickness;
        let maxslice=in_slice+this.patchinfo.thickness;
        let batchsize=this.patchinfo.batchsize;

        if (batchindex<0)
            batchindex=0;
        else if (batchindex>=batchsize)
            batchindex=batchsize-1;
        
        if (batchindex===0) {
            let l=this.patch.length;
            for (let i=0;i<l;i++)
                this.patch[i]=0;
        }
        
        let imagedata=this.input.getImageData();
        
        for (let slice=minslice;slice<=maxslice;slice++) {
            let sl=slice;
            if (sl<0)
                sl=0;
            if (sl>=dims[2])
                sl=dims[2]-1;

            let limits=this.getPatchLimits(sl,frame,row,col,false);
            let index=(slice-minslice)+batchindex*this.patchinfo.patchvolumesize;
            if (this.debug)
                console.log(`+++ read patch  ${slice}/${frame}/${row}/${col}, sl=${sl}, i=${limits.begini}:${limits.endi}, j=${limits.beginj}:${limits.endj}, batchindex=${batchindex}`);

            let iextra=0;
            if (limits.endi>=dims[0]) {
                iextra=(limits.endi-(dims[0]-1))*this.patchinfo.numslices;
                limits.endi=dims[0]-1;
            }
            
            for (let j=limits.beginj;j<=limits.endj;j++) {
                let joffset=j*dims[0]+limits.offset+limits.begini;
                for (let i=limits.begini;i<=limits.endi;i++) {
                    this.patch[index]=imagedata[joffset];
                    joffset++;
                    index+=this.patchinfo.numslices;
                }
                index+=iextra;
            }
        }
        return this.patch;
    }

    /** Set Patch from tensorflow.js 
     * @param{TypedArray} patch -- Typed Array to get patch from
     * @param{Array} indices - [ slice,frame,row,col]  to extract -- 1D
     * @param{Number} batchindex - index in batch
     * @returns{Boolean} - true if success
     */
    storePatch(patcharray,indices,batchindex=0) {

        if (this.debug)
            console.log('Patcharray',patcharray.constructor.name,patcharray.length,
                        'Indices=',JSON.stringify(indices),
                        'batchindex',batchindex);
        
        let slice=indices[0];
        let frame=indices[1];
        let row=indices[2];
        let col=indices[3];


        let limits=this.getPatchLimits(slice,frame,row,col,true);
        let dims=this.output.getDimensions();
        let batchsize=this.patchinfo.batchsize;
        if (batchindex<0)
            batchindex=0;
        else if (batchindex>=batchsize)
            batchindex=batchsize-1;
        
        let jminextra=0,iminextra=0,imaxextra=0;
        if (limits.jmin>limits.beginj)
            jminextra=(limits.jmin-limits.beginj);
        if (limits.imin>limits.begini)
            iminextra=(limits.imin-limits.begini);
        if (limits.imax<limits.endi)
            imaxextra=(limits.endi-limits.imax);

        // Start at start of batch slice
        let index=batchindex*this.patchinfo.patchvolumesize;
        // Increment to take account of low rows that are not stored
        index+=(jminextra*this.patchinfo.width);

        if (this.debug)
            console.log(`+++ write patch i=${limits.imin}:${limits.imax}, j=${limits.jmin}:${limits.jmax}, slice=${slice}/${frame}/${row}/${col} index=${batchindex}`);
        
        let imagedata=this.output.getImageData();

        for (let j=limits.jmin;j<=limits.jmax;j++) {
            let joffset=j*dims[0]+limits.offset+limits.imin;
            index+=iminextra;
            for (let i=limits.imin;i<=limits.imax;i++)  {
                imagedata[joffset]=patcharray[index];
                joffset++;
                index++;
            }
            index+=imaxextra;
        }
        return true;
    }

    /** @return{Array} - list of indices. Each element is [ slice,frame,row,col ] */
    getPatchIndices() {

        let indiceslist=[];
        let dims=this.input.getDimensions();

        // -------- 3D --------
        let maxslice=dims[2]-1,minslice=0;
        if (maxslice>0) {
            //minslice=50;
            //maxslice=100;
        }
        
        // Create patchlist
        for (let slice=minslice;slice<=maxslice;slice++) {
            for (let frame=0;frame<dims[3]*dims[4];frame++) {
                for (let row=0;row<this.patchinfo.numrows;row++) {
                    for (let col=0;col<this.patchinfo.numcols;col++) {
                        indiceslist.push([ slice,frame,row,col]);
                    }
                }
            }
        }
        return indiceslist;
    }

    
    /** 
     * Perform image reconstruction
     * @param{Module} tf - the tensorflow.js module
     * @param{Number} batchsize - the batch size
     * @param{Boolean} cleanup - if true clean up memory
     * @returns{BisWebImage} - the reconstructed image
     */
    reconstruct(tfwrapper,batchsize=2,cleanup=true) {

        return new Promise( async (resolve) => { 
            if (batchsize<1)
                batchsize=1;
            let patchindexlist=this.getPatchIndices();
            if (batchsize>patchindexlist.length)
                batchsize=patchindexlist.length;
            
            this.createPatch(batchsize);
            let shape=this.model.shape;

            console.log(`+++ Beginning Recon numpatches=${patchindexlist.length}, batchsize=${this.patchinfo.batchsize}`);
            let startTime=new Date();
            
            let step=Math.round(patchindexlist.length/20);
            let last=0;
            
            for (let pindex=0;pindex<patchindexlist.length;pindex+=batchsize) {
                
                let numpatches=patchindexlist.length-pindex;
                
                if (numpatches<batchsize)
                    this.createPatch(numpatches);
                else
                    numpatches=batchsize;
                
                if (this.debug || (pindex-last>step) || pindex===0) {
                    let per=Math.round( (100.0*pindex)/patchindexlist.length);
                    console.log(`${bisutil.getTime()} At ${per}%. Patches ${pindex}:${pindex+numpatches-1}/${patchindexlist.length}.`);
                    last=pindex;
                }
                
                for (let inner=0;inner<numpatches;inner++) {
                    let elem=patchindexlist[pindex+inner];
                    this.extractPatch(elem,inner);
                }
                
                let patch=this.getPatch();
                shape[0]=numpatches;

                const output=await tfwrapper.predict(this.model,patch,shape,this.debug);
                let predict=output.dataSync();

                
                for (let inner=0;inner<numpatches;inner++) {
                    let elem=patchindexlist[pindex+inner];
                    this.storePatch(predict,elem,inner);
                }

                tfwrapper.disposeTensor(output);
                
            }
            
            let endTime=new Date();
            
            let  s=Math.floor((endTime-startTime)/1000);
            let ms=Math.round((endTime-startTime)/10-s*100);
            let perslice=Math.round((endTime-startTime)/patchindexlist.length);
            console.log(`${bisutil.getTime()} Done Recon time=${s}.${ms}s, perpatch=${perslice}ms`);
            
            if (cleanup)
                this.cleanup();
            
            resolve(this.getOutput());
        });
    }

}

/** load tensorflowjs model and optionally run a warm up prediction
 * @param{Object} tfwrapper - the tensorflowjs object
 * @param{String} URL - the base URL for the model
 * @param{Boolean} warm - if true run a warm up prediction
 * @returns{Promise} - the payload is the model
 */
let loadAndWarmUpModel=function(tfwrapper,URL,warm=true) {

    console.log('___ In Load Model',URL);
    const MODEL_URL =  URL+'/tensorflowjs_model.pb';
    const WEIGHTS_URL = URL+'/weights_manifest.json';

    return new Promise( (resolve,reject) => {
        tfwrapper.loadFrozenModel(MODEL_URL, WEIGHTS_URL).then( (model) => {
            let shape=model.shape;
            console.log(`+++ Done Loading model [ ${shape.join(',')} ]`);
            
            if (warm) 
                tfwrapper.warmUp(model);

            console.log('___ Loaded model with shape',shape,' num tensors=',model.numtensors);
            resolve(model);
        }).catch( (e) => {
            console.log('___ Model load from',URL,'failed');
            reject(e);
        });
    });

};
    

/** Loads a Model and Reconstruct an image using a tf model
 * @param{Object} tfwrapper - the tensorflowjs object
 * @param{BisWebImage} img - the input image
 * @param{String} URL - the base URL for the model
 * @param{Number} batchsize - the batchsize for the recon
 * @param{Number} padding - the padding for the recon
 * @returns{Promise} - the payload is the output image
 */
let reconstructImage=function(tfwrapper,img,URL,batchsize,padding) {
    
    return new Promise( async (resolve,reject) => {
        
        let model=null;
        try {
            model=await loadAndWarmUpModel(tfwrapper,URL);
        } catch(e) {
            console.log('--- Failed load model from',URL,e);
            reject();
        }

        console.log('----------------------------------------------------------');
        console.log(`--- Beginning padding=${padding}`);
        let recon=new BisWebTensorFlowRecon(tfwrapper,img,model,padding);
        recon.reconstruct(tfwrapper,batchsize).then( (output) => {
            console.log('Done ----------------------------------------------------------');
            console.log('--- Recon finished :',output.getDescription());
            tfwrapper.disposeVariables(model).then( (num) => {
                console.log('--- Num Tensors=',num);
            });
            resolve(output);
        });
    });
};


module.exports = {
    BisWebTensorFlowRecon : BisWebTensorFlowRecon,
    TFWrapper : TFWrapper,
    loadAndWarmUpModel : loadAndWarmUpModel,
    reconstructImage : reconstructImage
};
