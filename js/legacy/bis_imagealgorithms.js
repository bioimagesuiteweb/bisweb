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
 * @file Browser or Node.js module. Contains {@link BisImageAlgorithms}.
 * @author Xenios Papademetris
 * @version 1.0
 */


/**
 * A set of image ({@link BisImage} processing functions. Mostly to do with interactive segmentation and clustering.
 * @namespace BisImageAlgorithms
 */

const BisWebImage=require('bisweb_image');

const debugvoxel=-1;//46+102*181+90*181*217;

let computeTotalMinusLogProbability=function(intensity,current_voxel,trylabel,labels,
                                             gridspec,smoothness) {
    
    if (current_voxel===debugvoxel) {
        console.log('in compute tmlp = ',intensity,current_voxel,trylabel,smoothness,gridspec);
    }

    let  pmrf  =0.0,i=0;
    
    if (smoothness>0.001) {
        for (i=0;i<gridspec.increments.length;i++) {
            if ( Math.abs(trylabel-labels[current_voxel+gridspec.increments[i]])>0.0001)
                pmrf+=gridspec.weights[i];
        }
    }

    pmrf=pmrf*smoothness;

    if ( Math.abs(trylabel-intensity)>0.0001) {
        pmrf+=1.0;
    }
    return pmrf;
};
// --------------------------------------------------------------------------------------------
//
//  This is a greedy optimization scheme in which the label for each voxel
//  is updated separately to maxmize the probablity of this voxel having class=label
//
// --------------------------------------------------------------------------------------------
let classifyVoxel=function(voxel_index,intensities,labels,outlabels,
                           gridspec,smoothness) {

    let current_label=labels[voxel_index];
    let intensity=intensities[voxel_index];

    // We need a different loop here to identify numclasses ......
    let ids = [ current_label ];

    for (let ia=0;ia<gridspec.increments.length;ia++) {
        let l=Math.floor(intensities[voxel_index+gridspec.increments[ia]]);
        if (ids.indexOf(l)<0)
            ids.push(l);
    }
    
    let bestprob=0.0,    bestclass=current_label, numclasses=ids.length;
    
    if (voxel_index==debugvoxel) 
        console.log('in classify voxel index=',voxel_index,'ids=',ids.join());

    if (numclasses>1)  {
        for (let i=0;i< numclasses;i++) {
            let prob=computeTotalMinusLogProbability(intensity,voxel_index,ids[i],labels,gridspec,smoothness);
            if ( (prob-bestprob)<0.000001 || i===0) {
                bestprob=prob;
                bestclass=ids[i];
            }
            if (voxel_index==debugvoxel) {
                console.log('class=',i,'prop=',prob,' best=',bestprob,' class=',bestclass);
            }

        }

        if (bestclass!=current_label) {
            outlabels[voxel_index]=bestclass;
            return 1;
        }
    }
    
    outlabels[voxel_index]=current_label;

    return 0;
};

