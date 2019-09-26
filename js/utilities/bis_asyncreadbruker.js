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
 * @file Browser or Node.js module. Contains {@link BisReadBruker}.
 * @author Xenios Papademetris
 * @version 1.0
 */


/**
 * A set of functions for reading Bruker formated images to ({@link BisImage}.
 * @namespace BisReadBruker
 */

const bisheader=require('bis_header');
const BisWebImage=require('bisweb_image');
const bisgenericio=require('bis_genericio');
const userPreferences = require('bisweb_userpreferences.js');
const inelectron=( bisgenericio.getmode() === "electron");

/*const sleep=function(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
};*/

let dualPrint=function() {
    
    let text = "[BIS:]"+(Array.from(arguments)).join("");
    
    console.log(text);
    if (inelectron)
        window.BISELECTRON.ipc.send('bisconsole',text);
};


const printFileStats = async function(fname,debug=false) {

    debug= debug || false;
    try {
        let p=await bisgenericio.getFileSize(fname);
        if (debug)
            dualPrint('+++++ file='+fname+',\t\t size =', p);
    } catch(e) {
        dualPrint('----- file='+bisgenericio.getBaseName(fname)+' does not exist');
        return 0;
    }
    return 1;
};

var getmatchingfiles = function (querystring) {
    return bisgenericio.getMatchingFiles(querystring);
};


// ---------------
// Get matching filenames
// ---------------
let getMatchingFilenames=async function(f) {

    var pname=bisgenericio.getNormalizedFilename(f);
    var l=bisgenericio.getDirectoryName(pname).length+1;

    var p2=bisgenericio.getNormalizedFilename(pname+'/*/pdata/*/2dseq');
    var n1=await getmatchingfiles(p2);
    if (n1.length<1) {
        p2=bisgenericio.getNormalizedFilename(pname+'/pdata/*/2dseq');
        n1=await getmatchingfiles(p2);
    }

    if (n1.length<1) {
        p2=bisgenericio.getNormalizedFilename(pname+'/*/2dseq');
        n1=await getmatchingfiles(p2);
    }

    if (n1.length<1) {
        p2=bisgenericio.getNormalizedFilename(pname+'/2dseq');
        n1=await getmatchingfiles(p2);
    }
    

    return { names : n1,
             len   : l
           };
};


let readParameterFile=async function(fname,debug=0) {

    debug = debug || 0;
    
    try {
        if (debug)
            console.log('Reading fname=',fname);
        let obj=null;
        try {
            obj=  await bisgenericio.read(fname,false);
        } catch(e) {
            console.log('Error =',e);
        }
        let lines= obj.data.split('\n');

        if (debug)
            console.log('Reading fname=',fname,' numlines=',lines.length);
        
        let outputlst = {};
        
        let i=0;
        while (i<lines.length-1) {
            let ln=lines[i];
            if (ln.indexOf('##$')===0) {
                let ind=ln.indexOf("=",ln);
                let name=ln.substr(3,ind-3);
                let val=ln.substr(ind+1).trim();
                if (val.indexOf('(')===0) {
                    let eind=val.indexOf(')');
                    let orange=val.substr(1,eind-1).trim();
                    let range=orange.split(",");
                    if (debug>0) {
                        if (range.length===1) {
                            dualPrint('Found 1d-array in line '+i+' name='+name+' range='+range[0]);
                        } else {
                            dualPrint('Found array in line '+i+' name='+name+' range=*'+orange+'* -->'+range.join(''));
                        }
                    }
                    // Read array
                    let j=i+1,found=false;
                    while (j<lines.length && found===false) {
                        ln=lines[j];
                        if (ln.indexOf('##$')===0 || ln.indexOf('$$')===0) {
                            found=1;
                        } else {
                            ++j;
                        }
                    }
                    j=j-1;
                    if (debug>1)
                        dualPrint('+++++ range of lines='+(i+1)+':'+j+' name='+name);
                    
                    outputlst[name]=[];
                    if (j<=i) {
                        for (let kb=0;kb<range.length;kb++)
                            outputlst[name].push(range[kb].trim());
                        
                    } else {
                        for (let k=i+1;k<=j;k++) {
                            let a=lines[k].trim().split(" ");
                            for (let ka=0;ka<a.length;ka++)
                                outputlst[name].push(a[ka].trim());
                        }
                        
                    }
                    i=i+(j-i);
                } else {
                    if (debug>1)
                        dualPrint('Found simple letiable in line '+ln+' ('+name+'='+val+')');
                    outputlst[name]=val;
                }
                ++i;
                

                
            } else {
                if (debug>1) {
                    if (ln.indexOf('$$')!==0 && ln.indexOf('##')!==0 && ln.size>1)
                        dualPrint('---- bad line'+i+'='+ln);
                    else if (ln.size>1)
                        dualPrint('____ ignoring line'+i+'='+ln);
                }
                ++i;
            }
        }
        return (outputlst);
    } catch(e) {
        return(-1);
    }

};

