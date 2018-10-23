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

/* global document,Image */
"use strict";

const genericio=require('bis_genericio');
const webfileutil=require('bis_webfileutil');
const webutil=require('bis_webutil');
const BisWebMatrix=require('bisweb_matrix.js');
const $=require('jquery');

const imagepath=webutil.getWebPageImagePath();
// ---------------------------------------------------------------------------------
//  GLOBAL UTILITIES
// ---------------------------------------------------------------------------------
let bisweb_mni2tal={   };

bisweb_mni2tal.MNI = [ 90, 90, 72 ];
bisweb_mni2tal.DIMENSIONS = [ 181,217,181];
bisweb_mni2tal.MNIMIN = [ -90, -126,-72 ];
bisweb_mni2tal.MNIMAX = [ 90, 90,108 ];
bisweb_mni2tal.MNIFLIP = [ true,true,false];

bisweb_mni2tal.convertMNIToSlice= function(plane, value) {
    
    let a=Math.round(value);
    if (bisweb_mni2tal.MNIFLIP[plane])
        a=-value;
    
    let b=a+bisweb_mni2tal.MNI[plane];
    return b;
};

bisweb_mni2tal.convertSliceToMNI=function(plane, value) {
    let mni=Math.round(value)-bisweb_mni2tal.MNI[plane];
    if (bisweb_mni2tal.MNIFLIP[plane])
        mni=-mni;
    return mni;
};

bisweb_mni2tal.BRODMANNLABELS = {
    1 : 'PrimSensory (1)',   4 : 'PrimMotor (4)',
    5 : 'SensoryAssoc (5)',  6 : 'BA6',
    7 : 'BA7',              8 : 'BA8',
    9 : 'BA9',              10 : 'BA10',
    11 : 'BA11',            13 : 'Insula (13)',
    14 : 'BA14',            17 : 'PrimVisual (17)',
    18 : 'VisualAssoc (18)', 19 : 'BA19',
    20 : 'BA20',            21 : 'BA21',
    22 : 'BA22',            23 : 'BA23',
    24 : 'BA24',            25 : 'BA25',
    30 : 'BA30',            31 : 'BA31',
    32 : 'BA32',            34 : 'BA34',
    36 : 'Parahip (36)',     37 : 'Fusiform (37)',
    38 : 'BA38',            39 : 'BA39',
    40 : 'BA40',            41 : 'PrimAuditory (41)',
    44 : 'BA44',            45 : 'BA45',
    46 : 'BA46',            47 : 'BA47',
    48 : 'Caudate (48)',     49 : 'Putamen (49)',
    50 : 'Thalamus (50)',    51 : 'GlobPal (51)',
    52 : 'NucAccumb (52)',   53 : 'Amygdala (53)',
    54 : 'Hippocampus (54)', 55 : 'Hypothalamus (55)',
};

bisweb_mni2tal.BRODMANINDICES = [ 1, 4, 5, 6, 7, 8, 9, 10, 11, 13, 17, 18, 19, 20, 21, 22, 23, 24, 25, 30, 31, 32, 34, 36, 37, 38, 39, 40, 41, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55];

bisweb_mni2tal.BRODLOCATIONS = [
    1,131,117,119,50,117,119,
    4,128,108,117,54,109,120,
    5,105,123,120,76,123,120,
    6,118,91,123,62,92,124,
    7,113,150,133,72,151,127,
    8,112,64,117,67,66,116,
    9,125,51,103,51,56,109,
    10,113,35,79,67,35,76,
    11,102,53,53,79,52,53,
    13,134,86,72,48,86,71,
    17,101,168,81,79,171,79,
    18,119,182,74,71,182,74,
    19,134,165,77,45,165,83,
    20,138,107,41,43,104,38,
    21,150,117,63,31,115,59,
    22,144,109,73,33,110,73,
    23,99,135,96,80,135,96,
    24,95,85,103,85,89,104,
    25,97,73,58,85,73,59,
    30,102,135,80,78,133,80,
    31,98,138,111,82,139,110,
    32,96,57,88,85,51,92,
    34,121,87,57,62,87,55,
    36,116,109,47,64,110,50,
    37,137,141,58,43,142,60,
    38,130,79,42,47,77,42,
    39,136,149,103,44,150,105,
    40,141,123,106,37,122,105,
    41,140,111,79,38,109,79,
    44,139,78,89,42,77,89,
    45,136,64,79,43,63,78,
    46,133,52,84,44,52,80,
    47,128,60,60,50,59,59,
    48,104,77,83,79,77,82,
    49,115,87,71,64,87,71,
    50,100,109,78,81,107,78,
    51,109,90,70,70,90,70,
    52,100,80,60,79,81,61,
    53,111,91,50,66,90,51,
    54,118,112,58,61,109,57,
    55,93,91,61,86,92,61];

// ---------------------------------------------------------------------------------
//  S L I C E    V I E W E R
// ---------------------------------------------------------------------------------