// ----------------------------------------------------------------------------------------------------
//  High Level Routines for Maximization
// ----------------------------------------------------------------------------------------------------
// Computes the distances in (voxel index or raster index) between a voxel and its neighbors incr[26]
// The weights are proportional to the inverse of the distance between each voxel and its neighbors
//      these are constant if the image has isotropic resolution.
// --------------------------------------------------------------------------------------------------
// incr = new Array(26), wgt=new Array(26)
let computeMRFGridSpec = function(volume) {

    let dim=volume.getDimensions();
    let sp=volume.getSpacing();

    let incr=null,wgt=null;
    
    if (dim[2]>1) {
        incr=new Array(26);
        wgt=new Array(26);
        
        let slicesize=dim[0]*dim[1];
        let index=0;
        let d=[0,0,0];
        
        for (let ic=-1;ic<=1;ic++) {
            d[2]=Math.pow(sp[2]*ic,2.0);
            
            for (let ib=-1;ib<=1;ib++) {
                d[1]=Math.pow(sp[1]*ib,2.0);
                
                for (let ia=-1;ia<=1;ia++) {
                    d[0]=Math.pow(sp[0]*ia,2.0);
                    if (!(ia===0 && ib===0 && ic===0)) {
                        incr[index]=ia+ib*dim[0]+ic*slicesize;
                        wgt[index]=1.0/Math.sqrt(d[0]+d[1]+d[2]);
                        ++index;
                    }
                }
            }
        }
    } else {
        incr=new Array(8);
        wgt=new Array(8);
        let index=0;
        let d=[0,0,0];
        for (let ib=-1;ib<=1;ib++) {
            d[1]=Math.pow(sp[1]*ib,2.0);
            for (let ia=-1;ia<=1;ia++) {
                d[0]=Math.pow(sp[0]*ia,2.0);
                if (!(ia===0 && ib===0)) {
                    incr[index]=ia+ib*dim[0];
                    wgt[index]=1.0/Math.sqrt(d[0]+d[1]);
                    ++index;
                }
            }  
        }
    }

    let len=incr.length;
    
    let sum=0.0;
    for (let l=0;l<len;l++)
        sum+=wgt[l];

    for (let k=0;k<len;k++)
        wgt[k]/=sum;
    
    
    let gridspec = { 
        weights : wgt,
        increments : incr,
    };
    return gridspec;
};


/** 
 * This function performs objectmap regularization using an MRF Model. Used by the interactive segmentation tools.
 * @alias BisImageAlgorithms.regularizeObjectmap
 * @param {BisImage} volume - the input image
 * @param {number} numberofiterations - the number of iterations to use (default = 4).
 * @param {number} smoothness - how much to smooth (default = 4.0).
 * @param {number} convergence - the percentage of voxels below which if changed the algorithm has converged (default = 0.2).
 * @returns {BisImage} 
 */
let regularizeObjectmap = function (volume,numberofiterations,smoothness,convergence) {

    numberofiterations=numberofiterations || 4;
    smoothness=smoothness || 4.0;
    convergence = convergence || 0.2;

    console.log('convergence=',convergence,' smoothness=',smoothness,' iter=',numberofiterations);

    let newvol=new BisWebImage();
    newvol.cloneImage(volume,{ type : 'short'});

    let intensities= volume.getImageData(), nt =intensities.length;
    let out_labels= newvol.getImageData(), i=0;
    let labels=new Uint16Array(nt);

    for (i=0;i<nt;i++) {
        out_labels[i]=intensities[i];
        labels[i]=0;
    }

    let gridspec = computeMRFGridSpec(volume);
    let tenth=Math.round(nt/11);

    console.log(gridspec,tenth);

    // Only Classify voxels that are not on the image boundary. 
    // Check for 2D Images here
    let dim=volume.getDimensions();
    let mink=1,maxk=dim[2]-1;
    if (dim[2]==1) {
        mink=0;
        maxk=1;
    }

    let slicesize=dim[0]*dim[1];
    let iterations=0;

    while(iterations<=numberofiterations) {
        ++iterations;
        console.log("\n + + + + + +  Iteration "+iterations + "(" + smoothness +")");

        for (i=0;i<nt;i++) 
            labels[i]=out_labels[i];
        
        let changed=0.0, total=0.0, count=0;
        
        for (let k=mink;k<maxk;k++) {
            for (let j=1;j<dim[1]-1;j++) {
                let vox=k*slicesize+j*dim[0]+1;
                for (i=1;i<dim[0]-1;i++) {

                    if (count==tenth) {
                        console.log(".");
                        count=0;
                    }
                    if (vox===debugvoxel) {
                        console.log('vox=',vox,' val=',intensities[vox],' labels=',labels[vox],' out=',out_labels[vox],' smoo=',smoothness);
                    }

                    let s=classifyVoxel(vox,intensities,labels,out_labels,gridspec,smoothness);
                    changed+=s;
                    ++vox;
                    ++total;
                    ++count;
                }
            }
        }
        changed=100.0*changed/total;
        console.log("changed=",changed," vs" ,convergence, "\n");
        if (changed<convergence)
            iterations=numberofiterations+1;
    }
    
    labels=null;
    newvol.computeIntensityRange();
    return newvol;
};

