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

"use strict";

// ------------------------------------------------------------------------------------------
// Boilerplate at top
// -----------------------------------------------------------------------------
/** 
 * @file Browser or Node.js module. Contains {@link BisImageSmoothReslice}.
 * @author Xenios Papademetris
 * @version 1.0
 */


/**
 * A set of image ({@link BisImage} processing functions that are used by registration code.
 * @namespace BisImageSmoothReslice
 */


const util=require('bis_util');
const transformationFactory=require('bis_transformationutil');
const BisWebImage=require('bisweb_image');


// ---------------------------------------------------------------------
// SMOOTHING CODE
// ---------------------------------------------------------------------
var generateKernel = function (sigma,radius) {
    
    var len=radius*2+1;
    var kernel=new Float32Array(len);
    var i=0,sum=0.0;
    for (i=0;i<len;i++) {
        kernel[i]=Math.exp((-0.5*Math.pow(i-radius,2.0))/Math.pow(sigma,2.0));
        sum=sum+kernel[i];
    }
    for (i=0;i<len;i++)
        kernel[i]=kernel[i]/sum;
    return kernel;
};

// axis=0 (X),1=Y, 2=Z
var oneDConvolution = function(imagedata_in,imagedata_out,dim,kernel,radius,axis,vtkboundary=false) {

    var sum,index=0,coord,ia,ib,ic,tau,fixedtau;
    var slicesize=dim[0]*dim[1];

    var offsets = [ 1,dim[0],slicesize];
    var axes =    [ 0,1,2 ];
    if (axis==1) 
        axes = [ 1,0,2];
    else if (axis==2)
        axes = [ 2,0,1 ];

    var newdim = [ 0,0,0],newoffsets=[0,0,0];
    for (var i=0;i<=2;i++) {
        newdim[i]=dim[axes[i]];
        newoffsets[i]=offsets[axes[i]];
    }
    var newdim0minus=newdim[0]-1;
    var maxia=newdim[0]-radius;

    var volsize=dim[0]*dim[1]*dim[2];
    
    for (var frame=0;frame<dim[3];frame++) {
        for (ic=0;ic<newdim[2];ic++) {
            for (ib=0;ib<newdim[1];ib++) {
                index=ic*newoffsets[2]+ib*newoffsets[1]+frame*volsize;
                
                for (ia=0;ia<newdim[0];ia++) {
                    
                    sum=0.0;
                    if (ia>=radius && ia<maxia) {
                        for (tau=-radius;tau<=radius;tau++) {
                            var v=kernel[tau+radius]*imagedata_in[index+tau*newoffsets[0]];
                            sum+=v;
                        }
                    } else if (vtkboundary===false) {
                        for (tau=-radius;tau<=radius;tau++) {
                            coord=tau+ia;
                            fixedtau=tau;
                            
                            if (coord<0) 
                                fixedtau=-ia;
                            else if (coord>newdim0minus) 
                                fixedtau=newdim0minus-ia;
                            
                            sum+=kernel[tau+radius]*imagedata_in[index+fixedtau*newoffsets[0]];
                        }
                    } else {
                        let sumw=0.0;
                        for (let tau=-radius;tau<=radius;tau++) {
                            coord=tau+ia;
                            if (coord>=0 && coord<=newdim0minus)  {
                                let fixedtau=tau;
                                sum+=kernel[tau+radius]*imagedata_in[index+fixedtau*newoffsets[0]];
                                sumw+=kernel[tau+radius];
                            }
                        }
                        if (sumw>0.0)
                            sum=sum/sumw;
                    }
                    imagedata_out[index]=sum; 
                    index=index+newoffsets[0];
                }
            }
        }
    }
};

/** 
 * This function performs gaussian image smoothing. The output is the smoothed image. Can handle 3D or 4D images.
 * @alias BisImageSmoothReslice.smoothImage
 * @param {BisImage} input - the input image
 * @param {array} sigmas - the standard deviations of the filter [ sigma_x,sigma_y,sigma_z] 
 * @param {boolean} inmm - if true sigmas are in mm else voxels (default = false)
 * @param {number} radiusfactor - filter size as function of sigma -- default =1.5
 * @param {object} outdata - diagnostic output data
 * @returns {BisImage} out - Smooth image
 */