/**
 * @alias BisReadBruker.parseTextFiles
 */
let parseTextFiles = async function(filename,outprefix,debug,forceorient) {

    
    let data = {};
    debug = debug || false;

    data.originalfilename=filename;
    data.forceorient=userPreferences.sanitizeOrientationOnLoad(forceorient);

    if (debug)
        console.log('Force orient=',data.forceorient);
    
    let dirname = bisgenericio.getNormalizedFilename(bisgenericio.getDirectoryName(filename));
    let tailname = bisgenericio.getBaseName(filename);

    dualPrint('');
    dualPrint('+++++ reading '+filename);
    if (tailname!=='2dseq') {
        data.error='Bad Tailname !== 2dseq ';
        return data;
    } 

    let reconame=bisgenericio.getNormalizedFilename(bisgenericio.joinFilenames(dirname,'/reco'));
    let acqpname=bisgenericio.getNormalizedFilename(bisgenericio.joinFilenames(dirname,'../../acqp'));
    let methodname=bisgenericio.getNormalizedFilename(bisgenericio.joinFilenames(dirname,'../../method'));
    let visuname=bisgenericio.getNormalizedFilename(bisgenericio.joinFilenames(dirname,'/visu_pars'));
    let binname=bisgenericio.getNormalizedFilename(filename);


    if (debug)
        console.log('Starting ',reconame,visuname);
    
    data.havereco=false;
    
    //    let reco=null;
    let pw= await printFileStats(reconame);

    if (pw===1) {
        data.havereco=true;
        //reco=readParameterFile(reconame);
    }

    if (debug)
        console.log('++++ I Have Reco =',data.havereco);
    
    let arr=[ visuname,acqpname,methodname,binname];
    let numgood=0;
    for (let i=0;i<arr.length;i++) {
        let s=await printFileStats(arr[i],true);
        numgood+=s;
    }
    
    if (numgood<arr.length) {
        data.error='One or more files are missing';
        return data;
    }

    if (debug)
        console.log('Now reading actual files',numgood);

    if (debug)
        console.log('Reading Parameter File',visuname);
    let visu=await readParameterFile(visuname);
    if (debug)
        console.log('Reading Parameter File',methodname);
    let method=await readParameterFile(methodname);
    let acqp=await readParameterFile(acqpname);
    data.orient=method['PVM_SPackArrSliceOrient'] || 'axial';


    data.numechos=method['PVM_NEchoImages'];
    if (debug)
        console.log('Number of echos=',data.numechos);
    
    if (data.orient.length>1) {
        data.error='multi orientation localizer '+data.orient;
        return data;
    }
    data.orient=data.orient[0];
    
    data.method=method['Method'];
    data.patientpos=acqp['ACQ_patient_pos'];
    data.byteorder=visu['VisuCoreByteOrder'];
    data.wordtype=visu['VisuCoreWordType'];
    data.dims=visu['VisuCoreSize'];
    data.fov=visu['VisuCoreExtent'];
    data.names=visu['VisuFGElemId'] || [ ];
    if (data.names.length>1)
        data.description=visu['VisuFGElemComment'];
    else
        data.names=['Not set'];
    data.coreunits=visu['VisuCoreUnits'];
    if (data.coreunits[0]==="<mm>")
        data.fovscale=1.0;
    else
        data.fovscale=10.0;
    
    data.spa=[];
    data.twod=method['PVM_SpatDimEnum'];
    if (data.twod.indexOf('2D')>=0) {
        data.dims[2] = parseInt(method['PVM_SPackArrNSlices']);
        //data.dims[2]=data.dims[2];
        data.thick=parseFloat(acqp['ACQ_slice_thick']);
        data.gapmode=method['PVM_SPackArrSliceGapMode'][0];
        data.gap=parseFloat(method['PVM_SPackArrSliceGap'][0]);
        if (data.gapmode!=="contiguous")
            data.fov[2]=(data.thick+data.gap)*data.dims[2]/data.fovscale;
        else
            data.fov[2]=(data.thick)*data.dims[2]/data.fovscale;
    }
    for (let i=0;i<=2;i++)
        data.spa[i]=data.fov[i]*data.fovscale/data.dims[i];


    data.axis=method['PVM_SPackArrReadOrient'];
    data.repeats=method['PVM_NRepetitions'] || 1;

    if (data.wordtype==="_32BIT_SGN_INT") {
        data.bitpix=32;
    } else if (data.wordtype === "_16BIT_SGN_INT") {
        data.bitpix=16;
    } else {
        data.bitpix=0;
        data.error="unknown wordtype: "+data.wordtype;
    }

    
    if (debug)
        dualPrint('+++++ Dimensions & FOV='+data.dims+' spa=' +data.spa+' num repeats='+data.repeats);

    data.ndir = -1; data.nbval = 0; data.nb0 = 1;
    
    if (data.havereco) {
        
        data.diffdir=method['PVM_DwNDiffDir'] || false;
        if (data.diffdir !== false) {
            data.ndir   = parseInt(method['PVM_DwNDiffDir']);     // Number of directions (diffusion)
            data.nbval  = parseInt(method['PVM_DwNDiffExpEach']); // Number of b values (diffusion)
            data.nb0    = parseInt(method['PVM_DwAoImages']);     // Number of b = 0 ("A0") images (diffusion)
            data.dwdir= method['PVM_DwDir'];
        } 
    }

    data.offset=visu['VisuCoreDataOffs'];
    data.slopes=visu['VisuCoreDataSlope'];
    
    let index=data.method.indexOf(":");
    let index2=data.method.indexOf(">");
    let mname=data.method.substr(index+1,index2-index-1);
    data.basename=outprefix+"_"+mname;
    if (forceorient==="RAS")
        data.basename+="_ras";
    else if (forceorient === "LPS")
        data.basename+="_lps";
    
    if (data.ndir>0 && data.repeats<2)
        data.basename=data.basename+"_DTI";
    
    data.basename=data.basename.trim().replace(/ /g,'_').replace(/\t/g,'_').replace(/\(/g,'').replace(/\)/g,'');

    let a=bisgenericio.getBaseName(bisgenericio.getDirectoryName(bisgenericio.getNormalizedFilename(acqpname)));
    let b=bisgenericio.getBaseName(bisgenericio.getDirectoryName(bisgenericio.getNormalizedFilename(data.originalfilename)));
    data.displaynames=[ (a+"_"+mname+"_"+b).replace(/ /g,'_').replace(/\t/g,'_').replace(/\(/g,'').replace(/\)/g,'') ];

    return data;
};