// ---------------------------------------------------------------------
// CLUSTERING CODE
// ---------------------------------------------------------------------

/** 
 * This function performs image clustering. The output is an object containing an image (with values = cluster numbers) and an array containing the volme of each cluster
 * @alias BisImageAlgorithms.createClusterNumberImage
 * @param {BisImage} volume - the input image
 * @param {number} threshold - the value (absolute value thresholding) above which a voxel is counted as good.
 * @param {boolean} oneconnected - whether to use oneconnected (6 neighbors) or corner connected (26 neighbors) connectivity (default =fa
 * @returns {object} out - out.maxsize = size of biggest cluster, out.clusterimage (BisImage) image output where each voxel has its cluster number (or 0), clusterhist (array) containing volume of clusters (e.g. clusterhist[4] is volume of cluster 4. 
 */
let createClusterNumberImage = function(input, threshold,oneconnected) {

    oneconnected = oneconnected || false;
    //console.log('oneconnected=',oneconnected,' threshold=',threshold);

    let VOXELVISITED=   -1;
    let UNVISITEDVOXEL= 0;
    
    let cluster_output=new BisWebImage();
    cluster_output.cloneImage(input,{ type : 'short'});
    let dim=input.getDimensions();
    let slicesize = dim[0]*dim[1];
    let volsize = slicesize*dim[2];
    
    let clusters = { };
    let clusterseeds = { };
    
    let inpdata= input.getImageData();
    let clustdata= cluster_output.getImageData(), i=0;
    for (i=0;i<volsize;i++) {
        clustdata[i]=UNVISITEDVOXEL;
    }

    
    let shifts=[];
    let maxc=1;
    if (dim[2]==1)
        maxc=0;

    //  console.log('end of init',dim,slicesize);
    
    for (let ic=-maxc;ic<=maxc;ic++) {
        for (let ib=-1;ib<=1;ib++) {
            for (let ia=-1;ia<=1;ia++) {
                let sh=ic*slicesize+ib*dim[0]+ia;
                let diff=Math.abs(ia)+Math.abs(ib)+Math.abs(ic);
                if (diff===1) 
                    shifts.push([ia,ib,ic,sh]);
                else if (!oneconnected && diff!==0) 
                    shifts.push([ia,ib,ic,sh]);
            }
        }
    }
    let maxshift=shifts.length;

    //          console.log('MaxShift',maxshift,'OneConnected=',oneconnected,' shifts=',shifts);
    
    let CurrentCluster=1;
    let voxelindex=0;
    
    for (let idZ = 0; idZ < dim[2]; idZ++) {
        for (let idY = 0; idY < dim[1]; idY++) {
            for (let idX = 0; idX < dim[0]; idX++) {

                let otval = clustdata[voxelindex];

                if (otval === UNVISITEDVOXEL) {
                    
                    // Only Use First Component
                    let value = inpdata[voxelindex], voxelsign=1.0;
                    if (value<0.0)
                        voxelsign=-1.0;
                    value=Math.abs(value);
                    
                    if(value >= threshold) {

                        let stack = [];
                        stack.push([idX,idY,idZ,voxelindex]);
                        let nClusterVoxels=1;
                        clustdata[voxelindex]=CurrentCluster;
                        clusterseeds[CurrentCluster]=[ idX,idY,idZ];
                        
                        
                        while(stack.length>0) {
                            // ----------------------------------------------------------------------------------------
                            // Work trhough stack -- starts with seed but will grow!

                            // ----------------------------------------------------------------------------------------
                            let CP=stack.shift();
                            
                            for (let nb=0;nb<maxshift;nb++) {
                                let i1=CP[0]+shifts[nb][0];
                                let i2=CP[1]+shifts[nb][1];
                                let i3=CP[2]+shifts[nb][2];
                                
                                if (i1>=0 && i1<dim[0] && i2>=0 && i2<dim[1] && i3>=0 && i3<dim[2]) {
                                    
                                    let tmpindex=CP[3]+shifts[nb][3];
                                    let ot=clustdata[tmpindex];
                                    let it=voxelsign*inpdata[tmpindex];
                                    
                                    // If not yet visitied
                                    if ( ot === UNVISITEDVOXEL) {
                                        if (it >= threshold) {
                                            
                                            // Mark it as part of this cluster and add to stack
                                            clustdata[tmpindex]=CurrentCluster;
                                            stack.push([i1,i2,i3,tmpindex]);
                                            nClusterVoxels++;
                                        } else {
                                            clustdata[tmpindex]=VOXELVISITED;
                                        }
                                    }
                                }
                            }
                        }
                        clusters[CurrentCluster]=nClusterVoxels;
                        CurrentCluster+=1;
                    } else {
                        clustdata[voxelindex]=VOXELVISITED;
                    }
                } 
                ++voxelindex;
            }
        }
    }

    
    let sumc=0,maxsize=0;
    clusters[0]=0;
    for (i=0;i<CurrentCluster;i++) {
        if (clusters[i]>maxsize)
            maxsize=clusters[i];
        sumc+=clusters[i];
    }
    console.log('+++++ clustering at threshold'+threshold+', numvoxels that pass='+sumc+', maxsize='+maxsize+', numclusters=',CurrentCluster);
    
    return {
        clusterimage : cluster_output,
        maxsize : maxsize,
        clusterhist : clusters,
        numclusters : CurrentCluster,
    };
};