bisweb_mni2tal.SliceViewer=class {

    constructor (parent,name,width,height,plane) { 

        this.parentWidget=parent;
        this.myCanvas=null;
        this.lineCanvas=null;
        this.myCanvasContext=null;
        this.lineCanvasContext=null;
        
        this.width=-1;
        this.height=-1;
        this.imgwidth=-1;
        this.imgheight=-1;
        this.imgslices=-1;
        this.myplane=0;
        
        this.myImage=null;// ImageElement;
        this.overlayImage=null;// ImageElement;
        
        this.linecolors = [ "#ee0000", "#00ee00", "#0000ee" ];
        this.current_slice=-1;
        this.current_horizontal=-1;
        this.current_vertical=-1;
        this.drawlines=false;
        this.drawoverlay=false;
        this.drawimage=false;
        this.overlayopacity=0.0;  
        
        this.width=width;
        this.height=height;
        this.myplane=plane;
        this.myCanvas = this.parentWidget.querySelector(name);
        this.myCanvas.width=width;
        this.myCanvas.height=height;
        this.myCanvasContext=this.myCanvas.getContext("2d");
        this.myCanvasContext.fillStyle="#777000";
        this.myCanvasContext.fillRect(0,0,width,height);
    }
    
    CreateLineCanvas(name) {

        this.lineCanvas=this.parentWidget.querySelector(name);
        this.lineCanvas.width=this.width;
        this.lineCanvas.height=this.height;
        this.lineCanvasContext=this.lineCanvas.getContext("2d");
        this.drawlines=true;
    }
    
    SetImage(image,width,height,numslices) {
        this.myImage=image;
        this.imgwidth=width;
        this.imgheight=height;
        this.imgslices=numslices;
        this.drawimage=true;
        this.SetSlice(bisweb_mni2tal.MNI[this.myplane]);
        if (this.myplane==2) 
            this.SetCrossHairs(this.imgwidth/2,this.imgheight/2,this.numslices/2);
        else if (this.myplane==1)
            this.SetCrossHairs(this.imgwidth/2,this.numslices/2,this.imgheight/2);
        else
            this.SetCrossHairs(this.numslices/2,this.imgwidth/2,this.imgheight/2);
    }
    
    SetOverlayImage(image) {
        this.overlayImage=image;
        this.drawoverlay=true;
    }
    
    SetSlice(slice, force) {
        
        if (force === 'undefined')
            force=false;
        if (this.drawimage==false)
            return;
        
        if (force) {
            slice=Math.floor(this.current_slice);
        } else if (slice==this.current_slice) {
            return;
        }
        
        if (slice<0 || slice>=this.imgslices)
            this.slice=bisweb_mni2tal.MNI[this.myplane];
        this.current_slice=slice;
        
        if (this.myplane==2) { 
            let sourceX=this.current_slice*this.imgwidth;
            let sourceY=0;     
            let sourceWidth=this.imgwidth;
            let sourceHeight=this.imgheight;
            if (this.drawoverlay && this.overlayopacity>0.1) {
                this.myCanvasContext.drawImage(this.overlayImage,
                                               sourceX, sourceY, sourceWidth, sourceHeight,
                                               0,0,this.width,this.height);
                
            } else if (this.drawimage) {
                this.myCanvasContext.drawImage(this.myImage,
                                               sourceX, sourceY, sourceWidth, sourceHeight, 
                                               0,0,this.width,this.height);
            }
        } else if (this.myplane==1) {
            let sourceWidth=this.imgwidth;
            //let sourceHeight=this.imgslices;
            let sourceY=this.current_slice;
            
            for (let i=0;i<this.imgheight;i++) {
                let sourceX=i*this.imgwidth;
                if (this.drawoverlay && this.overlayopacity>0.1)  {
                    this.myCanvasContext.drawImage(this.overlayImage,
                                                   sourceX, sourceY, sourceWidth, 1, 
                                                   0,this.imgheight-i-1,this.width,1);
                } else if (this.drawimage) {
                    this.myCanvasContext.drawImage(this.myImage,
                                                   sourceX, sourceY, sourceWidth, 1, 
                                                   0,this.imgheight-i-1,this.width,1);
                }
            }
        } else if (this.myplane==0) {
            let sourceHeight=this.imgslices;
            let sourceY=0;
            let tx=0;
            let ty=this.imgheight;
            let theta=-0.5*3.141592685;
            
            this.myCanvasContext.translate(tx, ty);
            this.myCanvasContext.rotate(theta);
            
            for (let i=0;i<this.imgslices;i++) {
                let sourceX=i*this.imgwidth+this.current_slice;
                if (this.drawoverlay && this.overlayopacity>0.1)  {
                    this.myCanvasContext.drawImage(this.overlayImage,
                                                   sourceX, sourceY, 1, sourceHeight, 
                                                   i,0,1,sourceHeight);
                } else if (this.drawimage) {
                    this.myCanvasContext.drawImage(this.myImage,
                                                   sourceX, sourceY, 1, sourceHeight, 
                                                   i,0,1,sourceHeight);
                }
            }
            this.myCanvasContext.rotate(-theta);
            this.myCanvasContext.translate(-tx,-ty);
            
        }
        
        let mni=bisweb_mni2tal.convertSliceToMNI(this.myplane,this.current_slice);
        let axisname = [ "X", "Y", "Z"];
        this.myCanvasContext.fillStyle = "#eeeeee";
        this.myCanvasContext.font="14px Arial";
        if (this.myplane!=0) {
            this.myCanvasContext.textAlign="right";
            this.myCanvasContext.fillText("L", this.width-1,this.height/2);
            this.myCanvasContext.textAlign="left";
            this.myCanvasContext.fillText("R", 1,this.height/2);
        }
        this.myCanvasContext.fillText('MNI '+axisname[this.myplane]+'='+mni,5,25);
        
    }
    
    
    SetCrossHairs(x,y,z) {
        
        if (this.drawlines==false)
            return;
        
        x=Math.floor(x);
        y=Math.floor(y);
        z=Math.floor(z);
        
        let horizontal=0;
        let vertical=0;
        let hcolor=0;
        let vcolor=0;
        
        let x0=x+0.5;
        let y0=y+0.5;
        let z0=z+0.5;
        
        switch(this.myplane) {
        case 0:
            horizontal=Math.round(y0);
            vertical=Math.round(z0);
            hcolor=1;
            vcolor=2;
            break;
        case 1:
            horizontal=Math.round(x0);
            vertical=Math.round(z0);
            hcolor=0;
            vcolor=2;
            break;
        case 2:
            horizontal=Math.round(x0);
            vertical=Math.round(y0);
            hcolor=0;
            vcolor=1;
            break;
        }
        
        if (horizontal===this.current_horizontal && vertical===this.current_vertical)
            return;
        
        if (this.current_vertical>=0)
            this.lineCanvasContext.clearRect(0,this.current_vertical-1,this.width,3);
        if (this.current_horizontal>=0)
            this.lineCanvasContext.clearRect(this.current_horizontal-1,0,3,this.height);
        this.current_horizontal=horizontal;
        this.current_vertical=vertical;
        
        this.lineCanvasContext.fillStyle=this.linecolors[hcolor];
        this.lineCanvasContext.fillRect(0,vertical,this.width,1);
        this.lineCanvasContext.fillStyle=this.linecolors[vcolor];
        this.lineCanvasContext.fillRect(horizontal,0,1,this.height);
    }
};