/**
 * @alias BisReadBruker.createHeader
 */
let createHeader = function(data,debug) {

    debug=debug || false;
    if (debug)
        console.log('In Create Header');
    
    let header=new bisheader();
    header.initializenifti();
    header.createNIFTIHeader();
    let headerstruct = header.struct;
    
    if (data.bitpix===16) {
        headerstruct.datatype=4;
        headerstruct.bitpix=16;
    } else if (data.bitpix===32) {
        headerstruct.bitpix=32;
        headerstruct.datatype=8;
    }
    
    for (let ia=0;ia<=2;ia++) {
        headerstruct.dim[ia+1]=parseInt(data.dims[ia]);
        headerstruct.pixdim[ia+1]=parseFloat(data.spa[ia]);
    } /*else {
      // DTI is forwhatever reason flipped in
      // specifying dimensions
      // Nobody knows why.
      // Not sure
      headerstruct.dim[ia+1]=data.dims[1-ia];
      headerstruct.pixdim[ia+1]=data.spa[1-ia];
      }
      }*/

    if (data.repeats>1) {
        headerstruct.dim[0]=4;
        headerstruct.dim[4]=data.repeats;
    } else if (data.numechos>1) {
        headerstruct.dim[0]=4;
        headerstruct.dim[4]=data.numechos;
    }
    if (data.ndir>0) {
        headerstruct.dim[0]=4;
        headerstruct.dim[4]=data.ndir*data.nbval+data.nb0;
    }


    headerstruct.qform_code=0;
    headerstruct.sform_code=1;

    
    let origin= [ -data.fov[0]/2,-data.fov[1]/2, -data.fov[2]/2 ];
    
    if (data.orient==="axial") {
        headerstruct.srow_x = [ -data.spa[0], 0.0, 0.0, origin[0]];
        headerstruct.srow_y = [ 0.0, data.spa[1], 0.0,  origin[1] ];
        headerstruct.srow_z = [ 0.0, 0.0, data.spa[2],  origin[2] ];
    } else if (data.orient==="coronal" ) {
        headerstruct.srow_x = [ -data.spa[0], 0.0, 0.0, origin[0] ];
        headerstruct.srow_y = [ 0.0, 0.0, -data.spa[2], origin[2] ];
        headerstruct.srow_z = [ 0.0, -data.spa[1], 0.0, origin[1] ];
    } else {
        headerstruct.srow_x = [ 0.0, 0.0, data.spa[2], origin[2] ];
        headerstruct.srow_y = [ data.spa[0], 0.0, 0.0, origin[0]];
        headerstruct.srow_z = [ 0.0, -data.spa[1], 0.0, origin[1] ];
    }


    
    //  if (debug)
    //      dualPrint(headerstruct.srow_x.join("\t")+"\n"+headerstruct.srow_y.join("\t")+"\n"+headerstruct.srow_z.join("\t")+"\n");
    
    return header;
    
};