/** 
 * This function performs masking using as input the results of {@link BisImageAlgorithms.createClusterNumberImage} and a cluster threshold size. Clusters smaller than this are eliminated.
 * @alias BisImageAlgorithms.clusterFilter
 * @param {BisImage} volume - the input image
 * @param {object} clusterOutput - the results of {@link BisImageAlgorithms.createClusterNumberImage}. 
 * @param {number} clustersizethreshold - the size of cluster below which we filter out
 the value (absolute value thresholding) above which a voxel is counted as good.
 * @returns {BisImage}
 */
let clusterFilter = function (input,clusterOutput,clustersizethreshold) {

    let inpdata= input.getImageData();
    let dim=input.getDimensions();
    let volsize = dim[0]*dim[1]*dim[2];

    let output=new BisWebImage();
    output.cloneImage(input);
    let outdata= output.getImageData();
    
    let clustdata= clusterOutput.clusterimage.getImageData();
    let clusterhist = clusterOutput.clusterhist;
    let maxsize= clusterOutput.maxsize;
    
    let numpass=0;
    for (let i=0;i<volsize;i++) {
        let clusterno=Math.floor(clustdata[i]);
        if (clusterhist[clusterno]>=clustersizethreshold) {
            ++numpass;
            outdata[i]=inpdata[i];
        } else {
            outdata[i]=0.0;
        }
    }

    console.log('+++++ cluster size masking biggest_cluster=',maxsize,' threshold=',clustersizethreshold,' numpass=',numpass);
    return output;
};

// ------------------------------------------------------------------------------------------------
// SPECT Processing
// ------------------------------------------------------------------------------------------------
/*    For each SPECT image:
      Warp to MNI space (maybe mask if there is an artifact)
      Smooth w/ 16mm Gaussian
      Scale image to have a mean of 50 using hacky two step process*
      
      Mask out any voxel not in the SPECT images or population mean/std images
      t-test
      cluster and get p-values for clusters (I need to refresh my memory about how to calculate the p-values).
      
      *two step image mean:
      find the image mean for all voxel.
      Divide that mean by 8 (call this X)
      find the image mean for all voxel greater than X. (call this Y)
      Multiple image by 50/Y.
      Mask out voxels less than 40.

      
*/