var smoothImage = function(input, sigmas, inmm, radiusfactor,outdata,vtkboundary=false) {

    sigmas = sigmas || [ 1.0,1.0,1.0 ];
    inmm = inmm || false;
    radiusfactor = radiusfactor || 1.5;
    outdata = outdata || { };

    console.log('Sigmas=',sigmas,inmm,radiusfactor,vtkboundary);
    
    let output=new BisWebImage();
    let temp=new BisWebImage();
    output.cloneImage(input,{ type : 'float'});
    temp.cloneImage(input,{ type : 'float'});
    var input_data= input.getImageData();
    var output_data = output.getImageData();
    var temp_data = temp.getImageData();

    var dim=input.getDimensions();
    var spa=input.getSpacing();
    var len=input_data.length;

    var stdev=sigmas;
    if (inmm) 
        stdev= [ sigmas[0]/spa[0], sigmas[1]/spa[1],sigmas[2]/spa[2] ];


    
    var radii = [ 1,1,1];
    for (var i=0;i<=2;i++) {
        radii[i]=Math.floor(stdev[i]*radiusfactor);
        if (radii[i]<1)
            radii[i]=1;
    }
    //      console.log('stdev',stdev,radii,' inmm=',inmm)
    
    outdata.sigmas=stdev;

    var kernelx=generateKernel(stdev[0],radii[0]);
    var kernely=generateKernel(stdev[1],radii[1]);
    var kernelz=generateKernel(stdev[2],radii[2]);

    oneDConvolution(input_data,temp_data,dim,kernelx,radii[0],0,vtkboundary);
    oneDConvolution(temp_data,output_data,dim,kernely,radii[1],1,vtkboundary);

    if (dim[2]>1) {
        for(var j=0;j<len;j++)
            temp_data[j]=output_data[j];
        oneDConvolution(temp_data,output_data,dim,kernelz,radii[2],2,vtkboundary);
    } else {
        console.log('2d smoothing ...');
    }
    return output;
};

// ------------------------------------------------------------------------------------------------
// Interpolation Functions -- cache is defined below in resliceImage.
// cache is an objet so it is always passed in by pointer
// ------------------------------------------------------------------------------------------------
var linearInterpolationFunction4D=function(cache) {

    var data=cache.input_data;
    
    var B00=cache.TX[0] | 0;
    var B01=B00+1;
    var W00=B01-cache.TX[0];
    var W01=1.0-W00;
    
    var B10=cache.TX[1] | 0;
    var B11=B10+1;
    var W10=B11-cache.TX[1];
    var W11=1.0-W10;
    
    B10*=cache.dim0;
    B11*=cache.dim0;

    var B20=cache.TX[2] | 0;
    var B21=B20+1;
    var W20=B21-cache.TX[2];
    var W21=1.0-W20;
    
    B20=B20*cache.slicesize+cache.offset;
    B21=B21*cache.slicesize+cache.offset;

    return (W20*W10*W00*data[B20+B10+B00]+
            W20*W10*W01*data[B20+B10+B01]+
            W20*W11*W00*data[B20+B11+B00]+
            W20*W11*W01*data[B20+B11+B01]+
            W21*W10*W00*data[B21+B10+B00]+
            W21*W10*W01*data[B21+B10+B01]+
            W21*W11*W00*data[B21+B11+B00]+
            W21*W11*W01*data[B21+B11+B01]);
};

var linearInterpolationFunction=function(cache) {

    var data=cache.input_data;
    
    var B00=cache.TX[0] | 0;
    var B01=B00+1;
    var W00=B01-cache.TX[0];
    var W01=1.0-W00;
    
    var B10=cache.TX[1] | 0;
    var B11=B10+1;
    var W10=B11-cache.TX[1];
    var W11=1.0-W10;
    
    B10*=cache.dim0;
    B11*=cache.dim0;

    var B20=cache.TX[2] | 0;
    var B21=B20+1;
    var W20=B21-cache.TX[2];
    var W21=1.0-W20;
    
    B20=B20*cache.slicesize;
    B21=B21*cache.slicesize;

    return (W20*W10*W00*data[B20+B10+B00]+
            W20*W10*W01*data[B20+B10+B01]+
            W20*W11*W00*data[B20+B11+B00]+
            W20*W11*W01*data[B20+B11+B01]+
            W21*W10*W00*data[B21+B10+B00]+
            W21*W10*W01*data[B21+B10+B01]+
            W21*W11*W00*data[B21+B11+B00]+
            W21*W11*W01*data[B21+B11+B01]);


};

// Test this ...
var linearInterpolationFunction2D=function(cache) {
    
    var data=cache.input_data;
    
    var B00=cache.TX[0] | 0;
    var B01=B00+1;
    var W00=B01-cache.TX[0];
    var W01=1.0-W00;
    
    var B10=cache.TX[1] | 0;
    var B11=B10+1;
    var W10=B11-cache.TX[1];
    var W11=1.0-W10;
    
    B10*=cache.dim0;
    B11*=cache.dim0;

    return (W10*W00*data[B10+B00]+
            W10*W01*data[B10+B01]+
            W11*W00*data[B11+B00]+
            W11*W01*data[B11+B01]+
            W10*W00*data[B10+B00]+
            W10*W01*data[B10+B01]+
            W11*W00*data[B11+B00]+
            W11*W01*data[B11+B01]);
};

var nearestInterpolationFunction=function(cache) {
    return cache.input_data[Math.round(cache.TX[2])*cache.slicesize+
                            Math.round(cache.TX[1])*cache.dim0+
                            Math.round(cache.TX[0])+cache.offset];
};