// ---------------------------------------------------------------------------------
//  O R T H O    V I E W E R
// ---------------------------------------------------------------------------------


class OrthoViewer {

    constructor(parentwidget) {

        this.parentWidget=parentwidget;
        this.Viewers=null;
        this.Sliders=null;
        this.SliderLabels=null;
        this.TalSliderLabels=null;
        
        this.BrodmanElement=null;
        this.TalairachLookup=null;
        this.brodmannLookup=null;
        this.MNILookup=null;
        this.Mosaic=null;
        this.Overlay=null;
        this.InternalCanvas=null;
        this.InternalContext=null;
        
        this.CrossHairLocation = [ 0 , 0 ,0 ];
        this.allLoaded=false;
        this.previousmouseevent=-1;
        this.enableTalairachLabelsUpdate=true;
        this.brodlist=[];
    }
    
    createViewers() {

        let v1=new bisweb_mni2tal.SliceViewer(this.parentWidget,"#zviewer",bisweb_mni2tal.DIMENSIONS[0],bisweb_mni2tal.DIMENSIONS[1],2);
        let v2=new bisweb_mni2tal.SliceViewer(this.parentWidget,"#yviewer",bisweb_mni2tal.DIMENSIONS[0],bisweb_mni2tal.DIMENSIONS[2],1);
        let v3=new bisweb_mni2tal.SliceViewer(this.parentWidget,"#xviewer",bisweb_mni2tal.DIMENSIONS[1],bisweb_mni2tal.DIMENSIONS[2],0);
        
        v1.CreateLineCanvas("#zlines");
        v2.CreateLineCanvas("#ylines");
        v3.CreateLineCanvas("#xlines");
        
        this.Viewers = [ v3,v2,v1];

        v1.lineCanvas.addEventListener('mousedown',(fe) => this.handleMouseEvent(2,fe,0,v1.lineCanvas));
        v2.lineCanvas.addEventListener('mousedown',(fe) => this.handleMouseEvent(1,fe,0,v2.lineCanvas));
        v3.lineCanvas.addEventListener('mousedown',(fe) => this.handleMouseEvent(0,fe,0,v3.lineCanvas));
        
        v1.lineCanvas.addEventListener('mousemove',(fe) => this.handleMouseEvent(2,fe,1,v1.lineCanvas));
        v2.lineCanvas.addEventListener('mousemove',(fe) => this.handleMouseEvent(1,fe,1,v2.lineCanvas));
        v3.lineCanvas.addEventListener('mousemove',(fe) => this.handleMouseEvent(0,fe,1,v3.lineCanvas));
        
        v1.lineCanvas.addEventListener('mouseup',(fe) => this.handleMouseEvent(2,fe,2,v1.lineCanvas));
        v2.lineCanvas.addEventListener('mouseup',(fe) => this.handleMouseEvent(1,fe,2,v2.lineCanvas));
        v3.lineCanvas.addEventListener('mouseup',(fe) => this.handleMouseEvent(0,fe,2,v3.lineCanvas));
        
        v1.lineCanvas.addEventListener('mouseleave',(fe) => this.handleMouseEvent(2,fe,2,v1.lineCanvas));
        v2.lineCanvas.addEventListener('mouseleave',(fe) => this.handleMouseEvent(1,fe,2,v2.lineCanvas));
        v3.lineCanvas.addEventListener('mouseleave',(fe) => this.handleMouseEvent(0,fe,2,v3.lineCanvas));
        
        v1.lineCanvas.addEventListener('onTouchStart',(fe) => this.handleMouseEvent(2,fe,0,v1.lineCanvas));
        v2.lineCanvas.addEventListener('onTouchStart',(fe) => this.handleMouseEvent(1,fe,0,v2.lineCanvas));
        v3.lineCanvas.addEventListener('onTouchStart',(fe) => this.handleMouseEvent(0,fe,0,v3.lineCanvas));
        
        v1.lineCanvas.addEventListener('onTouchEnd',(fe) => this.handleMouseEvent(2,fe,2,v1.lineCanvas));
        v2.lineCanvas.addEventListener('onTouchEnd',(fe) => this.handleMouseEvent(1,fe,2,v2.lineCanvas));
        v3.lineCanvas.addEventListener('onTouchEnd',(fe) => this.handleMouseEvent(0,fe,2,v3.lineCanvas));
        
        v1.lineCanvas.addEventListener('touchLeave',(fe) => this.handleMouseEvent(2,fe,2,v1.lineCanvas));
        v2.lineCanvas.addEventListener('touchLeave',(fe) => this.handleMouseEvent(1,fe,2,v2.lineCanvas));
        v3.lineCanvas.addEventListener('touchLeave',(fe) => this.handleMouseEvent(0,fe,2,v3.lineCanvas));
        
        
        // Fix Button bar stuff
        /*let b0=document.querySelector("#buttonbar0");
          let b05=document.querySelector("#buttonbar05");
          let b3=document.querySelector("#buttonbar1");
          let b1=document.querySelector("#buttonbar3");
          let b4=document.querySelector("#buttonbar4");
          let bl = [ b0,b05,b1,b3,b4];*/
    }
    