/** 
 * This function masks an image by checking if mask has value > 0
 * @alias BisImageAlgorithms.imageMask
 * @param {BisImage} input - the input image
 * @param {BisImage} mask - the  mask image
 * @returns {BisImage} - masked image output
 */
let maskImage = function(image,mask) {
    
    let outimage = new BisWebImage();
    outimage.cloneImage(image,{ type : 'float'});
    let outdata = outimage.getImageData();
    let sum=0,i=0,nump=outdata.length;

    let dim1=image.getDimensions();
    let dim2=mask.getDimensions();
    for (i=0;i<=2;i++) 
        sum+=Math.abs(dim1[i]-dim2[i]);
    if (sum>0.01) 
        throw new Error('Cannot mask image, as mask and image have different dimensions '+dim1.join(",")+' vs '+dim2.join(","));

    let mdata =mask.getImageData();
    let indata=image.getImageData();    
    
    for (i=0;i<nump;i++)  {
        if (mdata[i]>0) {
            outdata[i]=indata[i];
        } else {
            outdata[i]=0;
        }
    }
    return outimage;
};

/** 
 * This function multiplies two images and returns product
 * @alias BisImageAlgorithms.imageMask
 * @param {BisImage} image1 - the input image
 * @param {BisImage} image2 - the second image image
 * @returns {BisImage} - the product image
 */
let multiplyImages = function(image1,image2) {
    
    let outimage = new BisWebImage();
    outimage.cloneImage(image1,{ type : 'float'});
    let outdata = outimage.getImageData();
    let sum=0,i=0,nump=outdata.length;

    let dim1=image1.getDimensions();
    let dim2=image2.getDimensions();
    for (i=0;i<=2;i++) 
        sum+=Math.abs(dim1[i]-dim2[i]);
    if (sum>0.01) 
        throw new Error('Cannot mask image, as mask and image have different dimensions '+dim1.join(",")+' vs '+dim2.join(","));

    let indata1=image1.getImageData();  
    let indata2 =image2.getImageData();
    for (i=0;i<nump;i++)  
        outdata[i]=indata1[i]*indata2[i];

    return outimage;
};

/** 
 * This function normalizes a spect image to have mean 50 and thresholds above 80% of mean
 * @alias BisImageAlgorithms.spectNormalize
 * @param {BisImage} input - the input spect image (masked)
 * @returns {BisImage} - normalized image
 */
let spectNormalize = function(image) {
    
    let outimage =  new BisWebImage();
    outimage.cloneImage(image,{ type : 'float'});
    let outdata = outimage.getImageData();
    let X=0,Y=0,sum=0,i=0,num=0,nump=outdata.length;

    let indata=image.getImageData();    
    for (i=0;i<nump;i++)  {
        sum+=indata[i];
        num+=1;
    }
    X=sum/(8.0*num);
    sum=0;
    num=0;
    for (i=0;i<nump;i++) {
        if (indata[i]>X) {
            sum+=indata[i];
            num+=1;
        }
    }
    Y=sum/num;
    let scale=50.0/Y;

    for (i=0;i<nump;i++) {
        let v1=indata[i]*scale;
        if (v1>40)  {
            outdata[i]=v1;
        } else {
            outdata[i]=0.0;
        }
    }
    return outimage;
};