/*    var cubicInterpolationFunction=function(cache) {
      var ia,ja,ka,sum=0.0;
      
      for (ia=0;ia<=2;ia++) {
      cache.B[ia][1]=cache.TX[ia] | 0;
      cache.B[ia][0]=cache.B[ia][1]-1;
      
      if (cache.B[ia][0]<0)
      cache.B[ia][0]=0;
      
      cache.B[ia][2]=cache.B[ia][1]+1;
      cache.B[ia][3]=cache.B[ia][1]+2;
      if (cache.B[ia][2]>cache.minusdim[ia]) {
      cache.B[ia][2]=cache.minusdim[ia];
      cache.B[ia][3]=cache.minusdim[ia];
      } else if (cache.B[ia][3]>cache.minusdim[ia]) {
      cache.B[ia][3]=cache.minusdim[ia];
      }

      // cubic interpolation from VTK
      var f=cache.TX[ia]-cache.B[ia][1];
      var fm1 = f - 1;
      var fd2 = f*0.5;
      var ft3 = f*3.0;
      cache.W[ia][0] = -fd2*fm1*fm1;
      cache.W[ia][1] = ((ft3 - 2)*fd2 - 1)*fm1;
      cache.W[ia][2] = -((ft3 - 4)*f - 1)*fd2;
      cache.W[ia][3] = f*fd2*fm1;
      }

      cache.B[1][0]*=cache.dim0;    cache.B[1][1]*=cache.dim0;
      cache.B[1][2]*=cache.dim0;    cache.B[1][3]*=cache.dim0;
      cache.B[2][0]*=cache.slicesize;       cache.B[2][1]*=cache.slicesize;
      cache.B[2][2]*=cache.slicesize;       cache.B[2][3]*=cache.slicesize;

      for (ka=0;ka<=3;ka++) 
      for (ja=0;ja<=3;ja++) 
      for (ia=0;ia<=3;ia++) 
      sum+=cache.W[2][ka]*cache.W[1][ja]*cache.W[0][ia]*cache.input_data[cache.B[2][ka]+cache.B[1][ja]+cache.B[0][ia]];

      return sum;
      };*/

var cubicInterpolationFunction = function(cache) {

    var data=cache.input_data;
    var TX0=cache.TX[0],TX1=cache.TX[1],TX2=cache.TX[2];
    var minusdim0=cache.minusdim[0];
    var minusdim1=cache.minusdim[1];
    var minusdim2=cache.minusdim[2];

    var f,fm1,fd2,ft3;

    // X-Coordinate
    var B01=TX0|0;
    var B00=B01-1;
    if (B00<0)
        B00=0;
    var B02=B01+1;
    var B03=B01+2;
    if (B02>minusdim0) {
        B02=minusdim0;
        B03=minusdim0;
    } else if (B03>minusdim0) {
        B03=minusdim0;
    }
    
    f=TX0-B01;
    fm1 = f - 1;
    fd2 = f*0.5;
    ft3 = f*3.0;
    var W00 = -fd2*fm1*fm1;
    var W01 = ((ft3 - 2)*fd2 - 1)*fm1;
    var W02 = -((ft3 - 4)*f - 1)*fd2;
    var W03 = f*fd2*fm1;
    

    // Y-Coordinate
    var B11=TX1 | 0;
    var B10=B11-1;
    if (B10<0)
        B10=0;
    var B12=B11+1;
    var B13=B11+2;
    if (B12>minusdim1) {
        B12=minusdim1;
        B13=minusdim1;
    } else if (B13>minusdim1) {
        B13=minusdim1;
    }
    
    f=TX1-B11;
    fm1 = f - 1;
    fd2 = f*0.5;
    ft3 = f*3.0;
    var W10 = -fd2*fm1*fm1;
    var W11 = ((ft3 - 2)*fd2 - 1)*fm1;
    var W12 = -((ft3 - 4)*f - 1)*fd2;
    var W13 = f*fd2*fm1;
    
    // Z-Coordinate
    var B21=TX2 | 0;
    var B20=B21-1;
    if (B20<0)
        B20=0;
    var B22=B21+1;
    var B23=B21+2;
    if (B22>minusdim2) {
        B22=minusdim2;
        B23=minusdim2;
    } else if (B23>minusdim2) {
        B23=minusdim2;
    }
    
    f=TX2-B21;
    fm1 = f - 1;
    fd2 = f*0.5;
    ft3 = f*3.0;
    var W20 = -fd2*fm1*fm1;
    var W21 = ((ft3 - 2)*fd2 - 1)*fm1;
    var W22 = -((ft3 - 4)*f - 1)*fd2;
    var W23 = f*fd2*fm1;

    // Scale by raster-size
    B10*=cache.dim0;        B11*=cache.dim0;
    B12*=cache.dim0;        B13*=cache.dim0;
    B20=B20*cache.slicesize+cache.offset;
    B21=B21*cache.slicesize+cache.offset;
    B22=B22*cache.slicesize+cache.offset;
    B23=B23*cache.slicesize+cache.offset;
    
    return  W20*W10*W00*data[B20+B10+B00]+      W20*W10*W01*data[B20+B10+B01]+
        W20*W10*W02*data[B20+B10+B02]+          W20*W10*W03*data[B20+B10+B03]+
        W20*W11*W00*data[B20+B11+B00]+          W20*W11*W01*data[B20+B11+B01]+
        W20*W11*W02*data[B20+B11+B02]+          W20*W11*W03*data[B20+B11+B03]+
        W20*W12*W00*data[B20+B12+B00]+          W20*W12*W01*data[B20+B12+B01]+
        W20*W12*W02*data[B20+B12+B02]+          W20*W12*W03*data[B20+B12+B03]+
        W20*W13*W00*data[B20+B13+B00]+          W20*W13*W01*data[B20+B13+B01]+
        W20*W13*W02*data[B20+B13+B02]+          W20*W13*W03*data[B20+B13+B03]+
        W21*W10*W00*data[B21+B10+B00]+          W21*W10*W01*data[B21+B10+B01]+
        W21*W10*W02*data[B21+B10+B02]+          W21*W10*W03*data[B21+B10+B03]+
        W21*W11*W00*data[B21+B11+B00]+          W21*W11*W01*data[B21+B11+B01]+
        W21*W11*W02*data[B21+B11+B02]+          W21*W11*W03*data[B21+B11+B03]+
        W21*W12*W00*data[B21+B12+B00]+          W21*W12*W01*data[B21+B12+B01]+
        W21*W12*W02*data[B21+B12+B02]+          W21*W12*W03*data[B21+B12+B03]+
        W21*W13*W00*data[B21+B13+B00]+          W21*W13*W01*data[B21+B13+B01]+
        W21*W13*W02*data[B21+B13+B02]+          W21*W13*W03*data[B21+B13+B03]+
        W22*W10*W00*data[B22+B10+B00]+          W22*W10*W01*data[B22+B10+B01]+
        W22*W10*W02*data[B22+B10+B02]+          W22*W10*W03*data[B22+B10+B03]+
        W22*W11*W00*data[B22+B11+B00]+          W22*W11*W01*data[B22+B11+B01]+
        W22*W11*W02*data[B22+B11+B02]+          W22*W11*W03*data[B22+B11+B03]+
        W22*W12*W00*data[B22+B12+B00]+          W22*W12*W01*data[B22+B12+B01]+
        W22*W12*W02*data[B22+B12+B02]+          W22*W12*W03*data[B22+B12+B03]+
        W22*W13*W00*data[B22+B13+B00]+          W22*W13*W01*data[B22+B13+B01]+
        W22*W13*W02*data[B22+B13+B02]+          W22*W13*W03*data[B22+B13+B03]+
        W23*W10*W00*data[B23+B10+B00]+          W23*W10*W01*data[B23+B10+B01]+
        W23*W10*W02*data[B23+B10+B02]+          W23*W10*W03*data[B23+B10+B03]+
        W23*W11*W00*data[B23+B11+B00]+          W23*W11*W01*data[B23+B11+B01]+
        W23*W11*W02*data[B23+B11+B02]+          W23*W11*W03*data[B23+B11+B03]+
        W23*W12*W00*data[B23+B12+B00]+          W23*W12*W01*data[B23+B12+B01]+
        W23*W12*W02*data[B23+B12+B02]+          W23*W12*W03*data[B23+B12+B03]+
        W23*W13*W00*data[B23+B13+B00]+          W23*W13*W01*data[B23+B13+B01]+
        W23*W13*W02*data[B23+B13+B02]+          W23*W13*W03*data[B23+B13+B03];
};


