const BisWebImage=require('bisweb_image');

class BisWebTensorFlowRecon { 
    /** Get Patch Info for tensorflow.js 
     * @param{BisWebImage} img - width of patch (should be power of 2)
     * @param{Number} width - width of patch (should be power of 2)
     * @param{Number} stridex - stride size (should be even and less than width)
     * @param{Number} thickness - for 2.5d models default is 0
     * @param{Number} height - if different than width 
     * @param{Number} stridey - if different than stridey 
     * @returns{Object} - patch info
     */
    constructor(input,width,stridex=null,thickness=0,height=null,stridey=null) {

        this.input=input;
        this.output=new BisWebImage();
        this.output.cloneImage(this.input);

        if (stridex==null)
            stridex=width;
        
        if (height===null)
            height=width;
        if (stridey===null)
            stridey=stridex;

        if (stridey>height)
            stridey=height;
        if (stridex>width)
            stridex=width;

        let dims=this.input.getDimensions();
        let dimx=Math.floor(dims[0]/stridex);
        if (dims[0]%width>0)
            dimx+=1;

        let dimy=Math.floor(dims[1]/stridey);
        if (dims[1]%height>0)
            dimy+=1;

        let numslices=2*thickness+1;


        
        this.patchinfo={
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
        this.patch= new Float32Array(width*height*numslices);//this.internal.imginfo.type(width*height*numslices);
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
        
        let patchinfo=this.patchinfo;
        
        let begini=col*patchinfo.stridex;
        let endi=begini+patchinfo.width-1;
        let beginj=row*patchinfo.stridey;
        let endj=beginj+patchinfo.height-1;

        let obj = { 
            begini : begini,
            endi : endi,
            beginj : beginj,
            endj : endj,
            offset : offset

        };
        
        if (store) {

            let midx=Math.floor((patchinfo.width-patchinfo.stridex)*0.5);
            let midy=Math.floor((patchinfo.height-patchinfo.stridey)*0.5);
            
            if (col>0)
                obj.imin=begini+midx;
            else
                obj.imin=begini;
            
            if (row>0)
                obj.jmin=beginj+midy;
            else
                obj.jmin=beginj;

            if (col<patchinfo.numcols-1)
                obj.imax=endi-midx;
            else
                obj.imax=endi;
            
            if (row<patchinfo.numrows-1)
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
    getPatch(slice,frame,row,col) {

        let patchinfo=this.patchinfo;
        let patch=this.patch;
        let dims=this.input.getDimensions();
        let numslices=patchinfo.numslices;
        let minslice=slice-patchinfo.thickness;
        let maxslice=slice+patchinfo.thickness;


        let l=patch.length;
        for (let i=0;i<l;i++)
            patch[i]=0;

        let imagedata=this.input.getImageData();
        
        for (let slice=minslice;slice<=maxslice;slice++) {
            let sl=slice;
            if (sl<0)
                sl=0;
            if (sl>=dims[2])
                sl=dims[2]-1;

            let limits=this.getPatchLimits(sl,frame,row,col,false);

            let index=(slice-minslice);
            console.log(`+++ get patch  slice=${slice}/${frame}, sl=${sl}, i=${limits.begini}:${limits.endi}, j=${limits.beginj}:${limits.endj}, offset=${limits.offset}, index=${index}`);

            let iextra=0;
            if (limits.endi>=dims[0]) {
                iextra=(limits.endi-(dims[0]-1));
                limits.endi=dims[0]-1;
            }
            
            for (let j=limits.beginj;j<=limits.endj;j++) {
                let joffset=j*dims[0]+limits.offset+limits.begini;
                for (let i=limits.begini;i<=limits.endi;i++) {
                    patch[index]=imagedata[joffset];
                    joffset++;
                    index+=numslices;
                }
                index+=(numslices*iextra);
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
    storePatch(patcharray,slice,frame,row,col) {
        
        let patchinfo=this.patchinfo;
        let limits=this.getPatchLimits(slice,frame,row,col,true);
        let dims=this.output.getDimensions();
        
        let jminextra=0,iminextra=0,imaxextra=0;
        if (limits.jmin>limits.beginj)
            jminextra=(limits.jmin-limits.beginj);
        if (limits.imin>limits.begini)
            iminextra=(limits.imin-limits.begini);
        if (limits.imax<limits.endi)
            imaxextra=(limits.endi-limits.imax);
        
        let index=(jminextra*patchinfo.width);
        console.log(`+++ set patch i=${limits.imin}:${limits.imax}, j=${limits.jmin}:${limits.jmax}, slice=${slice}/${frame}, index=${index}`);
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

    simpleRecon(tf,model) {

        let shape=model.inputs[0].shape;
        let patchsize=shape[1];
        console.log('Model Input Shape=',shape,' Patch size=',patchsize);
        
        let dims=this.input.getDimensions();

        //let patcher=new BisWebTensorFlowRecon(img,patchsize,patchsize-padding);
        let patchinfo=this.patchinfo;
    
        for (let frame=0;frame<dims[3]*dims[4];frame++) {
            for (let slice=0;slice<dims[2];slice++) {
                for (let row=0;row<patchinfo.numrows;row++) {
                    for (let col=0;col<patchinfo.numcols;col++) {
                        
                        console.log('Working on part ',slice,'/',dims[2],'row=',row,'col=',col);
                        let patch=this.getPatch(slice,frame,row,col);
                        const tensor= tf.tensor(patch, [ 1, patchsize,patchsize ]);
                        let dummy=false,predict=null;
                        if (!dummy) {
                            console.log('Calling Model',tensor.shape);
                            const output=model.predict(tensor);
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
};


module.exports = {
    BisWebTensorFlowRecon : BisWebTensorFlowRecon,
};