/** 
 * This function computes a tmap of an ictal and an interictal spect image set
 * given a standard deviation and optionally a mean image (if not using half normal).
 * @alias BisImageAlgorithms.spectNormalizedDifferenceTmap
 * @param {BisImage} ictal - the normalized input ictal image
 * @param {BisImage} interictal - the normalized input ictal image
 * @param {BisImage} templatesigma - the standard deviation image
 * @param {BisImage} templatemean - the mean image (in SPECT ISAS) BAD! 
 * @returns {BisImage} - tmap image
 */
let spectTmap = function(ictal,interictal,templatesigma,templatemean) {
    
    templatemean=templatemean || null;
    let sum=0,i=0;
    let dim1=ictal.getDimensions();
    let dim2=interictal.getDimensions();
    let dim3=templatesigma.getDimensions();
    let dim4=dim3;
    if (templatemean!==null)
        dim4=templatemean.getDimensions();
    
    for (i=0;i<=2;i++) 
        sum+=Math.abs(dim1[i]-dim2[i])+Math.abs(dim1[i]-dim3[i])+Math.abs(dim1[i]-dim4[i]);
    if (sum>0.01) 
        throw new Error('Cannot process spect images that have different dimensions '+dim1.join(",")+' vs '+dim2.join(",")+' vs template='+dim3.join(",")+','+dim4.join(","));

    let spect = [ ictal.getImageData(),interictal.getImageData() ];
    let templatedata=templatesigma.getImageData();
    let nump=templatedata.length;
    let templatemeandata=null;
    if (templatemean!==null)
        templatemeandata=templatemean.getImageData();

    let outimage =  new BisWebImage();
    outimage.cloneImage(templatesigma,{ type : 'float'});
    let outdata = outimage.getImageData();

    
    for (i=0;i<nump;i++) {
        outdata[i]=0.0;
        let sigma=templatedata[i];
        let v1=spect[0][i];
        let v2=spect[1][i];
        
        if (sigma>0.0 && v1>0 && v2>0) {
            let diff=(v1-v2);
            if (templatemean!==null)
                diff=diff-templatemeandata[i];
            outdata[i]=diff/sigma;
        }
    }
    return outimage;
};


/** 
 * This function computes Gaussian Random Field statistics from an image (ftom vtkdsSpectUtil.cpp)
 * @alias BisImageAlgorithms.spectComputeExpectedNumberOfClusters
 * @param {BisImage} volume - the input image
 * @param {array} eulerDensity - array of size 4 with different cutoffs
 * @returns {number} - expected number of clusters at eulerDensity (which comes from threshold)
 */