// ------------------------------------------------------------------------------------------------
// Reslice Image
// ------------------------------------------------------------------------------------------------
/** 
 * This function performs resampling of the image (NN or linear interpolation). The output is the resampled image.
 * This can handle 3D or 4D images.
 * @alias BisImageSmoothReslice.resliceImage
 * @param {BisImage} input - the input image
 * @param {BisImage} output - the output image (pre supplied)
 * @param {BisTransformation} transformation - the transformation 
 * @param {number} interpolation - 0=NN, 3=Cubic, else linear
 * @param {array} bounds - 6 array for specifying a piece to reslice (in-place). Default = [ 0,odim[0]-1,0,odim[1]-1,0,odim[2]-1 ], where odim=output.getDimensions().
 * @param {Number} background - fill in outside the range
 */

var resliceImage = function(input, output, transformation, interpolation,bounds,background=0) {
    
    bounds = bounds || null;
    transformation = transformation || null;
    if (interpolation!==0)
        interpolation = interpolation || 1;

    var dim= input.getDimensions();
    var spa=input.getSpacing();
    var newdim=output.getDimensions();
    var newslicesize = newdim[0]*newdim[1];
    var newvolsize = newdim[0]*newdim[1]*newdim[2];

    var newspa=output.getSpacing();
    var input_data = input.getImageData();
    var output_data = output.getImageData();
    var maxdvox = [ dim[0]-1,dim[1]-1,dim[2]-1 ];
    var volsize=dim[0]*dim[1]*dim[2];
    
    var cache = {
        TX : [ 0,0,0],
        slicesize  : dim[0]*dim[1],
        input_data : input_data,
        dim0 : dim[0],
        minusdim : [ dim[0]-1,dim[1]-1,dim[2]-1 ],
        offset :0,
    };

    
    if (bounds===null) 
        bounds = [ 0,newdim[0]-1,0,newdim[1]-1,0,newdim[2]-1 ];

    console.log('Using bounds=',bounds,'interp=',interpolation,'back=',background,'outspa=',newspa,'outdim=',newdim);
    
    var interpolateFunction=linearInterpolationFunction;
    if (dim[2]<2)
        interpolateFunction=linearInterpolationFunction2D;
    if (dim[3]>1)
        interpolateFunction=linearInterpolationFunction4D;

    if (interpolation === 3 )  {
        interpolateFunction=cubicInterpolationFunction;
    }

    if (interpolation === 0)
        interpolateFunction=nearestInterpolationFunction;

    try {
        transformation.optimize(spa);
    } catch(e) {
        console.log('');
    }
    var X=[0,0,0],i,j,k,outindex=0,outbase,frame;


    if (dim[3]>1) {
        for (k=bounds[4];k<=bounds[5];k++) {
            X[2]=k*newspa[2];
            outbase=k*newslicesize+bounds[0];
            for (j=bounds[2];j<=bounds[3];j++) {
                X[1]=j*newspa[1];
                outindex=j*newdim[0]+outbase;
                for (i=bounds[0];i<=bounds[1];i++) {
                    X[0]=i*newspa[0];
                    transformation.transformPointToVoxel(X,cache.TX,spa);
                    if (cache.TX[2]>=0 && cache.TX[2] < maxdvox[2] &&
                        cache.TX[1]>=0 && cache.TX[1] < maxdvox[1] &&
                        cache.TX[0]>=0 && cache.TX[0] < maxdvox[0]) {
                        for (frame=0;frame<dim[3];frame++) {
                            cache.offset=volsize*frame;
                            output_data[outindex+frame*newvolsize]=interpolateFunction(cache);
                        }
                    } else if (cache.TX[2]>=0 && cache.TX[2] <= maxdvox[2] &&
                               cache.TX[1]>=0 && cache.TX[1] <= maxdvox[1] &&
                               cache.TX[0]>=0 && cache.TX[0] <= maxdvox[0]) {
                        if (cache.TX[0]===maxdvox[0])
                            cache.TX[0]=cache.TX[0]-0.00001;
                        if (cache.TX[1]===maxdvox[1])
                            cache.TX[1]=cache.TX[1]-0.00001;
                        if (cache.TX[2]===maxdvox[2])
                            cache.TX[2]=cache.TX[2]-0.00001;
                        for (frame=0;frame<dim[3];frame++) {
                            cache.offset=volsize*frame;
                            output_data[outindex+frame*newvolsize]=interpolateFunction(cache);
                        }
                    } else {
                        for (frame=0;frame<dim[3];frame++)
                            output_data[outindex+frame*newvolsize]=background;
                    }
                    outindex++;
                }
            }
        }
    } else {
        for (k=bounds[4];k<=bounds[5];k++) {
            X[2]=k*newspa[2];
            outbase=k*newslicesize+bounds[0];
            for (j=bounds[2];j<=bounds[3];j++) {
                X[1]=j*newspa[1];
                outindex=j*newdim[0]+outbase;
                for (i=bounds[0];i<=bounds[1];i++) {
                    X[0]=i*newspa[0];
                    transformation.transformPointToVoxel(X,cache.TX,spa);
                    if (cache.TX[2]>=0 && cache.TX[2] < maxdvox[2] &&
                        cache.TX[1]>=0 && cache.TX[1] < maxdvox[1] &&
                        cache.TX[0]>=0 && cache.TX[0] < maxdvox[0]) {
                        output_data[outindex]=interpolateFunction(cache);
                    } else if (cache.TX[2]>=0 && cache.TX[2] <= maxdvox[2] &&
                               cache.TX[1]>=0 && cache.TX[1] <= maxdvox[1] &&
                               cache.TX[0]>=0 && cache.TX[0] <= maxdvox[0]) {
                        if (cache.TX[0]===maxdvox[0])
                            cache.TX[0]=cache.TX[0]-0.00001;
                        if (cache.TX[1]===maxdvox[1])
                            cache.TX[1]=cache.TX[1]-0.00001;
                        if (cache.TX[2]===maxdvox[2])
                            cache.TX[2]=cache.TX[2]-0.00001;
                        output_data[outindex]=interpolateFunction(cache);
                    } else  {
                        output_data[outindex]=background;
                    }
                    outindex++;
                }
            }
        }
    }

};