    createGUI() {
        this.createSliders();
        this.createMNITextLabels();
        this.createTalTextLabels();
        this.createMiscElements();
        this.createBatchCallback();
    }
    
    createSliders() {
        
        let axialslider=this.parentWidget.querySelector("#zcontrols");
        let coronalslider=this.parentWidget.querySelector("#ycontrols");
        let sagslider=this.parentWidget.querySelector("#xcontrols");
        this.Sliders = [ sagslider,coronalslider,axialslider ];
        this.Sliders[0].addEventListener('change', () => this.setSliderCrossHairs(0));
        this.Sliders[1].addEventListener('change', () => this.setSliderCrossHairs(1));
        this.Sliders[2].addEventListener('change', () => this.setSliderCrossHairs(2));
        
    }
    
    createMNITextLabels() {
        let sagnumber=this.parentWidget.querySelector("#mnix");
        let cornumber=this.parentWidget.querySelector("#mniy");
        let axnumber=this.parentWidget.querySelector("#mniz");
        this.SliderLabels = [ sagnumber, cornumber, axnumber ];
        this.SliderLabels[0].addEventListener('change', () => this.setTextCrossHairs(0));
        this.SliderLabels[1].addEventListener('change', () => this.setTextCrossHairs(1));
        this.SliderLabels[2].addEventListener('change', () => this.setTextCrossHairs(2));
        
        let b1=this.parentWidget.querySelector("#mnigo");
        b1.addEventListener('click', () => this.setAllMNICoordinates());
    }
    
    createTalTextLabels() {
        let tal0=this.parentWidget.querySelector("#talx");
        let tal1=this.parentWidget.querySelector("#taly");
        let tal2=this.parentWidget.querySelector("#talz");
        this.TalSliderLabels = [ tal0, tal1, tal2];

        for (let i=0;i<=2;i++)
            this.TalSliderLabels[i].addEventListener('change', () => this.setTalairach());
        
        let b1=this.parentWidget.querySelector("#talgo");
        b1.addEventListener('click', ()=> this.setTalairach());
    }