/**
 * @alias BisReadBruker.saveTextFiles
 */
let saveTextFiles = function(data) {

    return new Promise ( (resolve,reject) => {

        // -------------
        // Details file
        // -------------
        
        let exclude = [ 'slopes', 'offset', 'dwdir' ];
        
        let detailsname=data.basename+".txt";
        let details="#Image Header Info\n";
        let keys=Object.keys(data);
        for (let count=0;count<keys.length;count++) {
            let key=keys[count];
            if (exclude.indexOf(key)<0) {
                let isarr=Array.isArray(data[key]);
                if (isarr)
                    details+=key+": "+data[key].join(", ")+"\n";
                else
                    details+=key+": "+data[key]+"\n";
            }
        }
        //    if (debug)
        //      dualPrint("\n"+details+"\n");
        dualPrint("+++++ saving header info in "+detailsname);
        bisgenericio.write(detailsname,details).then( () => {
            data.detailsname=detailsname;
            
            // --------------------
            // DTI Directions File
            // --------------------
            if (data.ndir>0) {
                let directionsname=data.basename+".dat";
                let datatext=data.ndir+"\n";
                let dw=data.dwdir;
                let numdir=dw[2];
                for (let ka=0;ka<numdir;ka++) {
                    let x=[  dw[ka*3], dw[1+ka*3],dw[2+ka*3] ];
                    datatext=datatext+x.join(" ")+"\n";
                }
                dualPrint("+++++ saving directions in "+directionsname);
                bisgenericio.write(directionsname,datatext).then( () => {
                    data.directionsname=directionsname;
                    resolve();
                }).catch( (e) => {
                    reject(e);
                });
            } else {
                resolve('');
            }
        }).catch( (e) => { reject(e); });
    });
};

// ---------------------------------------------------------------------------------------------------
/**
 * @alias BisReadBruker.directSaveImage
 */
let directSaveImage=async function(part_img,part_imageoutname,forceorient) {

    console.log('In Direct Save',part_img.getDescription(),part_imageoutname,forceorient);

    if (forceorient) {
        let dat=part_img.serializeToNII();
        let output=new BisWebImage();
        output.initialize();
        output.debug=0;
        output.parseNIIModular(dat.buffer,forceorient);
        await output.save(part_imageoutname);
    } else {
        await part_img.save(part_imageoutname);
    }

    let fileSizeInBytes = await bisgenericio.getFileSize(part_imageoutname);
    dualPrint("+++++ saved image in "+part_imageoutname+", size="+fileSizeInBytes);
    return true;
};


/** 
 * @alias BisReadBruker.saveRegularImage
 */
let saveRegularImage =  function (data,debug) {

    return new Promise( (resolve,reject) => {
    
        let header=createHeader(data,debug);
        
        let headerbin=header.createHeaderRawData(false);
        
        
        if (debug)
            dualPrint('+++++ Reading data from filename='+data.originalfilename);
        
        
        bisgenericio.read(data.originalfilename,true).then( (obj) => {
            let raw_file_data=obj.data;
            
            let rawdata = new Uint8Array(raw_file_data);
            let c=new Uint8Array(headerbin.length+rawdata.length);
            
            c.set(headerbin.data);
            c.set(rawdata,headerbin.length);
            
            headerbin=null;
            rawdata=null;
            raw_file_data=null;
            
            let img=new BisWebImage();
            img.initialize();
            img.parseNIIModular(c.buffer,data.forceorient);
            dualPrint("+++++ created image "+img.getDescription());
            
            
            if (data.numechos>1) {
                
                let newimg=new BisWebImage();
                newimg.cloneImage(img);
                
                
                let dat=img.getImageData();
                let odat=newimg.getImageData();
                
                let dim=img.getDimensions();
                let slicesize=dim[0]*dim[1];
                
                let total=dim[2]*dim[3];
                
                for (let inslice=0;inslice<total;inslice++) {
                    let slice=Math.floor(inslice/data.numechos);
                    let frame=inslice-slice*data.numechos;
                    let outslice=slice+frame*dim[2];
                    
                    let inoffset=inslice*slicesize;
                    let outoffset=outslice*slicesize;
                    
                    for (let k=0;k<slicesize;k++) {
                        odat[outoffset+k]=dat[inoffset+k];
                    }
                    
                }
                img=newimg;
                newimg=null;
            }
            
            debug=true;
            
            let imghead=img.getHeader();
            //    if (debug)
            dualPrint("+++++ Normal Image Dimensions = "+imghead.struct.dim+", spa=" +imghead.struct.pixdim);
            
            let imageoutname=data.basename+".nii.gz";
            //    img.addQuaternionCode(biswrap);
            directSaveImage(img,imageoutname,false).then( () => {
    
                data.imageDimensions=img.getDimensions();
                
                data.partnames=[ bisgenericio.getNormalizedFilename(bisgenericio.getNormalizedFilename(imageoutname))];
                saveTextFiles(data,debug).then( () => {
                    dualPrint('Text files saved');
                    c=null;
                    img=null;
                    resolve();
                });
            }).catch( (e) => { reject(e); });
        }).catch( (e) => { reject(e); });
    });
};