// ------------------------------------------------------------------------------------------------
// New Resample Image
// ------------------------------------------------------------------------------------------------
/** 
 * This function performs resampling of the image (NN or linear interpolation). The output is the resampled image.
 * This calls {@link BisImageSmoothReslice.resliceImage} with a null transformation. 
 * It can handle 3D or 4D images.
 * @alias BisImageSmoothReslice.resampleImage
 * @param {BisImage} input - the input image
 * @param {array} newspa - the new spacing of the image
 * @param {number} interpolation - 0=NN, 3=Cubic, else linear
 * @param {Number} background - fill in outside the range
 * @returns {BisImage} out - resampled image
 */
var resampleImage = function(input, newspa, interpolation,background=0) {

    var dim=input.getDimensions();
    var spa=input.getSpacing();
    var newdim = [ 0,0,0,dim[3]];
    for (var ia=0;ia<=2;ia++) {
        var sz=(dim[ia]-1)*spa[ia];
        newdim[ia]=Math.floor(sz/newspa[ia])+1;
    }
    var output=new BisWebImage();   output.cloneImage(input, { dimensions : newdim,  spacing : newspa });
    resliceImage(input,output,
                 transformationFactory.createLinearTransformation(),
                 interpolation,background);
    return output;
};

// ------------------------------------------------------------------------------------------------
// Normalize Image
// ------------------------------------------------------------------------------------------------
/** 
 * This function computes the range of an array based on the cdf function of its distribution
 * It returns the [ perlow, perhigh ] percentiles where perlow,perhigh are 0:1
 * @alias BisImageSmoothReslice.arrayRobustRange
 * @param {array} arr - the input array
 * @param {number} perlow - the low percentage of the cdf
 * @param {number} perhigh - the high percentage of the cdf 
 * @returns {array}  - [ tlow,thigh ] the robust range of the image
 */