let spectComputeExpectedNumberOfClusters = function(tmap,eulerDensity) {
    let val = {
        volume : 0,
        cubes : 0,
        xyFaces : 0,
        yzFaces : 0,
        xzFaces : 0,
        xEdges : 0,
        yEdges : 0,
        zEdges : 0,
        reselCount : [ 0,0,0,0 ],
    };


    let dim=tmap.getDimensions();
    let data=tmap.getImageData();
    let slicesize=dim[0]*dim[1];
    let rowsize=dim[0];

    for (let k=0;k<dim[2]-1;k++) {
        let kindex=k*slicesize;
        for (let j=0;j<dim[1]-1;j++) {
            let index=j*rowsize+kindex;
            for (let i=0;i<dim[0]-1;i++) {
                if (Math.abs(data[index])>0) {
                    val.volume=val.volume+1;
                    
                    //if (fabs(image->GetScalarComponentAsDouble(i+1,j,k,0))>0)
                    if (Math.abs(data[index+1])>0) {
                        val.xEdges=val.xEdges+1;
                        if (Math.abs(data[index+rowsize])>0 && Math.abs(data[index+1+rowsize])>0)  {
                            val.xyFaces+=1;
                            if (Math.abs(data[index+slicesize])>0   && Math.abs(data[index+1+slicesize])>0 &&
                                Math.abs(data[index+rowsize+slicesize])>0 && Math.abs(data[index+1+rowsize+slicesize])>0) {
                                val.cubes+=1;
                            }
                        }
                    }
                    
                    if (Math.abs(data[index+rowsize])>0) {
                        val.yEdges+=1;
                        if (Math.abs(data[index+slicesize])>0 && Math.abs(data[index+rowsize+slicesize])>0) {
                            val.yzFaces+=1;
                        }
                    }
                    if (Math.abs(data[index+slicesize])>0) {
                        val.zEdges++;
                        if (Math.abs(data[index+1])>0 && Math.abs(data[index+1+slicesize])>0) {
                            val.xzFaces++;
                        }
                    }
                }
                index=index+1;
            }
        }
    }

    let xDim=0.11627907, yDim=0.120481928, zDim=0.109289617;
    val.reselCount[0]=(val.volume-val.xEdges-val.yEdges-val.zEdges+val.xyFaces+val.xzFaces+val.yzFaces-val.cubes);
    val.reselCount[1]=(val.xEdges-val.xyFaces-val.xzFaces+val.cubes)*xDim+
        (val.yEdges-val.xyFaces-val.yzFaces+val.cubes)*yDim+
        (val.zEdges-val.yzFaces-val.xzFaces+val.cubes)*zDim;
    val.reselCount[2]=(val.xyFaces-val.cubes)*xDim*yDim+(val.xzFaces-val.cubes)*xDim*zDim+(val.yzFaces-val.cubes)*zDim*yDim;
    val.reselCount[3]=val.cubes*xDim*yDim*zDim;

    let expectedNumOfCluster=0;
    for (let kk=0;kk<4;kk++)  
        expectedNumOfCluster=expectedNumOfCluster+eulerDensity[kk]*val.reselCount[kk];

    return expectedNumOfCluster;
};


/** 
 * This function computes the clustered tmap and cluster statistics given a spect tmap image.
 * @alias BisImageAlgorithms.processDiffSPECTImageTmap
 * @param {BisImage} ictal - the input ictal image
 * @param {BisImage} interictal - the input ictal image
 * @param {BisImage} templatesigma - the standard deviation image
 * @param {BisImage} templatemean - the mean image (in SPECT ISAS) BAD! 
 * @returns {BisImage} - tmap image
 */