    computeBatchConversion(fname,mni2tal=true) {

        const self=this;
        
        let show=async function(matrix,row,delay=1000)  {
            
            let x=parseInt(matrix[row][0]);
            let y=parseInt(matrix[row][1]);
            let z=parseInt(matrix[row][2]);

            if (mni2tal) {
                self.setMNICoordinates(x,y,z);
            } else {
                self.TalSliderLabels[0].value=x;
                self.TalSliderLabels[1].value=y;
                self.TalSliderLabels[2].value=z;
                self.setTalairach();
            }

            //            console.log('Showing ',x,y,z ,' mni2tal=',mni2tal);
            
            return new Promise( (resolve) => {
                setTimeout( () => { 
                    let v= parseInt(self.BrodmanElement.value);
                    let found=0;
                    let k=1;
                    while (k<self.brodlist.length && found<1) {
                        if (v===self.brodlist[k][0]) {
                            found=k;
                        }
                        k=k+1;
                    }
                    
                    let s= self.brodlist[found][1];
                    let out=null;
                    if (mni2tal) {
                        out = [
                            Math.round(self.TalSliderLabels[0].value),
                            Math.round(self.TalSliderLabels[1].value),
                            Math.round(self.TalSliderLabels[2].value)
                        ];
                    } else {
                        out = [
                            Math.round(self.SliderLabels[0].value),
                            Math.round(self.SliderLabels[1].value),
                            Math.round(self.SliderLabels[2].value)
                        ];
                    }
                    
                    let outstr=`${x},${y},${z},${s},${out[0]},${out[1]},${out[2]}\n`;
                    resolve(outstr);
                },delay);
            });
        };

        let save=async function(matrix,sz) {

            if (sz[0]<1)
                return;
            
            let delay=Math.round(5000/sz[0]);
            if (delay>1000)
                delay=1000;
            
            let output="#MNIX,MNIY,MNIZ,BA,TALX,TALY,TALZ\n";
            if (!mni2tal)
                output="#TALX,TALY,TALZ,BA,MNIX,MNIY,MNIZ\n";
            
            for (let i=0;i<sz[0];i++) {
                let out=await show(matrix,i,delay);
                output+=out;
            }

            if (webutil.inElectronApp()) {
                webfileutil.electronFileCallback(
                    {
                        filename : 'converted.csv',
                        title    : 'Select file to save output to',
                        filters  : [ { name: 'CSV Files', extensions: ['csv' ]}],
                        save : true,
                        suffix : ".csv",
                        force : 'local',
                    },function(f) {
                        genericio.write(f,output);
                    });
            } else {
                genericio.write('converted.csv',output);
            }
        };

        let newmat=new BisWebMatrix();
        newmat.load(fname).then( () => {
            let f2=genericio.getFixedLoadFileName(fname);
            let sz=newmat.getDimensions();
            
            if (sz[1]!==3 || sz[0]<1) {
                webutil.createAlert('Bad Matrix Coordinates file'+f2+' number of columns is not 3 or no rows. Actual dims=('+sz.join(',')+')',true);
                return;
            }

            if (mni2tal) 
                webutil.createAlert('Loaded '+sz[0]+' points. Converting MNI &rarr; TAL ...');
            else
                webutil.createAlert('Loaded '+sz[0]+' points. Converting TAL &rarr; MNI...');
            let m=newmat.getNumericMatrix();
            let overlaybox=self.parentWidget.querySelector("#showoverlaybutton");
            overlaybox.checked=true;
            self.setOverlayOpacity(true);
            save(m,sz);
        });
    }
    
    createBatchCallback() {

        const self=this;

        let batch2mni=function(f) {
            self.computeBatchConversion(f,true);
        };

        let batch2tal=function(f) {
            self.computeBatchConversion(f,false);
        };

        let b1=this.parentWidget.querySelector("#batch");
        webfileutil.attachFileCallback($(b1),batch2mni,{
            filename : '',
            title    : 'Select file to load MNI coordinates from',
            filters  : [ { name: 'CSV/Text File', extensions: ['csv','txt' ]}],
            save : false,
            suffix : ".csv,.txt",
            force : 'local',
        });
        let b2=this.parentWidget.querySelector("#batch2");
        
        webfileutil.attachFileCallback($(b2),batch2tal,{
            filename : '',
            title    : 'Select file to load Talairach coordinates from',
            filters  : [ { name: 'CSV/Text File', extensions: ['csv','txt' ]}],
            save : false,
            suffix : ".csv,.txt",
            force : 'local',
        });
    }
    
    createMiscElements() {
        
        let overlaybox=this.parentWidget.querySelector("#showoverlaybutton");
        overlaybox.checked=false;
        overlaybox.addEventListener('change',() => this.setOverlayOpacity(overlaybox.checked));
        
        let b1=this.parentWidget.querySelector("#resetbutton");
        b1.addEventListener('click', () => {
            this.setMNICoordinates(0,0,0); 
            overlaybox.checked=false; 
            this.setOverlayOpacity(false);
        });
        
        //      let mp = { "1" : 'Left',   "2" : 'Right' };
        
        this.BrodmanElement=this.parentWidget.querySelector("#baselectbox");
        
        let n=bisweb_mni2tal.BRODMANINDICES.length;
        let opt = document.createElement('option');
        opt.value = "-1";
        opt.innerHTML = "Outside defined BAs";
        this.BrodmanElement.appendChild(opt);
        this.brodlist=[];
        this.brodlist.push([ -1,"Outside defined BAs"]);
        //  this.BrodmanElement.children.add(new OptionElement(data: "Outside defined BAs", value: "-1",selected:false));
        for (let i=0;i<n;i++) {
            let opt = document.createElement('option');
            let opt2 = document.createElement('option');
            let ind=bisweb_mni2tal.BRODMANINDICES[i];
            let s=bisweb_mni2tal.BRODMANNLABELS[ind];
            opt.value=i;
            opt.innerHTML = 'Right-'+s;
            this.brodlist.push([i,"Right-"+s]);
            opt2.value=i+100;
            opt2.innerHTML = 'Left-'+s;
            this.brodlist.push([i+100,"Left-"+s]);
            this.BrodmanElement.appendChild(opt);
            this.BrodmanElement.appendChild(opt2);
        }
        this.BrodmanElement.addEventListener('change',() => this.gotoBrodmannCentroid());
    }
    