var arrayRobustRange = function(arr,perlow,perhigh) {

    if (perlow!==0.0)
        perlow = util.range(perlow || 0.01,0.0,0.999);
    perhigh = util.range(perhigh || 0.99,perlow+0.001,1.0);

    var min=arr[0],max=arr[0],i=0;
    var total = arr.length;
    
    for (i=0;i<arr.length;i=i+1) {
        if (min>arr[i])
            min=arr[i];
        else if (max<arr[i])
            max=arr[i];
    }

    if (perlow ===0.0 && perhigh===1.0) {
        return [ min,max];
    }
    
    //      console.log(' perlow,perhigh=',[perlow,perhigh ], ' min,max=',[ min,max]);
    
    var numbins = 256;
    var diff=max-min;
    if (diff<0.001)
        diff=0.001;
    var scale=(numbins-1)/diff;
    var bins=new Uint32Array(numbins);

    //      console.log(" ... numbins=", numbins, " ... scale=" , scale, "\n");

    // Compute Histogram !!!
    for (i=0;i<arr.length;i=i+1)  
        bins[Math.floor(scale*(arr[i]-min))]+=1;

    //      for (var ia=10;ia<200;ia+=20)
    //          console.log("ia =" , ia , " = " , bins[ia] );

    
    /*      var cumulative=new Uint32Array(numbins);
            cumulative[0]=bins[0];
            for (i=1;i<numbins;i++)
            cumulative[i]=bins[i]+cumulative[i-1];*/

    var foundperlow=false,foundperhigh=false,tlow=min,thigh=max;
    var cumulative=0;
    
    for (i=0;i<numbins;i++) {
        cumulative=cumulative+bins[i];
        var v=cumulative/total;
        if (foundperlow===false) {
            if (v > perlow) {
                foundperlow=true;
                tlow=i/scale+min;
            }
        }
        
        if (foundperhigh===false) {
            
            if (v > perhigh) {
                foundperhigh=true;
                thigh=i/scale+min;
                i=numbins;
            }
        }

        
    }
    //      console.log('Robust range=',[ tlow, thigh]);
    return [ tlow, thigh ];
};


/** 
 * This function maps an input array to a normalized array. Values < tlow are set to 0, values > thigh are saturated to max, and linear
 * mapping is done in between.
 * @alias BisImageSmoothReslice.arrayNormalize
 * @param {array} arr - the input array
 * @param {array} newarr - the output array. Most be preallocated and of same size as arr
 * @param {number} tlow - the low threshold. Values below this are set to zero.
 * @param {number} thigh - the high threshold. Values above this go to newmaxvalue.
 * @param {number} newmaxvalue - maximum value of output array (min=0)
 */
var arrayNormalize = function(arr,newarr,tlow,thigh,newmaxvalue) {

    newmaxvalue = newmaxvalue || 64.0;
    var scale=newmaxvalue/(thigh-tlow);
    var newthigh=thigh-tlow;

    //      console.log('Normalize scale=',scale,' thr=',[tlow, thigh, newthigh ], ' newmaxvalue=',newmaxvalue);
    
    for (var i=0;i<newarr.length;i++) {
        var v=(arr[i]-tlow)+0.000;
        if (v>newthigh)
            v=newthigh;
        else if (v<0.0)
            v=0.0;
        newarr[i] = Math.floor(v*scale+0.5);
    }
};

/** 
 * This function normalizes an image based on percentiles of its cdf
 * It first calls {@link BisImageSmoothReslice.arrayRobustRange} to compute the range.
 * Then it calls  {@link BisImageSmoothReslice.arrayNormalize} to create the mapped output image.
 * It can handle 3D or 4D images.
 * @alias BisImageSmoothReslice.imageNormalize
 * @param {BisImage} input - the input image
 * @param {number} perlow - the low percentage of the cdf
 * @param {number} perhigh - the high percentage of the cdf 
 * @param {number} newmaxvalue - maximum value of output image (min=0)
 * @param {object} outdata - ouput tlow and thigh a
 * @returns {BisImage} - the normalized image
 */
