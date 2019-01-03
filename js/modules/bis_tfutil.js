const BisWebImage=require('bisweb_image');

class BisWebTensorFlowRecon { 
    /** Get Patch Info for tensorflow.js 
     * @param{BisWebImage} img - width of patch (should be power of 2)
     * @param{Model} model - tensorflow model
     * @param{Number} padding - padding for stride increment
     * @param{Number} batchsize - size of batch
     * @returns{Object} - patch info
     */
    constructor(input,model,padding=16,batchsize=1) {

        this.input=input;
        this.output=new BisWebImage();
        this.output.cloneImage(this.input);
        this.model=model;
        
        let shape=model.inputs[0].shape;

        console.log('+++ Initializing', this.input.getDimensions(), ' model=', shape);
        
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

        if (batchsize <0) 
            batchsize=dimx*dimy;


        
        this.patchinfo={
            'batchsize' : batchsize,
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
        console.log('PatchInfo=',this.patchinfo);
    }

    createPatch() {
        this.patchinfo.patchslicesize=this.patchinfo.width*this.patchinfo.height*this.patchinfo.batchsize;
        this.patch= new Float32Array(this.patchinfo.patchslicesize*this.patchinfo.numslices);//this.internal.imginfo.type(width*height*numslices);
        console.log('+++ Created patch temp array ',this.patch.length,'( ',this.patchinfo.patchslicesize,'*',this.patchinfo.numslices,')');
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

        let dims=this.input.getDimensions();
        let numslices=this.patchinfo.numslices;
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
            let index=(slice-minslice)*this.patchinfo.patchslicesize+batchindex;
            console.log(`+++ extract patch  slice=${slice}/${frame}, sl=${sl}, i=${limits.begini}:${limits.endi}, j=${limits.beginj}:${limits.endj}, batchindex=${batchindex} offset=${limits.offset}, index=${index}`);

            let iextra=0;
            if (limits.endi>=dims[0]) {
                iextra=(limits.endi-(dims[0]-1))*batchsize;
                limits.endi=dims[0]-1;
            }
            
            for (let j=limits.beginj;j<=limits.endj;j++) {
                let joffset=j*dims[0]+limits.offset+limits.begini;
                for (let i=limits.begini;i<=limits.endi;i++) {
                    this.patch[index]=imagedata[joffset];
                    joffset++;
                    index+=batchsize;
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
            jminextra=(limits.jmin-limits.beginj)*batchsize;
        if (limits.imin>limits.begini)
            iminextra=(limits.imin-limits.begini)*batchsize;
        if (limits.imax<limits.endi)
            imaxextra=(limits.endi-limits.imax)*batchsize;
        
        let index=(jminextra*this.patchinfo.width)+batchindex;
        console.log(`+++ set patch i=${limits.begini}:${limits.endi} ${limits.imin}:${limits.imax}, j=${limits.beginj}:${limits.endj}, ${limits.jmin}:${limits.jmax}, slice=${slice}/${frame}, index=${batchindex}`);
        let imagedata=this.output.getImageData();

        for (let j=limits.jmin;j<=limits.jmax;j++) {
            let joffset=j*dims[0]+limits.offset+limits.imin;
            index+=iminextra;
            for (let i=limits.imin;i<=limits.imax;i++)  {
                imagedata[joffset]=patcharray[index];
                joffset++;
                index+=batchsize;
            }
            index+=imaxextra;
        }
        return true;
    }

    simpleRecon(tf,dummy=false) {

        if (this.patchinfo.batchsize>1) {
            console.log("Changing batchsize to 1 , called simpleRecon");
            this.patchinfo.batchsize=1;
        }
        this.createPatch();
        
        let shape=this.model.inputs[0].shape;
        shape[0]=this.patchinfo.batchsize;
        console.log('Model Input Shape=',shape);
        
        let dims=this.input.getDimensions();

        for (let frame=0;frame<dims[3]*dims[4];frame++) {
            for (let slice=0;slice<dims[2];slice++) {
                for (let row=0;row<this.patchinfo.numrows;row++) {
                    for (let col=0;col<this.patchinfo.numcols;col++) {
                        
                        console.log('Working on part ',slice,'/',dims[2],'row=',row,'col=',col);
                        let patch=this.extractPatch(slice,frame,row,col);
                        const tensor= tf.tensor(patch, shape);
                        let predict=null;
                        if (!dummy) {
                            console.log('Calling Model',tensor.shape);
                            const output=this.model.predict(tensor);
                            console.log('Output = ',output.shape);
                            predict=output.as1D().dataSync();
                        } else {
                            predict=tensor.as1D().dataSync();
                        }
                        
                        this.storePatch(predict,slice,frame,row,col);
                    }
                }
            }
        }
        this.cleanup();
        return this.getOutput();
    }

    complexRecon(tf,dummy=false) {

        this.createPatch();
        
        let shape=this.model.inputs[0].shape;
        shape[0]=this.patchinfo.batchsize;
        console.log('Model Input Shape=',shape);
        
        let dims=this.input.getDimensions();
        
        for (let frame=0;frame<dims[3]*dims[4];frame++) {
            for (let slice=0;slice<dims[2];slice++) {
                
                for (let row=0;row<this.patchinfo.numrows;row++) {
                    for (let col=0;col<this.patchinfo.numcols;col++) {
                        console.log('Working on part ',slice,'/',dims[2],'row=',row,'col=',col);
                        this.extractPatch(slice,frame,row,col,row*this.patchinfo.numcols+col);
                    }
                }

                let patch=this.getPatch();
                const tensor= tf.tensor(patch, shape);
                let predict=null;
                if (!dummy) {
                    console.log('Calling Model',tensor.shape,shape,patch.length);
                    const output=this.model.predict(tensor);
                    console.log('Output = ',output.shape);
                    predict=output.as1D().dataSync();
                } else {
                    predict=tensor.as1D().dataSync();
                }
                
                for (let row=0;row<this.patchinfo.numrows;row++) {
                    for (let col=0;col<this.patchinfo.numcols;col++) {
                        console.log('Storing part ',slice,'/',dims[2],'row=',row,'col=',col);
                        this.storePatch(predict,slice,frame,row,col,row*this.patchinfo.numcols+col);
                    }
                }
            }
        }
        this.cleanup();
        return this.getOutput();
    }
}


module.exports = {
    BisWebTensorFlowRecon : BisWebTensorFlowRecon,
};