    gotoBrodmannCentroid() {
        
        //  console.log('Brodman=',this.BrodmanElement.value);      
        
        let a=Math.round(this.BrodmanElement.value);
        
        if (a<0) {
            this.setMNICoordinates(0,0,0);
            return;
        }
        
        let isleft=0;
        if (a>=100) {
            a=a-100;
            isleft=1;
        }
        
        let row=a;
        let col=1+isleft*3;
        let index=row*7+col;
        this.CrossHairLocation[0]=180-bisweb_mni2tal.BRODLOCATIONS[index];
        this.CrossHairLocation[1]=bisweb_mni2tal.BRODLOCATIONS[index+1];
        this.CrossHairLocation[2]=bisweb_mni2tal.BRODLOCATIONS[index+2];
        this.setSliceLocations(-1,true);
    }
    
    loadImages() {

        const self=this;
        let p=[];

        var load_image=function(image,fname)  {
            p.push(new Promise( function(resolve,reject) {
                image.src=fname;
                image.addEventListener('load',resolve);
                image.addEventListener('onerror',reject);
            }));
        };

        this.TalairachLookup=new Image();
        load_image(this.TalairachLookup,`${imagepath}/colin_talairach_lookup_xy.png`);

        this.brodmannLookup=new Image(); 
        load_image(this.brodmannLookup,`${imagepath}/yale_brod_xy.png`);

        this.MNILookup=new Image();
        load_image(this.MNILookup,`${imagepath}/tal2mni_lookup_xy.png`);

        this.Mosaic=new Image(); 
        load_image(this.Mosaic,`${imagepath}/MNI_T1_1mm_stripped_xy.png`);

        this.Overlay=new Image();
        load_image(this.Overlay,`${imagepath}/blend_xy.png`);

        let images_loaded = function() {
            self.Viewers[2].SetImage(self.Mosaic, bisweb_mni2tal.DIMENSIONS[0],bisweb_mni2tal.DIMENSIONS[1],bisweb_mni2tal.DIMENSIONS[2]);
            self.Viewers[1].SetImage(self.Mosaic, bisweb_mni2tal.DIMENSIONS[0],bisweb_mni2tal.DIMENSIONS[2],bisweb_mni2tal.DIMENSIONS[1]);
            self.Viewers[0].SetImage(self.Mosaic, bisweb_mni2tal.DIMENSIONS[0],bisweb_mni2tal.DIMENSIONS[2],bisweb_mni2tal.DIMENSIONS[1]);
            self.Viewers[2].SetOverlayImage(self.Overlay);
            self.Viewers[1].SetOverlayImage(self.Overlay);
            self.Viewers[0].SetOverlayImage(self.Overlay);
            self.finalizeInitialization();
            self.setMNICoordinates(0,0,1); 
            self.setMNICoordinates(0,1,0); 
            self.setMNICoordinates(1,0,0); 
            self.setMNICoordinates(0,0,0);
            
        };
        
        Promise.all(p)
            .then(images_loaded)
            .catch((e) => { console.log('Failed '+e); });
    }
    
    finalizeInitialization() {
        this.allLoaded=true;
        let s=document.querySelector("#tempviewer");
        while (s.firstChild) s.removeChild(s.firstChild);
        
        
        this.InternalCanvas = document.createElement("canvas");
        this.InternalCanvas.width=3;
        this.InternalCanvas.height=1;
        this.InternalContext = this.InternalCanvas.getContext('2d');
        //  console.log('Finalizing Initialization');
        this.setMNICoordinates(0,0,0);
    }
    
    
    // ---------------------------------------------------------------------------------
    // Utilities
    // ---------------------------------------------------------------------------------
    setOverlayOpacity(v) {
        
        if (this.allLoaded==false)
            return;
        
        let value=0.0;
        if (v)
            value=0.66;
        for (let i=0;i<=2;i++) {
            this.Viewers[i].overlayopacity=value;
            this.Viewers[i].SetSlice(-1,true); 
        }
    }
    
    setMNICoordinates(x,y,z) {
        
        if (this.allLoaded==false)
            return;
        
        this.CrossHairLocation[0]=bisweb_mni2tal.convertMNIToSlice(0,x);
        this.CrossHairLocation[1]=bisweb_mni2tal.convertMNIToSlice(1,y);
        this.CrossHairLocation[2]=bisweb_mni2tal.convertMNIToSlice(2,z);
        
        this.setSliceLocations(-1,true);
    }
    
    setAllMNICoordinates() {
        if (this.allLoaded==false)
            return;
        
        this.setTextCrossHairs(0,true); 
        this.setTextCrossHairs(1,true);
        this.setTextCrossHairs(2,true);
        
    }
    