let processDiffSPECTImageTmap=function(tmapimage,sigThr,extent,positive) {
    
    //  let smooth_ictal=bisimagesmooth.smoothImage(ictal,[16,16,16],true,1.5);
    //  let smooth_interictal=bisimagesmooth.smoothImage(interictal,[16,16,16],true,1.5);       
    //  let tmapimage = spectNormalizedDifferenceTmap(smooth_ictal,smooth_interictal,templatesigma,templatemean);
    

    // THESE are 1-tail t-test values
    let tscore = 1.76885; // Fix this to take sigThr pvalue as input
    if (Math.abs(sigThr-0.01)<0.01) {
        tscore=2.64951;
        sigThr=0.01;
    } else if ( Math.abs(sigThr-0.005)<0.001)  {
        tscore=3.00977;
        sigThr=0.005;
    } else if ( Math.abs(sigThr-0.001)<0.001 ) {
        tscore=3.85352;
        sigThr=0.001;
    } else {
        sigThr=0.05;
    }
    console.log('+++++ thresholding using tscore='+tscore+'( pvalue ='+sigThr+')');

    // Groupwise probability ...
    let tmp=Math.pow(1+tscore*tscore/13,-6);
    let eulerDensity= [ 0,0,0,0];
    eulerDensity[0]=sigThr;
    eulerDensity[1]=0.2650*tmp;
    eulerDensity[2]=0.1727*tscore*tmp;
    eulerDensity[3]=0.1169*tmp*(12*tscore*tscore/13-1);
    let expectedVoxPerCluster=eulerDensity[0]/eulerDensity[3];

    let expectedNumOfCluster= spectComputeExpectedNumberOfClusters(tmapimage,eulerDensity);

    // Clustering ... first restrict tmapimage to pos or neg
    let newvol=new BisWebImage();
    newvol.cloneImage(tmapimage);
    let diffdata=tmapimage.getImageData();
    let outdata=newvol.getImageData();
    let dim=newvol.getDimensions();
    let slicesize=dim[0]*dim[1];
    let volsize = slicesize*dim[2],i=0;

    // Conditional Thresholding to keep only positives or only negatives
    if (positive) {
        for (i=0;i<volsize;i++) {
            if (diffdata[i]<0)
                outdata[i]=0;
            else
                outdata[i]=diffdata[i];
        }
    } else {
        for (i=0;i<volsize;i++) {
            if (diffdata[i]>0)
                outdata[i]=0;
            else
                outdata[i]=diffdata[i];
        }
    }

    // Cluster at tscore and cluster filter
    let clusterOutput = createClusterNumberImage(newvol,tscore,true);
    let outputImage =   clusterFilter(newvol,clusterOutput,extent);

    // Next item ...
    // Compute max-t value for each cluster
    let clustdata=    clusterOutput.clusterimage.getImageData();
    let clusterhist=  clusterOutput.clusterhist;
    let numc= clusterOutput.numclusters;

    
    let clusterinfo_i= new Array(numc+1);
    let clusterinfo_t= new Array(numc+1);
    for (i=0;i<=numc;i++)
        clusterinfo_t[i]=0.0;
    
    // First compute max t-value (and it's location) for each cluster
    for (i=0;i<volsize;i++) {
        let clusterno=Math.floor(clustdata[i]);
        let v=Math.abs(diffdata[i]);
        if (v>clusterinfo_t[clusterno]) {
            clusterinfo_t[clusterno]=v;
            clusterinfo_i[clusterno]=i;
        }
    }

    let outputdata = [];
    // En = expectedVoxPerCluster
    // Em = expectedNumberOfCluster
    // tscore -> threshold
    // extThr -> extThr
    let En=expectedVoxPerCluster;
    let EM=expectedNumOfCluster;

    let index=1;
    for (i=1;i<=numc;i++) {
        if (clusterhist[i]>extent) {
            let ka=Math.floor(clusterinfo_i[i]/ slicesize);
            let t=clusterinfo_i[i]-ka*slicesize;
            let ja=Math.floor(t /dim[0]);
            let ia=t % dim[0];
            let kSize = clusterhist[i];
            let tval  = clusterinfo_t[i];
            if (!positive)
                tval=-1.0*tval;
            
            let clusterPvalue = Math.exp(-Math.pow((1.3378/En*kSize/(17.2/2*16.6/2*18.3/2)),(2.0/3.0)));//1.3293
            let correctPvalue = 1 - Math.exp(-EM*clusterPvalue);
            outputdata.push({
                string : index+'\t'+ia+'\t'+ja+'\t'+ka+'\t'+kSize+'\t'+clusterinfo_t[i].toFixed(4)+'\t'+clusterPvalue.toFixed(12)+'\t'+correctPvalue.toFixed(12),
                index  : index,
                size   : kSize,
                coords : [ ia,ja,ka ],
                clusterPvalue : clusterPvalue,
                correctPvalue : correctPvalue,
                maxt : tval,
            });
            ++index;
        }
    }

    outputdata.sort( (a, b) => {
        if (a.size < b.size)
            return 1;
        if (a.size > b.size)
            return -1;
        return 0;
    });
        
    
    return { image : outputImage,
             stats : outputdata };
};




const algo = { 
    regularizeObjectmap : regularizeObjectmap,
    createClusterNumberImage :  createClusterNumberImage,
    clusterFilter : clusterFilter,
    maskImage : maskImage,
    multiplyImages : multiplyImages,
    spectNormalize : spectNormalize,
    spectTmap : spectTmap,
    processDiffSPECTImageTmap : processDiffSPECTImageTmap,
};


module.exports = algo;