var imageNormalize = function(input,perlow,perhigh,newmaxvalue,outdata) {

    outdata = outdata || { };
    newmaxvalue=newmaxvalue || 1024;
    if (newmaxvalue > 16384)
        newmaxvalue=16384;
    
    var output=new BisWebImage();
    output.cloneImage(input, { type : 'short' } );
    
    var input_data= input.getImageData();
    var output_data = output.getImageData();

    outdata.range = arrayRobustRange(input_data, perlow,perhigh);

    arrayNormalize(input_data,output_data,outdata.range[0],outdata.range[1],newmaxvalue);
    return output;
};

/** 
 * This function extracts an image frame from a 4d image
 * @alias BisImageSmoothReslice.imageExtractFrame
 * @param {BisImage} input - the input image
 * @param {number} frame - frame in range 0..numframes-1
 * @returns {BisImage} - the single frame image
 */
var imageExtractFrame = function(input,frame) {

    var output=new BisWebImage();
    output.cloneImage(input, { numframes : 1 });
    var dim=input.getDimensions();
    frame = util.range( (frame  || 0),0,dim[3]);
    var volsize=dim[0]*dim[1]*dim[2];
    var offset=frame*volsize;
    
    var input_data= input.getImageData();
    var output_data = output.getImageData();
    for (var i=0;i<volsize;i++)
        output_data[i]=input_data[i+offset];
    return output;
};

/** 
 * This function computes the correlation coefficient between two arrays (of same length)
 * @alias BisImageSmoothReslice.computeCC
 * @param {array} input1 - the first  array
 * @param {array} input2 - the second array
 * @returns {number} - cross correlation between the arrays
 */
var computeCC = function(input1,input2) {

    return util.computeCC(input1,input2);
};


/** Given a transformation compute displacement field for bounds (or whole image) and store in pre-allocate three-frame image output
 * @alias BisImageSmoothReslice.inPlaceComputeDisplacementField
 * @param {BisImage} output - the output displacement field
 * @param {BisTransformation} transformation - the transformation
 * @param {array} bounds - 6 array for specifying the piece to compute (in-place). Default = [ 0,odim[0]-1,0,odim[1]-1,0,odim[2]-1 ], where odim=output.getDimensions().
 */

var inPlaceComputeDisplacementField = function(output,transformation,bounds) {

    var dim=output.getDimensions();
    if (dim[3]!==3)
        throw new Error("Need a displacement field here, 3 components!");

    var spa=output.getSpacing();
    var X=[0,0,0],U=[0,0,0],i,j,k,outindex=0,ia;
    var volsize=dim[0]*dim[1]*dim[2],slicesize=dim[0]*dim[1];
    var data=output.getImageData();

    bounds = bounds || [ 0,dim[0]-1,0,dim[1]-1,0,dim[2]-1 ];
    for (k=bounds[4];k<=bounds[5];k++) {
        X[2]=k*spa[2];
        for (j=bounds[2];j<=bounds[3];j++) {
            outindex=bounds[0]+j*dim[0]+k*slicesize;
            X[1]=j*spa[1];
            for (i=bounds[0];i<=bounds[1];i++) {
                X[0]=i*spa[0];
                transformation.computeDisplacement(X,U);
                for (ia=0;ia<=2;ia++) 
                    data[outindex+ia*volsize]=U[ia];
                outindex++;
            }
        }
    }
};

/** Given a transformation  and a reference image, compute displacement field
 * @alias BisImageSmoothReslice.computeDisplacementField
 * @param {BisImage} ref_image - the reference image
 * @param {BisTransformation} transformation - the transformation
 * @returns {BisImage}  - the output displacement field
 */
var computeDisplacementField = function(reference,transformation) {

    var output=new BisWebImage();
    output.cloneImage(reference, { type : 'float', numframes:3 } );
    inPlaceComputeDisplacementField(output,transformation);
    return output;
};

/** Computes Image SSD
 * @alias BisImageSmoothReslice.computeImageSSD
 * @param {BisImage} image1 - the output displacement field
 * @param {BisImage} image2 - the output displacement field
 * @param {array} bounds - 6 array for specifying the piece to compute. Default = [ 0,odim[0]-1,0,odim[1]-1,0,odim[2]-1 ], where odim=output.getDimensions().

 * @returns {number} -- the  SSD between the images
 */

var computeImageSSD = function(image1,image2,bounds,debug) {

    var dim=image1.getDimensions();
    var dim2=image2.getDimensions();
    var sum=0,i,j,k,frame,index,frameoffset=0,koffset=0;
    for (i=0;i<=3;i++)
        sum+=Math.abs(dim[i]-dim2[i]);

    if (sum>0)
        throw new Error('Bad dimensions for computing image SSD'+dim+','+dim2);

    var volsize=dim[0]*dim[1]*dim[2],slicesize=dim[0]*dim[1];
    var data1=image1.getImageData();
    var data2=image2.getImageData();

    bounds = bounds || [ 0,dim[0]-1,0,dim[1]-1,0,dim[2]-1 ];

    sum=0;
    for (frame=0;frame<dim[3];frame++) {
        for (k=bounds[4];k<=bounds[5];k++) {
            koffset=k*slicesize+frameoffset;
            for (j=bounds[2];j<=bounds[3];j++) {
                index=bounds[0]+j*dim[0]+koffset;
                for (i=bounds[0];i<=bounds[1];i++)  {
                    sum+=Math.pow(data1[index]-data2[index],2.0);
                }
            }
        }
        frameoffset+=volsize;
    }
    
    var np=((bounds[5]-bounds[4]+1)*(bounds[3]-bounds[2]+1)*(bounds[1]-bounds[0]+1));
    var v=Math.sqrt(sum/np);
    if (debug)
        console.log('np=',np,'sum=',sum.toFixed(3),'v=',v.toFixed(4),bounds,dim);
    return v;
};