    resetLocations() {
        this.setSliceLocations(0);
        this.setSliceLocations(1);
        this.setSliceLocations(2);
    }
    
    setTalairach() {
        if (this.allLoaded==false)
            return;
        
        let width = this.MNILookup.width;
        let height = this.MNILookup.height;
        if (width<2 || height<2) {
            return;
        }

        let ia=0,ja=0,ka=0;
        
        try {
            ia=Math.round(this.TalSliderLabels[0].value);
            ja=Math.round(this.TalSliderLabels[1].value);
            ka=Math.round(this.TalSliderLabels[2].value);
        } catch(err) {
            this.resetLocations();
            return;
        }
        
        
        let s0=bisweb_mni2tal.convertMNIToSlice(0,ia);
        let s1=bisweb_mni2tal.convertMNIToSlice(1,ja);
        let s2=bisweb_mni2tal.convertMNIToSlice(2,ka);
        
        if (s0<0 || s0>180 || s1<0 || s1>217 || s2<0 || s2>180) {
            this.resetLocations();
            return;
        }
        
        // NOw index in lookup tables
        let sourceX=s2*181;
        let sourceY=0;
        
        let voxelx=sourceX+s0;
        let voxely=sourceY+s1;
        
        this.InternalContext.drawImage(this.MNILookup, voxelx,voxely, 
                                       1, 1, 2, 0, 1, 1);
        
        let imgdata=this.InternalContext.getImageData(2, 0, 1, 1);    
        
        let mni_x = imgdata.data[0]-128;
        let mni_y = imgdata.data[1]-128;
        let mni_z = imgdata.data[2]-128;
        this.enableTalairachLabelsUpdate=false;
        this.setMNICoordinates(mni_x,mni_y,mni_z);
        this.enableTalairachLabelsUpdate=true;
        
        this.TalSliderLabels[0].value=ia;
        this.TalSliderLabels[1].value=ja;
        this.TalSliderLabels[2].value=ka;
    }
    
    // ---------------------------------------------------------------------------------
    // Complex Callbacks
    // ---------------------------------------------------------------------------------
    setTextCrossHairs(plane,force) {
        
        if (this.allLoaded==false)
            return;
        
        if (force === 'undefined')
            force=false;
        
        let s=this.SliderLabels[plane].value;
        let a=0;
        try { 
            a=Math.round(s);
        } catch(err) {
            this.resetLocations();
            return;
        }
        
        if (a<bisweb_mni2tal.MNIMIN[plane]) {
            a=bisweb_mni2tal.MNIMIN[plane];
            this.SliderLabels[plane].value=a;
        } else if (a>=bisweb_mni2tal.MNIMAX[plane]) {
            a=bisweb_mni2tal.MNIMAX[plane];
            this.SliderLabels[plane].value=a;
        }
        this.CrossHairLocation[plane]=bisweb_mni2tal.convertMNIToSlice(plane,a);
        this.setSliceLocations(plane,force);
    }
    
    
    setSliderCrossHairs(plane,force) {
        
        if (this.allLoaded==false)
            return;
        
        if (force === 'undefined')
            force=false;
        
        try {
            for (let i=0;i<=2;i++) {
                let s=Math.round(this.Sliders[i].value);
                if (bisweb_mni2tal.MNIFLIP[i]) {
                    s=bisweb_mni2tal.DIMENSIONS[i]-s-1;
                }
                this.CrossHairLocation[i]=s;
            }
            this.setSliceLocations(plane,force);
        } catch(err0) {
            this.resetLocations();
        }
    }
    
    setSliceLocations(plane,force) {
        
        if (this.allLoaded==false)
            return;
        
        if (force === 'undefined')
            force=false;
        
        
        let level0=this.CrossHairLocation[0];
        let level1=this.CrossHairLocation[1];
        let level2=bisweb_mni2tal.DIMENSIONS[2]-this.CrossHairLocation[2]-1;
        
        let minplane=plane,maxplane=plane;
        if ( plane==-1) {
            minplane=0;
            maxplane=2;
        } 
        
        for (let pl=minplane;pl<=maxplane;pl++) {
            let myslice=this.CrossHairLocation[pl];
            this.setCrossHairs(pl,level0,level1,level2,force);
            this.Viewers[pl].SetSlice(myslice);
        }
        
        for (let i=0;i<=2;i++) {
            let a=bisweb_mni2tal.convertSliceToMNI(i,this.CrossHairLocation[i]);
            if (a==0)
                this.SliderLabels[i].value="0";
            else
                this.SliderLabels[i].value=a;
            let s=this.CrossHairLocation[i];
            if (bisweb_mni2tal.MNIFLIP[i]) {
                s=bisweb_mni2tal.DIMENSIONS[i]-s-1;
            }
            this.Sliders[i].value=s;
        }
        
        this.updateTextLabels(this.CrossHairLocation[0],this.CrossHairLocation[1],this.CrossHairLocation[2]);
    }
    