// ---------------------------------------------------------------------------------------------------
/**
 * @alias BisReadBruker.saveMultiPartReconstructedDTIFile
 */

let saveMultiPartReconstructedDTIFile = async function(data,debug) {

    let filename=data.originalfilename;
    let header=createHeader(data,debug);
    let raw_file_data=await bisgenericio.read(filename,true).data;

    let dt = new Uint8Array(raw_file_data).buffer;
    
    let castarray=null;
    if (data.wordtype!=="_32BIT_SGN_INT") 
        castarray=new Int16Array(dt);
    else
        castarray=new Int32Array(dt);
    
    //  let headerbin=header.createHeaderRawData(false);
    if (debug)
        dualPrint('+++++ Reading data from filename='+filename);
    
    let offset=data.offset;
    let slopes=data.slopes;

    dualPrint("+++++ This is Processed DTI Data "+data.names.length+' slices='+data.dims[2]+' elements='+data.names.length+' total='+data.dims[2]*data.names.length+' repeats='+data.repeats+', offsets='+offset.length+','+slopes.length);
    if (debug)
        dualPrint("+++++ fa slope ="+slopes[0]);
    
    // [ FA ]
    // [ Tensor ] DXX DXY DXZ DYY DYZ DZZ  ]
    // [ Eigenvalues 1-3 ]
    // [ Baseline DTI_A0 ]
    let elements = { 
        fa : [ "<DTI_FA>" ],
        trace : [ "<DTI_TRACE>" ],
        baseline : [ "<DTI_A0>"] ,
        tensor : [ "<DTI_DXX>","<DTI_DXY>", "<DTI_DXZ>", "<DTI_DYY>",  "<DTI_DYZ>" , "<DTI_DZZ>" ],
        eigenvalues : [ "<DTI_L1>", "<DTI_L2>", "<DTI_L3>" ],
        eigenvectors : [ "<DTI_L1X>", "<DTI_L1Y>", "<DTI_L1Z>", "<DTI_L2X>", "<DTI_L2Y>", "<DTI_L2Z>", "<DTI_L3X>", "<DTI_L3Y>", "<DTI_L3Z>" ]
    };

    
    let outputs=Object.keys(elements);
    let slicesize=data.dims[0]*data.dims[1];
    let allslicesize=slicesize*data.names.length;
    let volumesize=slicesize*data.dims[2];
    let headerstruct = header.struct;
    let repeatsize=volumesize*data.names.length;
    
    
    if (debug) {
        dualPrint('+++++ Reading data from filename='+filename);
        dualPrint("\n+++++ Number of Elements="+castarray.length+" "+raw_file_data.length+" or "+data.dims[0]*data.dims[1]*data.dims[2]*data.names.length);
        dualPrint("+++++ sliceoffset = "+slicesize+" volume ="+volumesize+" allslices="+allslicesize);
    }
    let debugvoxel=(data.dims[0]/2-5)+data.dims[0]*(data.dims[1]/2);

    data.partnames=[];
    data.displaynames=[];

    for (let ia=0;ia<outputs.length;ia++) {
        let key=outputs[ia];
        let numelements=elements[key].length;
        let indices=[];
        for (let ib=0;ib<numelements;ib++) {
            let el=elements[key][ib];
            indices.push(data.names.indexOf(el));
        }

        if (debug)
            dualPrint("\n\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

        dualPrint("+++++ Working on _"+key+"_ num elements="+numelements+", indices="+indices.join(":")+" names="+elements[key].join(","));
        let okey="part_"+key;
        data[okey]=elements[key];
        
        headerstruct.dim[4]=indices.length;
        if (indices.length>1) 
            headerstruct.dim[0]=4;
        else
            headerstruct.dim[0]=3;
        headerstruct.bitpix=32;
        headerstruct.datatype=16;

        let part_img=new BisWebImage();
        part_img.createFromHeader(header);
        if (debug)
            dualPrint("Created image "+part_img.getDescription());
        
        let dat_arr=part_img.getImageData();
        if (debug)
            dualPrint("+++++ Size of dat_arr = "+dat_arr.length + " vs "+ data.dims[0]*data.dims[1]*data.dims[2]*indices.length);

        for (let repeats=0;repeats < data.repeats;repeats++) {

            for (let attribute=0;attribute<indices.length;attribute++) {
                let inattr=indices[attribute];
                let inattroffset=inattr*slicesize+repeats*repeatsize;
                let outattroffset=attribute*volumesize;
                if (debug)
                    dualPrint('Working on Attribute = '+(attribute+1) +"/"+ indices.length + " copying from "+inattr+" inoffset="+inattroffset+" outoffset="+outattroffset);
                for (let slice=0;slice<data.dims[2];slice++) {
                    let scale=parseFloat(slopes[inattr+slice*data.names.length+repeats*data.names.length*data.dims[2]]);
                    let shift=parseFloat(offset[inattr+slice*data.names.length+repeats*data.names.length*data.dims[2]]);
                    let outsliceoffset=slice*slicesize;
                    let insliceoffset=slice*allslicesize;
                    if (slice%7 ===0 && slice>0 && debug)
                        dualPrint("\tSlice = "+slice+"/"+data.dims[2]+" [ shift,scale] ="+[ shift,scale]);
                    for (let voxel=0;voxel<slicesize;voxel++) {
                        let inputindex=voxel+insliceoffset+inattroffset;
                        let outputindex=voxel+outsliceoffset+outattroffset;
                        let value=castarray[inputindex];
                        if (value !== value)
                            value=0.0;
                        let outvalue=(value+0.0)*scale+shift;
                        dat_arr[outputindex]=outvalue;
                        if (debugvoxel===voxel && slice%7 ===0 && slice>0 && debug)
                            dualPrint("\t\t voxel="+voxel+" indices="+[inputindex,outputindex]+" values="+[ value,outvalue]);
                    }
                }
            }

            let extra="";
            if (data.repeats>1)
                extra="_"+(repeats+1);
            
            let part_imageoutname=data.basename+"_"+key+extra+".nii.gz";
            
            let a=bisgenericio.getBaseName(bisgenericio.getDirectoryName(bisgenericio.getDirectoryName(bisgenericio.getDirectoryName(bisgenericio.getNormalizedFilename(filename)))));
            let b=bisgenericio.getBaseName(bisgenericio.getDirectoryName(bisgenericio.getNormalizedFilename(filename)));
            let c=key+extra+":"+a+"_"+b;

            data.partnames.push( bisgenericio.getNormalizedFilename(bisgenericio.getNormalizedFilename(part_imageoutname)));
            data.displaynames.push(c.replace(/ /g,'_').replace(/\t/g,'_').replace(/\(/g,'').replace(/\)/g,''));
            
            await directSaveImage(part_img,part_imageoutname,data.forceorient);
        }
    }
    
    saveTextFiles(data,debug);
    return data;
    

};

// ---------------------------------------------------------------------------------------------------
/**
 * @alias BisReadBruker.saveMultiPartDTIFile
 */

let saveMultiPartDTIFile = async function(data,debug) {
    let filename=data.originalfilename;
    
    // Create Header
    let header=createHeader(data,debug);

    //
    let raw_file_data=await bisgenericio.read(filename,true).data;
    let dt = new Uint8Array(raw_file_data).buffer;
    
    let castarray=null;
    //let numbytes=2;
    if (data.wordtype!=="_32BIT_SGN_INT")  {
        castarray=new Int16Array(dt);
    } else {
        castarray=new Int32Array(dt);
      //  numbytes=4;
    }
    
    //  let headerbin=header.createHeaderRawData(false);
    if (debug)
        dualPrint('+++++ Reading data from filename='+filename);
    
    dualPrint("+++++ This is MultiPart DTI Data ");

    
    let slicesize=data.dims[0]*data.dims[1];
    let volumesize=slicesize*data.dims[2];
    
    data.partnames=[];
    data.displaynames=[];

    let part_img=new BisWebImage();
    part_img.createFromHeader(header);
    
    if (debug)
        dualPrint("Created image "+part_img.getDescription());
    
    let dat_arr=part_img.getImageData();

    for (let ia=0;ia<data.repeats;ia++) {

        let inoffset=ia*volumesize;
        
        dualPrint("\n++++++ Working on part "+(ia+1)+"/"+data.repeats+", offset="+inoffset);
        
        for (let voxel=0;voxel<volumesize;voxel++) {
            let value=castarray[inoffset+voxel];
            if (value !== value)
                value=0.0;
            dat_arr[voxel]=value;
        }
        
        let extra="";
        if (data.repeats>1)
            extra="_"+(ia+1);
        
        let part_imageoutname=data.basename+"_dti"+extra+".nii.gz";
        
        let a=bisgenericio.getBaseName(bisgenericio.getDirectoryName(bisgenericio.getDirectoryName(bisgenericio.getDirectoryName(bisgenericio.getNormalizedFilename(filename)))));
        let b=bisgenericio.getBaseName(bisgenericio.getDirectoryName(bisgenericio.getNormalizedFilename(filename)));
        let c="dti"+extra+":"+a+"_"+b;
        data.partnames.push( bisgenericio.getNormalizedFilename(bisgenericio.getNormalizedFilename(part_imageoutname)));
        data.displaynames.push(c.replace(/ /g,'_').replace(/\t/g,'_').replace(/\(/g,'').replace(/\)/g,''));

        await directSaveImage(part_img,part_imageoutname,data.forceorient);
    }

    part_img=null;

    saveTextFiles(data,debug);
    return Promise.resolve(data);
    
};

/** 
 * @alias BisReadBruker.readFile
 * @param {String} filename - the filename to read file from
 * @param {String} outprefix - the filename to save file to
 * @param {String} forceorient -- if true or RAS force output to RAS (axial), else if "LPS" force to LPS else keep as is
 * @param {Boolean} debug - if true print extra messages
 * @returns {Boolean} 
 */
let readFile = async function (filename,outprefix,forceorient,debug=false) {

    console.log('\n\n\n\n Force orient input in readFile=',forceorient);

    
    let data=await parseTextFiles(filename,outprefix,debug,forceorient);
    let error=data.error || "";
    if (error!=="") {
        return data;
    }

    // Save Text Files

    dualPrint("+++++ "+data.basename);


    
    if (data.ndir>0 && data.repeats>1) {
        dualPrint("_____ Processing as multi part raw dti file.");
        await saveMultiPartDTIFile(data,debug);
    } else if (data.names[0]!=="<DTI_FA>" ) {
        dualPrint("_____ Processing as normal file.");
        await saveRegularImage(data,debug);
    } else {
        dualPrint("_____ Processing as multi part reconstructed dti file.");
        await saveMultiPartReconstructedDTIFile(data,debug);
    }

    return data;
};


/** 
 * @alias BisReadBruker.readMultiple FIles
 * @param {String} inputpath - the input path to query
 * @param {String} outprefix - the file prefix to save file to
 * @param {Boolean} forceorient -- if true force output to RAS (axial)
 * @param {Function} addcallback -- a callback for gui updates that is
 * called each time a new file was converted. It takes three arguments,
 * (i) name, (ii) image filename, (iii) text filename
 * @param {Function} infocallback -- creates a message on the screen (if needed)
 * @param {Boolean} debug - if true print extra messages
 * @returns {Boolean} 
 */
let readMultiple= async function (filename,outprefix,forceorient,addcallback,infoCallback=null,debug=false) {

    if (debug)
        console.log('In Read Multiple');
    
    try {
        let p=await bisgenericio.isDirectory(outprefix);
        if (!p) {
            return [ false, ' cannot write to '+outprefix+'. It is not a directory\n'];
        }
    } catch(e) {
        return [ false, e ];
    }

    let tmp_txt=[ filename, outprefix,forceorient ].join(" ");
    try {
        await bisgenericio.write(bisgenericio.joinFilenames(outprefix,"log.txt"),tmp_txt);
    } catch (e) {
        return [false,'Cannot write to output directory '+outprefix];
    }

    
    addcallback=addcallback || null;
    let joblist = [];
    debug = debug || false;
    forceorient=forceorient || '';

    let addElement = function (name,fname,infoname) {
        joblist.push({ name  : name,
                       filename : bisgenericio.getBaseName(fname),
                       details : bisgenericio.getBaseName(infoname),
                     });
        if (addcallback !== null)
            addcallback(name,fname,infoname);
        else
            dualPrint("+++++ adding "+name+" "+[ fname,infoname].join(","));
    };
    

    let obj=await getMatchingFilenames(filename);
    let fnames=obj.names;
    let len=obj.len;
    
    if (fnames.length<1) {
        return [ false, 'no files found'];
    }

    // Generate Filenames
    let subjectname="";
    let fnamepairs = [];
    for (let counter=0;counter<fnames.length;counter++) {
        let ifile=fnames[counter].substr(len,fnames[counter].length-len);
        if (counter===0) {
            let dirname = bisgenericio.getDirectoryName(bisgenericio.getDirectoryName(bisgenericio.getNormalizedFilename(bisgenericio.getDirectoryName(fnames[0]))));
            let visuname=bisgenericio.joinFilenames(dirname,"visu_pars");
            let visu=await readParameterFile(visuname);
            if (visu['VisuSubjectId'][0].length>2)
                subjectname=visu['VisuSubjectId'][0].substr(1,visu['VisuSubjectId'][0].length-2);
        }

        let d1=bisgenericio.getDirectoryName(ifile);
        let d2=bisgenericio.getNormalizedFilename(d1," "); // " " is to prevent absolute
        let a=d2.split(bisgenericio.getPathSeparator());

        if (subjectname.length>1)
            a[0]=subjectname;
        let ofile="";
        let last="";
        let index=0;

        let maxa=a.length;
        console.log('Last =',a[a.length-1]);
        if (a[a.length-1]==="1")
            maxa=maxa-1;
        
        for (let ia=0;ia<maxa;ia++) {
            if (a[ia]!=="pdata") {
                ofile+=last;
                last=a[ia];
            } else {
                index=parseInt(last) || 0;
                if (index>0) {
                    if (index<10 && index>0)
                        ofile+=`s${last}`;
                    else
                        ofile+=`s${last}`;
                } else {
                    ofile+=last;
                }
                last="";
            }
            
            if (ia<maxa-1 && ia>0)
                ofile+="_";
            else if (ia>0)
                ofile+=last;
        }

        fnamepairs.push( {
            inp : fnames[counter],
            out : ofile,
            index : index,
        });
    }

    fnamepairs=fnamepairs.sort( ((a,b)=> {
        if (a.index<b.index)
            return -1;
        if (a.index>b.index)
            return 1;
        return 0;
    }));


    // Output Stuff
    let maxcounter=fnamepairs.length;
    for (let counter=0;counter<maxcounter;counter++) {
        let ifile=fnamepairs[counter].inp;
        let ofile=fnamepairs[counter].out;
        ofile=bisgenericio.joinFilenames(outprefix,ofile);

        if (infoCallback)
            await infoCallback('Converting '+ifile+' ->'+ofile);
        
        let data=await readFile(ifile,ofile,forceorient);
        let error=data.error || "";
        if (error !="" ) {
            dualPrint('----- ERROR: '+error);
        } else {
            let isarr=Array.isArray(data.displaynames);
            if (isarr) {

                let fov=[ ];
                for (let i=0;i<data.fov.length;i++) {
                    fov.push(Math.round(data.fov[i]*100)/100);
                }
                
                let l=data.displaynames.length;
                for (let ic=0;ic<l;ic++) {
                    let nm=data.displaynames[ic]+' ('+data.imageDimensions.join(',')+')'+' ('+fov.join(',')+')';
                    console.log('name=',data.displaynames[ic],data.dims,nm);
                    data.displaynames[ic]=nm;
                    addElement(`${nm}`,data.partnames[ic],data.detailsname);
                }
            } else {
                console.log('Here ...',data.displaynames);
                addElement(`${data.displaynames} (${data.dims.join(',')})`,data.partnames,data.detailsname);
                //                addElement(data.displaynames,data.partnames,data.detailsname);
            }
        }
    }
    
    let jobname="";
    if (forceorient==="RAS")
        jobname=bisgenericio.joinFilenames(outprefix,"settings_RAS.json");
    else if (forceorient==="LPS")
        jobname=bisgenericio.joinFilenames(outprefix,"settings_LPS.json");
    else
        jobname=(bisgenericio.joinFilenames(outprefix,"settings.json"));


    let outobj = {
        bisformat : "ParavisionJob",
        job : joblist,
    };
    let txt=JSON.stringify(outobj, null, 2);
    await bisgenericio.write(jobname,txt);
    return [ true, 'saved job in '+jobname ];
};




// ------------------------------------------------------------------

const algo = { 
    readFile : readFile,
    readMultiple: readMultiple,
    getMatchingFilenames : getMatchingFilenames,
};

module.exports = algo;