/** Computes Image SSD
 * @alias BisImageSmoothReslice.computeDisplacementFieldRoundTripError
 * @param {BisImage} forward - the forward displacement field
 * @param {BisImage} inverse - the inverse displacement field
 * @param {array} bounds - 6 array for specifying the piece to compute. Default = [ 0,odim[0]-1,0,odim[1]-1,0,odim[2]-1 ], where odim=output.getDimensions().
 * @returns {number} -- the  SSD between the images
 */

var computeDisplacementFieldRoundTripError = function(forward,reverse,bounds,debug) {

    var dim=forward.getDimensions();
    var reverse_dim=reverse.getDimensions();
    var sum=0,error=0,i,j,k,axis,index,koffset=0;
    var X=[0,0,0],Y=[0,0,0],numgood=0;
    
    if (dim[3]!==3 || reverse_dim[3]!==3)
        throw new Error('Bad dimensions for computing round trip error SSD'+dim+', '+reverse_dim);

    var cache = {
        TX : [ 0,0,0],
        dim0 : reverse_dim[0],
        slicesize  : reverse_dim[0]*reverse_dim[1],
        volsize  : reverse_dim[0]*reverse_dim[1]*reverse_dim[2],
        input_data : reverse.getImageData(),
        minusdim : [ reverse_dim[0]-1,reverse_dim[1]-1,reverse_dim[2]-1 ],
        offset :0,
    };

    var maxdvox = [ reverse_dim[0]-1,reverse_dim[1]-1,reverse_dim[2]-1 ];
    var reverse_spa = reverse.getSpacing();


    var volsize=dim[0]*dim[1]*dim[2],slicesize=dim[0]*dim[1];
    var spa=forward.getSpacing();
    var indata=forward.getImageData();

    bounds = bounds || [ 0,dim[0]-1,0,dim[1]-1,0,dim[2]-1 ];

    error=0.0;
    for (k=bounds[4];k<=bounds[5];k++) {
        koffset=k*slicesize;
        X[2]=k*spa[2];
        for (j=bounds[2];j<=bounds[3];j++) {
            index=bounds[0]+j*dim[0]+koffset;
            X[1]=j*spa[1];
            for (i=bounds[0];i<=bounds[1];i++)  {
                X[0]=i*spa[0];
                for (axis=0;axis<=2;axis++) {
                    var disp=(indata[index+axis*volsize]);
                    Y[axis]=disp+X[axis];
                    cache.TX[axis]=(Y[axis]/reverse_spa[axis]);
                    if (k===10 && j===11 && i===12 && debug===true) 
                        console.log('ijk=',[i,j,k],axis,'X=',X[axis].toFixed(2),'--> disp='+disp.toFixed(2)+'-> Y'+Y[axis].toFixed(2)+' TX=',cache.TX[axis].toFixed(2));
                }

                if (cache.TX[2]>=0 && cache.TX[2] < maxdvox[2] &&
                    cache.TX[1]>=0 && cache.TX[1] < maxdvox[1] &&
                    cache.TX[0]>=0 && cache.TX[0] < maxdvox[0]) {
                    
                    sum=0.0;
                    numgood++;
                    for (axis=0;axis<=2;axis++) {
                        cache.offset=cache.volsize*axis;
                        var d=linearInterpolationFunction4D(cache);
                        sum+=Math.pow( (Y[axis]-d)-X[axis],2.0);
                    }
                    error+=sum;
                }
                index++;
            }
        }
    }

    var v=Math.sqrt(error/numgood);
    if (debug)
        console.log('np=',numgood,'error=',error.toFixed(3),'v=',v.toFixed(4),bounds,dim,'numgood=',numgood);
    return v;
};




const algo = { 
    smoothImage : smoothImage,
    resampleImage : resampleImage,
    resliceImage: resliceImage,
    generateKernel : generateKernel,
    arrayRobustRange : arrayRobustRange,
    arrayNormalize : arrayNormalize,
    imageNormalize : imageNormalize,
    imageExtractFrame : imageExtractFrame,
    computeDisplacementField : computeDisplacementField,
    inPlaceComputeDisplacementField : inPlaceComputeDisplacementField,
    computeCC : computeCC,
    computeImageSSD : computeImageSSD,
    computeDisplacementFieldRoundTripError :computeDisplacementFieldRoundTripError,
};


module.exports = algo;