    updateTextLabels(ia,ja,ka)  {
        
        if (this.allLoaded==false)
            return;
        
        
        let width = this.TalairachLookup.width;
        let height = this.brodmannLookup.height;
        if (width<2 || height<2) {
            //          console.log("Lookup Tables do not exist");
            return;
        }
        
        // NOw index in lookup tables
        
        let sourceX=ka*181;
        let sourceY=0;
        
        //let voxelx=sourceX+(180-ia);
        let voxelx2=sourceX+ia;
        let voxelx0=sourceX+ia;
        let voxely=sourceY+ja;
        
        if (this.enableTalairachLabelsUpdate) {
            this.InternalContext.drawImage(this.TalairachLookup, voxelx0,voxely, 
                                           1, 1, 0, 0, 1, 1);
        }
        
        this.InternalContext.drawImage(this.brodmannLookup, voxelx2,voxely, 
                                       1, 1, 1, 0, 1, 1);
        
        let imgdata=this.InternalContext.getImageData(0, 0, 2, 1);    
        let brod = imgdata.data[4];
        //        let s="(Outside defined Brodmann Area)";
        let origbrod=brod;
        if (brod>0) {
            if (brod<100) {
                //                s="BA=Left ";
            } else if (brod>100) {
                brod=brod-100;
                //                s="BA=Right ";
            }
            //            s+=bisweb_mni2tal.BRODMANNLABELS[brod];
        } else {
            origbrod=-1;

        }
        
        if (origbrod==-1)
            this.BrodmanElement.selectedIndex=0;
        else if (origbrod<100) {
            let v=bisweb_mni2tal.BRODMANINDICES.indexOf(origbrod)+1;
            this.BrodmanElement.selectedIndex=v*2;
        }
        else 
            this.BrodmanElement.selectedIndex=bisweb_mni2tal.BRODMANINDICES.indexOf(origbrod-100)*2+1;
        
        if (this.enableTalairachLabelsUpdate) {
            let tal_x = imgdata.data[0]-128;
            let tal_y = imgdata.data[1]-128;
            let tal_z = imgdata.data[2]-128;
            this.TalSliderLabels[0].value=tal_x;
            this.TalSliderLabels[1].value=tal_y;
            this.TalSliderLabels[2].value=tal_z;
        }
    }
    
    // ------------------------------------------------------------------------------
    //  Low Level functionality
    // ------------------------------------------------------------------------------
    setCrossHairs(plane,level1,level2,level3,force) {
        
        if (this.allLoaded==false)
            return;
        
        
        switch (plane) {
        case 0:
            if (this.Viewers[0].current_horizontal<0 || force)
                this.Viewers[0].SetCrossHairs(level1, level2, level3);
            this.Viewers[1].SetCrossHairs(level1,level2,level3);
            this.Viewers[2].SetCrossHairs(level1,level2,level3);
            break;
        case 1:
            if (this.Viewers[1].current_horizontal<0 || force)
                this.Viewers[1].SetCrossHairs(level1, level2, level3);
            this.Viewers[2].SetCrossHairs(level1,level2,level3);
            this.Viewers[0].SetCrossHairs(level1,level2,level3);
            break;
        case 2:
            if (this.Viewers[2].current_horizontal<0 || force)
                this.Viewers[2].SetCrossHairs(level1, level2, level3);
            this.Viewers[1].SetCrossHairs(level1,level2,level3);
            this.Viewers[0].SetCrossHairs(level1,level2,level3);
            break;
        }
    }
    
    handleMouseEvent(plane,e,mode) { // jshint ignore:line
        
        
        if (this.allLoaded==false)
            return;
        
        if (mode==2) {
            this.previousmouseevent=-1;
            return;
        }
        
        if (mode==1 && this.previousmouseevent==-1)
            return;
        
        if (mode==0)
            this.previousmouseevent=1;
        
        let w1=this.Viewers[0].width;
        let w2=this.Viewers[0].myCanvas.clientWidth;
        //  console.log('w1=',w1,'w2=',w2);
        let SCALE=(w2/w1);
        //  console.log('SCALE',SCALE);
        
        let x=Math.round(e.offsetX/SCALE);
        let y=Math.round(e.offsetY/SCALE);
        
        switch (plane) {
        case 0:
            this.CrossHairLocation[1]=x;
            this.setSliceLocations(1,true);
            this.CrossHairLocation[2]=bisweb_mni2tal.DIMENSIONS[2]-y-1;
            this.setSliceLocations(2,true);
            break;
        case 1:
            this.CrossHairLocation[0]=x;
            this.setSliceLocations(0,true);
            this.CrossHairLocation[2]=bisweb_mni2tal.DIMENSIONS[2]-y-1;
            this.setSliceLocations(2,true);
            break;
        case 2:
            this.CrossHairLocation[0]=x;
            this.setSliceLocations(0,true);
            this.CrossHairLocation[1]=y;
            this.setSliceLocations(1,true);
            break;
        }
    }
    
    initialize() {
        this.createViewers();
        this.createGUI();
        this.loadImages();
    }
}


bisweb_mni2tal.OrthoViewer=OrthoViewer;
module.exports = bisweb_mni2tal;
