const BisWebImage=require('bisweb_image');

class BisWebTensorFlowRecon { 
    /** Get Patch Info for tensorflow.js 
     * @param{BisWebImage} img - width of patch (should be power of 2)
     * @param{Model} model - tensorflow model
     * @param{Number} padding - padding for stride increment
     * @returns{Object} - patch info
     */
    constructor(input,model,padding=16) {

        this.input=input;
        this.output=new BisWebImage();
        this.output.cloneImage(this.input);
        this.model=model;
        
        let shape=model.inputs[0].shape;

        //        console.log('+++ Initializing', this.input.getDimensions(), ' model=', shape);
        
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

    createPatch(b=1) {
        this.patchinfo.batchsize=b;
        this.patchinfo.patchslicesize=this.patchinfo.width*this.patchinfo.height;
        this.patchinfo.patchvolumesize=this.patchinfo.patchslicesize*this.patchinfo.numslices;
        this.patch= new Float32Array(this.patchinfo.patchslicesize*this.patchinfo.batchsize);//this.internal.imginfo.type(width*height*numslices);
        console.log('+++ Created patch temp array ',this.patch.length,'( ',this.patchinfo.patchvolumesize,'*',this.patchinfo.batchsize,')');
    }

    cleanup() {
        this.patch=null;
        this.input=null;
        this.patchinfo=null;
    }
    
    /** @returns{BisWebImage} - recon image */
    getOutput() {
        return this.output;
    }

    getPatchInfo() {
        return this.patchinfo;
    }

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
     * @param{Number} slice - slice to extract -- 1D
     * @param{Number} frame - frame index for patch
     * @param{Number} row - row index for patch
     * @param{Number} col - col index for patch
     * @returns{TypedArray} - the patch (temporary)
     */
    extractPatch(slice,frame,row,col,batchindex=0) {

        if (this.patch===null) {
            throw new Error('Call allocate Patch before');
        }
        
        let dims=this.input.getDimensions();
        let minslice=slice-this.patchinfo.thickness;
        let maxslice=slice+this.patchinfo.thickness;
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
            console.log(`+++ read patch  slice=${slice}/${frame}, sl=${sl}, i=${limits.begini}:${limits.endi}, j=${limits.beginj}:${limits.endj}, batchindex=${batchindex}`);

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
     * @param{Number} slice - slice to extract 
     * @param{Number} frame - slice to extract 
     * @param{Number} row - row index for patch
     * @param{Number} col - col index for patch
     * @returns{Boolean} - true if success
     */
    storePatch(patcharray,slice,frame,row,col,batchindex=0) {
        

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
        
        let index=(jminextra*this.patchinfo.width)+batchindex*this.patchinfo.patchvolumesize;
        console.log(`+++ write patch i=${limits.imin}:${limits.imax}, j=${limits.jmin}:${limits.jmax}, slice=${slice}/${frame}, index=${batchindex}`);
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

    recon(tf) {

        
        this.createPatch(1);

        let shape=this.model.inputs[0].shape;
        shape[0]=this.patchinfo.batchsize;
        console.log('Model Input Shape=',shape);
        
        let dims=this.input.getDimensions();
        
        for (let frame=0;frame<dims[3]*dims[4];frame++) {
            for (let slice=0;slice<dims[2];slice++) {
                for (let row=0;row<this.patchinfo.numrows;row++) {
                    for (let col=0;col<this.patchinfo.numcols;col++) {
                        tf.tidy( () => {
                            let patch=this.extractPatch(slice,frame,row,col);
                            const tensor= tf.tensor(patch, shape);
                            console.log('Calling Model',tensor.shape);
                            const output=this.model.predict(tensor);
                            const predict0=output.as1D();
                            const predict=predict0.dataSync();
                            this.storePatch(predict,slice,frame,row,col);
                        });
                    }
                }
            }
        }

        console.log('numTensors (outside tidy): ' + tf.memory().numTensors);
        this.cleanup();
        return this.getOutput();
    }

    batchRecon(tf,batchsize=4) {

        if (batchsize<2)
            return this.recon(tf);
        
        this.createPatch(batchsize);
        let shape=this.model.inputs[0].shape;
        //console.log('Model Input Shape=',shape);
        
        let dims=this.input.getDimensions();
        let objlist=[];

        // Create patchlist
        for (let frame=0;frame<dims[3]*dims[4];frame++) {
            for (let slice=0;slice<dims[2];slice++) {
                for (let row=0;row<this.patchinfo.numrows;row++) {
                    for (let col=0;col<this.patchinfo.numcols;col++) {
                        objlist.push([ frame,slice,row,col]);
                    }
                }
            }
        }

        //        console.log('+++ Working on ',objlist.length,'patches, batchsize=',batchsize);

        for (let pindex=0;pindex<objlist.length;pindex+=batchsize) {
            
            let numpatches=objlist.length-pindex;
            
            if (numpatches<batchsize)
                this.createPatch(numpatches);
            else
                numpatches=batchsize;

            console.log(`+++ Beginning batch of size ${numpatches} at ${pindex}.`);
            
            for (let inner=0;inner<numpatches;inner++) {
                let elem=objlist[pindex+inner];
                this.extractPatch(elem[0],elem[1],elem[2],elem[3],inner);
            }

            let patch=this.getPatch();
            shape[0]=numpatches;
                  
            tf.tidy( () => {
                console.log('++++ creating tensor',shape,'patch=',patch.length);
                const tensor= tf.tensor(patch, shape);

                console.log('Calling Model',tensor.shape);
                const output=this.model.predict(tensor);
                const predict=output.as1D().dataSync();

                for (let inner=0;inner<numpatches;inner++) {
                    let elem=objlist[pindex+inner];
                    this.storePatch(predict,elem[0],elem[1],elem[2],elem[3],inner);
                }
            });
        }
        this.cleanup();
        return this.getOutput();
    }
}

let loadAndWarmUpModel=function(tf,URL) {

    console.log('___ In Load Model',URL);
    const MODEL_URL =  URL+'/tensorflowjs_model.pb';
    const WEIGHTS_URL = URL+'/weights_manifest.json';

    return new Promise( (resolve,reject) => {
        tf.loadFrozenModel(MODEL_URL, WEIGHTS_URL).then( (model) => {
    
            let shape=model.inputs[0].shape;
            shape[0]=1;
            tf.tidy( () => {
                console.log('___ Warp up model ',shape);
                model.predict(tf.fill(shape,0,'float32'));
                console.log('___ Warm up done');
            });
            
            resolve(model);
        }).catch( (e) => {
            console.log('___ Model load from',URL,'failed');
            reject(e);
        });
    });

};
    

module.exports = {
    BisWebTensorFlowRecon : BisWebTensorFlowRecon,
    loadAndWarmUpModel : loadAndWarmUpModel
};
