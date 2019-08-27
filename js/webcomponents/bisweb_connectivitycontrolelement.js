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

/* global window,document,setTimeout,HTMLElement,Event,Image*/


"use strict";

const numeric=require('numeric');
const UndoStack=require('bis_undostack');
const bisweb_image = require('bisweb_image');
const util=require('bis_util');
const BisConnectivityMatrix=require('bis_connmatrix');
const webutil=require('bis_webutil');
const bisgenericio=require('bis_genericio');

const BisParcellation=require('bis_parcellation');
const $=require('jquery');
const bootbox=require('bootbox');
const bismni2tal=require('bis_mni2tal');
const BisWebMatrix=require('bisweb_matrix');

const BisWebPanel = require('bisweb_panel.js');
const dat = require('bisweb_datgui');
const humanmni=require('atlases/humanmni.json');
const connectvis=require('bisweb_connectivityvis');
const connectvis3d=require('bisweb_connectivityvis3d');


// -------------------------------------------------------------------------
// Parse Data
// -------------------------------------------------------------------------

const gui_Lobes = humanmni.labels.data[0].labels;
const gui_BrodLabels = humanmni.labels.data[3].labels;
const gui_Lobes_Values = [];
let keys=Object.keys(gui_Lobes);
for (let i=0;i<keys.length;i++) {
    gui_Lobes_Values.push(gui_Lobes[keys[i]]);
}

const gui_Networks_Array = [
    humanmni.labels.data[2].labels,
    humanmni.labels.data[4].labels
];

const gui_Networks_ArrayShort = [
    humanmni.labels.data[2].shortlabels,
    humanmni.labels.data[4].shortlabels
];

// Critical flag for now, eventually make it an option



const gui_Lines = [ 'Positive', 'Negative', 'Both'];
const gui_Modes = [ 'All', 'Single Node', 'Single Lobe','Single Network'];

const createNetworkNames = function(useyale=true,internal=null) {
        
    let index=0;
    
    if (useyale) {
        index=1;
        internal.networkAttributeIndex=4;
    } else {
        index=0;
        internal.networkAttributeIndex=2;
    }
    
    internal.gui_Networks=gui_Networks_Array[index];
    let keys=Object.keys(internal.gui_Networks);
    internal.gui_Networks_Names=[];
    internal.gui_Networks_ShortNames=[];
    for (let i=0;i<keys.length;i++) { 
        internal.gui_Networks_Names.push(internal.gui_Networks[keys[i]]);
        internal.gui_Networks_ShortNames.push(gui_Networks_ArrayShort[index][keys[i]]);
    }
    //    console.log("Network Names created",internal.gui_Networks_Names,internal.gui_Networks_ShortNames);
    
    internal.parameters.lobe=gui_Lobes[1];
    internal.parameters.mode=gui_Modes[1];
    internal.parameters.network=internal.gui_Networks[1];
};



// --------------------------------------------------------------------------------


const bisGUIConnectivityControl = function(parent,orthoviewer,layoutmanager) {

    // -------------------------------------------------------------------------
    // Control State variables
    // -------------------------------------------------------------------------


    
    let internal = {

        // store here
        gui_Lines : gui_Lines,
        gui_Modes : gui_Modes,
        gui_Lobes : gui_Lobes,
        
        
        // Network stuff
        networkAttributeIndex : 4,
        gui_Networks : null,
        gui_Networks_Names : null,
        gui_Networks_ShortNames : null,

        
        // global stuff
        initialized : false,
        this : null,
        parentDomElement : null,
        parcellation : null,
        conndata : new BisConnectivityMatrix(),
        domElement : null,
        orthoviewer : null,
        layoutmanager : layoutmanager,
        canvas : null,
        context: null,
        tmpcanvas : document.createElement("canvas"),
        overlaycanvas  : null,
        overlaycontext : null,
        overlaymode : false,
        mni2tal : null,
        mni : [ 0,0,0, -1 ],
        currentnode : 1,                
        // GUI Stuff
        posFileInfo : [ "NONE", 0 ],
        negFileInfo : [ "NONE", 0 ],

        // DAT
        datgui : null,
        parameters : {
            node  : 200,
            linestodraw : gui_Lines[2],
            degreethreshold : 10,
            length : 50,
            thickness : 2,
            poscolor : "#ff0000",
            negcolor : "#00dddd",
            radius : 1.0,
            matrixthreshold : 0.1,
            filter : 'Sum',
            opacity : 0.7,
            mode3d : 'Uniform',
            display3d : 'Both',
        },
        datgui_controllers : null,
        datgui_nodecontroller : null,
        datgui_degreethresholdcontroller : null,
        linestack : [],
        // Canvas mode
        undostack : new UndoStack(50),
        hadlinesonce : false,
        //
        keynodedlg : null,
        matrixdlg : null,
        //
        showlegend : true,
        rendermode : 7,
        subviewers : null,
        // meshes
        meshes : [],
        axisline : [null,null,null ],
        
        // state stuff
        inrestorestate : false,
        parcellationtext : null,
        lastnode : 0,

        // Info for external use
        laststate : null,


    };


    
    internal.conndata.offset=connectvis3d.lobeoffset;

    connectvis.initialize(internal);
    connectvis3d.initialize(internal);
    //    createNetworkNames(useYaleNetworks,internal);
    
    // -------------------------------------------------------------------------
    // Undo Stuff
    // -------------------------------------------------------------------------
    internal.addStateToUndo = function() {
        var undoobj = {
            stack : internal.linestack
        };
        internal.undostack.addOperation([JSON.stringify(undoobj)]);
        
    };

    var copyStateFromUndoStateElement=function(state) {

        internal.parameters.mode=state.guimode;
        internal.parameters.node=state.node;
        internal.parameters.lobe=state.lobe;
        internal.parameters.network=state.network;
        internal.parameters.degreethreshold=state.degreethreshold;
        internal.parameters.linestodraw =state.linestodraw;
        internal.parameters.poscolor = state.poscolor;
        internal.parameters.negcolor = state.negcolor;
        internal.parameters.length = state.length;
        internal.parameters.thickness = state.thickness;
        internal.parameters.radius = state.radius;
        internal.parameters.matrixthreshold = state.matrixthreshold;
        for (let ia=0;ia<internal.datgui_controllers.length;ia++) 
            internal.datgui_controllers[ia].updateDisplay();
    };
    
    var getStateFromUndoOrRedo = function(doredo) {
        doredo=doredo || false;
        let elem;
        if (doredo)
            elem=internal.undostack.getRedo();
        else
            elem=internal.undostack.getUndo();
        
        if (elem === null) 
            return;
        
        let undoobj=JSON.parse(elem[0]);
        internal.linestack=undoobj.stack;
        console.log('\n\n\n ***** Parsed undo element numops='+internal.linestack.length);

        let max=internal.linestack.length-1;
        if (max>=0) {
            var state=internal.linestack[max];
            copyStateFromUndoStateElement(state);
        }
        update();
    };

    // -------------------------------------------------------------------------
    // Draw Circles
    // -------------------------------------------------------------------------

    var toggleshowlegend = function() {

        internal.showlegend=!internal.showlegend;
        update(true);
        if (internal.showlegend) {
            setnode(Math.round(internal.parameters.node-1));
        } else if (internal.axisline[0]!==null) {
            internal.axisline[0].visible=false;
            internal.axisline[1].visible=false;
            internal.axisline[2].visible=false;
        }

    };


    // ----------------------------------------------------------------------------
    // Toggle Mode
    // ----------------------------------------------------------------------------
    var togglemode = function(doupdate=true) {

        
        if (internal.parcellation===null)
            return;
        
        if (doupdate) {
            internal.rendermode=internal.rendermode+1;
            if (internal.rendermode>8)
                internal.rendermode=5;
            if (internal.rendermode===6)
                internal.rendermode+=1;
        }

        internal.orthoviewer.setRenderMode(internal.rendermode,doupdate);
        let vp=internal.orthoviewer.getRenderModeViewports();
        let parcvp=vp[4];
        internal.parcellation.viewport.x0=parcvp.x0;
        internal.parcellation.viewport.x1=parcvp.x1;
        internal.parcellation.viewport.y0=1.0-parcvp.y1;
        internal.parcellation.viewport.y1=1.0-parcvp.y0;
        update(true);
        if (internal.showlegend)
            setnode(Math.round(internal.parameters.node-1));

    };
    
    // ----------------------------------------------------------------------------
    // Draw Matrices As Images
    // ----------------------------------------------------------------------------
    var drawMatricesInWindow = function() {
        
        if (internal.conndata.statMatrix===null) {
            bootbox.alert('No connectivity data loaded');
            return;
        }
        let numrows=internal.parcellation.rois.length;
        let cw=internal.context.canvas.width*0.9;
        let padding_x=30;
        let padding_y=30;
        let scalefactor=((cw-3*padding_x)/(2*numrows));
        let ch=scalefactor*numrows+1.5*padding_y;
        let offsets= [ [ padding_x,
                         padding_y,
                         scalefactor*numrows ],
                       [ 2*padding_x+scalefactor*numrows,
                         padding_y,
                         scalefactor*numrows ] ];
        
        let names=[ 'Positive','Negative' ];

        if (internal.matrixdlg === null)
            internal.matrixdlg=webutil.createmodal('Connectivity Matrices');
        else
            internal.matrixdlg.body.empty();


        let actualcanvas=document.createElement("canvas");
        let cv=$(actualcanvas);
        let h=Math.round((550/cw)*ch);
        cv.css({ width : "550px",
                 height: `${h}px`,
               });
        actualcanvas.width=cw;
        actualcanvas.height=ch;
        internal.matrixdlg.body.append(cv);
        internal.matrixdlg.dialog.modal('show');
        
        let actualcontext=actualcanvas.getContext("2d");
        actualcontext.save();
        actualcontext.fillStyle="#ffeedd";
        actualcontext.fillRect(0,0,cw,ch);
        
        for (let im=0;im<=1;im++) {
            let image = internal.conndata.getImageData(1-im,0,
                                                       actualcontext,
                                                       internal.parcellation);
            let minx=offsets[im][0],miny=offsets[im][1],sz=offsets[im][2];
            
            if (image!==null) {
                actualcontext.lineWidth=1;
                actualcontext.fillStyle="#000000";
                actualcontext.font=24+"px Arial";
                actualcontext.textAlign="center";
                actualcontext.fillText(names[im],minx+0.5*sz,miny-10);

                actualcontext.lineWidth=1;
                actualcontext.fillStyle="#ffffff";
                actualcontext.fillRect(minx,miny,sz,sz);
                actualcontext.beginPath();
                actualcontext.moveTo(minx-2,   miny-2);
                actualcontext.lineTo(minx+sz+2,miny-2);
                actualcontext.lineTo(minx+sz+2,miny+sz+2);
                actualcontext.lineTo(minx-2,   miny+sz+2);
                actualcontext.lineTo(minx-2,   miny-2);
                actualcontext.stroke();

                internal.tmpcanvas.width = numrows;
                internal.tmpcanvas.height = numrows;
                let tmpcontext = internal.tmpcanvas.getContext("2d");
                tmpcontext.clearRect(0,0,numrows,numrows);
                tmpcontext.putImageData(image,0,0);
                let ImageObject = new Image();
                ImageObject.src = internal.tmpcanvas.toDataURL("image/png");
                
                actualcontext.fillStyle="#ffeedd";
                actualcontext.fillRect(minx,miny,sz,sz);

                if (im==0) {
                    let a=minx,b=miny,c=sz;
                    ImageObject.onload = function() {
                        actualcontext.drawImage(ImageObject,
                                                0,0,numrows,numrows,
                                                a,b,c,c);
                    };
                } else {
                    let a1=minx,b1=miny,c1=sz;
                    ImageObject.onload = function() {
                        actualcontext.drawImage(ImageObject,
                                                0,0,numrows,numrows,
                                                a1,b1,c1,c1);
                    };
                }          
            }
        }
        actualcontext.restore();

        
    };
    
    var drawMatricesAndLegendsAsImages = function() {

        if (internal.parcellation===null)
            return;
        
        if (internal.parcellation.lobeStats===null || 
            (internal.parcellation.viewport.x0 ===internal.parcellation.viewport.x1 ))
            return;

        if ((internal.parcellation.box[3]-internal.parcellation.box[1])<100)
            return;


        let cw=internal.context.canvas.width;
        let vp=internal.parcellation.viewport;
        let width  = Math.floor((vp.x1-vp.x0)*cw);
        let cnv={
            width : width,
        };
        let fnsize=webutil.getfontsize(cnv);
        let fnsize2=webutil.getfontsize(cnv,true);
        
        let originx= Math.floor(vp.x0*cw);
        let originy= internal.parcellation.box[1];
        let leftgap=internal.parcellation.box[0]-originx;
        let imagewidth=0.8*leftgap;

        let offset=0;
        let boxheight=internal.parcellation.box[3]-internal.parcellation.box[1];
        let numgaps=22;
        let dlobe=Math.round(1.5*fnsize);
        let needed=numgaps*dlobe+8;
        if (needed>boxheight) {
            dlobe=(boxheight-8)/numgaps;
        }
        needed=numgaps*dlobe+8;
        if (dlobe<0.75*fnsize || imagewidth<50)
            return;
        
        // Draw Legends
        let pw=0.8*leftgap;
        if (pw>8*fnsize)
            pw=8*fnsize;
        
        let px=width-pw-2;
        
        let py=originy+4+offset;
        let lobegap=dlobe;

        if (internal.showlegend) {
            internal.overlaycontext.save();
            internal.overlaycontext.fillStyle="#cccccc";
            internal.overlaycontext.fillRect(px-4,py-4,pw+8,needed);
            internal.overlaycontext.fillStyle="#000000";
            internal.overlaycontext.textAlign="left";
            internal.overlaycontext.font=fnsize2+"px Arial";
            internal.overlaycontext.fillText("'Lobes'",px+5,py+lobegap);
            internal.overlaycontext.textAlign="center";
            internal.overlaycontext.font=fnsize+"px Arial";
            py+=(2*lobegap);
            
            for (let i=1;i<=10;i++) {
                let tot=util.range(internal.parcellation.lobeStats[i][2],0,10000),tot2=0;
                if (internal.parcellation.lobeStats.length>(i+10))
                    tot2=util.range(internal.parcellation.lobeStats[i+10][2],0,10000);
                if (tot+tot2>0) {
                    internal.overlaycontext.fillStyle=internal.parcellation.getNonSidedLobeColor(i);
                    internal.overlaycontext.fillRect(px,py,pw,1.5*lobegap);
                    internal.overlaycontext.fillStyle=internal.parcellation.getInverseNonSidedLobeColor(i);
                    let name=gui_Lobes[i];
                    name=name.slice(2,name.length);
                    internal.overlaycontext.fillText(name,px+0.5*pw,py+lobegap);
                    py+=(2*lobegap);
                }
            }
        }
        
        
        let y0=fnsize2*2;
        if (internal.showlegend) {
            if (y0<internal.parcellation.box[1]) {
                let midx=0.5*(internal.parcellation.box[0]+internal.parcellation.box[2]);
                internal.overlaycontext.fillStyle="rgb(0,0,0)";
                internal.overlaycontext.font=fnsize2+"px Arial";
                internal.overlaycontext.textAlign="center";
                internal.overlaycontext.clearRect(0,0,cw,internal.parcellation.box[1]-2);
                let y0_0=internal.parcellation.box[1]-0.5*(internal.parcellation.box[1]-fnsize2);
                internal.overlaycontext.fillText('Using node definitions from '+internal.parcellation.description+' with '+(internal.parcellation.rois.length)+' nodes.',
                                                 midx,y0_0);
                if (internal.networkAttributeIndex===4)
                    internal.overlaycontext.fillText('Using Yale network definitions from Noble at al 2018.',midx,y0_0+20);
                else
                    internal.overlaycontext.fillText('Using Network definitions from Power at al. Neuron 2011.',midx,y0_0+20);
            }
            
            internal.overlaycontext.restore();
        }
        
        let needed2=2*(imagewidth+25+4)+30;
        if (needed2>boxheight) {
            imagewidth=0.5*(needed2-30)-29;
        } else {
            originy+=0.5*(boxheight-needed2);
        }
        
        if (2*imagewidth+80>boxheight) {
            imagewidth=(boxheight-80)/2;
        }
        
        let offsets = [ [ originx+0.1*leftgap,
                          originy+30,
                          imagewidth ],
                        [ originx+0.1*leftgap,
                          originy+imagewidth+69,
                          imagewidth ]
                      ];

        let numrows=internal.parcellation.rois.length;      
        
        let names=[ 'Positive','Negative' ];

        
        for (let im=0;im<=1;im++) {

            let image = internal.conndata.getImageData(1-im,0,
                                                       internal.overlaycontext,
                                                       internal.parcellation);
            let minx=offsets[im][0],miny=offsets[im][1],sz=offsets[im][2];
            
            
            if (internal.showlegend && image!==null) {
                
                internal.overlaycontext.save();
                internal.overlaycontext.lineWidth=1;
                internal.overlaycontext.fillStyle="rgb(0,0,0)";
                internal.overlaycontext.font=fnsize+"px Arial";
                internal.overlaycontext.lineWidth=1;
                internal.overlaycontext.textAlign="center";
                internal.overlaycontext.fillText(names[im],minx+0.5*sz,miny-10);
                
                internal.overlaycontext.lineWidth=1;
                internal.overlaycontext.fillStyle="#ffffff";
                internal.overlaycontext.fillRect(minx,miny,sz,sz);
                internal.overlaycontext.beginPath();
                internal.overlaycontext.moveTo(minx-2,   miny-2);
                internal.overlaycontext.lineTo(minx+sz+2,miny-2);
                internal.overlaycontext.lineTo(minx+sz+2,miny+sz+2);
                internal.overlaycontext.lineTo(minx-2,   miny+sz+2);
                internal.overlaycontext.lineTo(minx-2,   miny-2);
                internal.overlaycontext.stroke();
                
                
                internal.overlaycontext.fillStyle="#ffeedd";
                internal.overlaycontext.fillRect(minx,miny,sz,sz);
                internal.overlaycontext.restore();
                
                internal.tmpcanvas.width = numrows;
                internal.tmpcanvas.height = numrows;
                let tmpcontext = internal.tmpcanvas.getContext("2d");
                tmpcontext.putImageData(image,0,0);
                let ImageObject = new Image();
                ImageObject.src = internal.tmpcanvas.toDataURL("image/png");

                
                if (im==0) {
                    let a=minx,b=miny,c=sz;
                    ImageObject.onload = function() {
                        if (internal.showlegend) {
                            internal.overlaycontext.drawImage(ImageObject,
                                                              0,0,numrows,numrows,
                                                              a,b,c,c);
                        }
                    };
                } else {
                    let a1=minx,b1=miny,c1=sz;
                    ImageObject.onload = function() {
                        if (internal.showlegend) {
                            internal.overlaycontext.drawImage(ImageObject,
                                                              0,0,numrows,numrows,
                                                              a1,b1,c1,c1);
                        }
                    };
                }
            } else {
                let a=minx,b=miny,c=sz;
                internal.overlaycontext.save();
                internal.overlaycontext.fillStyle="#ffffff";
                internal.overlaycontext.fillRect(a,b,c,c);
                internal.overlaycontext.restore();
            }
        }
    };

    
    // Update Display skip3d -- if true skip 3d updates
    var update = function(skip3d=false) {

        if (internal.parcellation===null)
            return;

        let skip2d=false;
        
        if (internal.parcellation.viewport.x0 ===
            internal.parcellation.viewport.x1 ) {
            internal.context.clearRect(0,0,internal.canvas.width,internal.canvas.height);
            internal.overlaycontext.clearRect(0,0,internal.canvas.width,internal.canvas.height);
            skip2d=true;
        }

        drawColorScale();
        
        if (skip2d && skip3d)
            return;
        
        let max=internal.linestack.length-1;
        let bd=internal.parcellation.clearCanvas(internal.context);
        if (bd[2]>0) {
            internal.overlaycontext.clearRect(bd[0],bd[1],bd[2],bd[3]);
            internal.parcellation.drawCircles(internal.context);
        } else {
            //console.log('canvas too small ... skipping 2d');
            skip2d=true;
        }
        
        // First remove what's there
        if (!skip3d) {
            internal.meshes.forEach(function(m) {
                m.visible=false;
                internal.subviewers[3].getScene().remove(m);
            });
        }


        let ok=1,donewithmatrices=false;

        // Hide axis lines in 3D!
        if (internal.axisline[0]!==null) {
            for (let axis=0;axis<=2;axis++)
                internal.axisline[axis].visible=false;
        }
        
        if (internal.linestack.length>0) {
            
            for (let i=0;i<internal.linestack.length;i++) {
                ok=1;
                if (!skip2d)
                    ok=connectvis.drawlines(internal.linestack[i]);
                if (ok===0)
                    i=internal.linestack.length;
                else if (!skip3d)
                    connectvis3d.drawlines3d(internal.linestack[i],true);
            }

            
            if (max>=0 ) {
                let state=internal.linestack[max];
                let mode=state.mode;
                if (mode===1) {
                    setnode(Math.round(internal.parameters.node-1));
                    donewithmatrices=true;
                }

            } else if (donewithmatrices===false) {
                setnode(Math.round(internal.parameters.node-1));
                donewithmatrices=true;
            }

            
        }

        //if (internal.showlegend === true)
        drawMatricesAndLegendsAsImages();


        if (!skip3d) {
            internal.orthoviewer.renderSubViewer(3);
        }

    };

    
    var setnode = function(node) {

        if (internal.parcellation===null)
            return;
        
        node = node || 0;
        internal.lastnode=node;
        let singlevalue=util.range(Math.round(node),0,internal.parcellation.rois.length-1);
        let intnode=Math.floor(internal.parcellation.indexmap[singlevalue]);
        internal.mni[0]= internal.parcellation.rois[intnode].x;
        internal.mni[1]= internal.parcellation.rois[intnode].y;
        internal.mni[2]= internal.parcellation.rois[intnode].z;
        internal.mni[3]= singlevalue;
        if (internal.showlegend)
            internal.parcellation.drawPoint(singlevalue,internal.overlaycontext);
        let coords = internal.mni2tal.getMMCoordinates(internal.mni);
        internal.orthoviewer.setcoordinates(coords);
        drawMatricesAndLegendsAsImages();
        if (internal.showlegend) {
            connectvis3d.draw3dcrosshairs();
        } else {
            internal.axisline[0].visible=false;
            internal.axisline[1].visible=false;
            internal.axisline[2].visible=false;
            
        }
        updatetext();
    };

    
    // Update Text
    var updatetext = function() {

        if (!internal.showlegend)
            return;
        
        let ch=internal.canvas.height;
        let cw=internal.canvas.width;
        if (internal.parcellation.box[0]>=internal.parcellation.box[2] ||
            internal.parcellation.viewport.x0 >=internal.parcellation.viewport.x1)
            return;
        
        let nodenumber=internal.mni[3];

        let s_text='MNI=('+internal.mni[0]+','+internal.mni[1]+','+internal.mni[2]+')';
        let s_text2="";
        
        if (nodenumber>-1) {
            let orignode=internal.parcellation.indexmap[nodenumber];
            let humannumber=nodenumber+1;

            let lobe=gui_Lobes[internal.parcellation.rois[orignode].attr[0]];
            internal.parameters.lobe=lobe;

            // 
            
            let n=internal.parcellation.rois[orignode].attr[internal.networkAttributeIndex]; // switch to shen network
            let network=internal.gui_Networks[n];
            if (network===undefined) {
                network="unknown";
            } else {
                internal.parameters.network=network;
            }

            let brod=gui_BrodLabels[internal.parcellation.rois[orignode].attr[3]];
            if (brod===undefined) {
                brod="n/a";
            } 
            s_text='Node:'+humannumber+' ( '+lobe+', NTW='+network+', BA='+brod+').';
            s_text2=' MNI=('+internal.mni[0]+','+internal.mni[1]+','+internal.mni[2]+')';

            if (internal.conndata.statMatrix!==null) {
                s_text2+=', (Degree: p='+internal.conndata.statMatrix[orignode][0]+', ';
                s_text2+='n='+internal.conndata.statMatrix[orignode][1]+', ';
                s_text2+='s='+internal.conndata.statMatrix[orignode][2]+') ';
            }
            s_text2+=' (sorted='+(internal.parcellation.indexmap[nodenumber]+1)+')';

            internal.parameters.node=humannumber;


            for (let ia=0;ia<internal.datgui_controllers.length;ia++) 
                internal.datgui_controllers[ia].updateDisplay();
        }

        internal.overlaycontext.save();
        internal.overlaycontext.textAlign="center";
        let x=0.5*(internal.parcellation.viewport.x0+internal.parcellation.viewport.x1)*cw;
        let wx=(internal.parcellation.viewport.x1-internal.parcellation.viewport.x0)*cw;
        let cnv = { 
            width: wx
        };
        let fnsize=webutil.getfontsize(cnv);
        let fn=fnsize+"px Arial";
        internal.overlaycontext.font=fn;
        let ymin=(internal.parcellation.box[3])+5;

        if ((ch-ymin)>3.5*fnsize) {
            internal.overlaycontext.clearRect(0,ymin,cw,ch-ymin);
            internal.overlaycontext.fillStyle="rgb(0,0,0)";
            let y=(internal.parcellation.viewport.y1)*ch;
            internal.overlaycontext.fillText(s_text,x,y-2*fnsize);
            internal.overlaycontext.fillText(s_text2,x,y-0.5*fnsize);
        }
        internal.overlaycontext.restore();
    };

    var cleanmatrixdata = function() {
        internal.conndata.cleanup();
        if (internal.keynodedlg!==null) 
            internal.keynodedlg.getWidget().empty();
        internal.keynodedlg=null;
        internal.posFileInfo=[ "NONE", 0 ];
        internal.negFileInfo=[ "NONE", 0 ];
        internal.undostack.initialize();
        internal.linestack=[];
        connectvis3d.createAndDisplayBrainSurface(0, [1.0,1.0,1.0],0.7,-1);
        connectvis3d.createAndDisplayBrainSurface(1, [1.0,1.0,1.0],0.7,-1);
        internal.parameters.mode3d='Uniform';
        for (let ia=0;ia<internal.datgui_controllers.length;ia++) 
            internal.datgui_controllers[ia].updateDisplay();
        update();
    };
    
    // Loads matrix. Called from input=File element 
    // @param {number} index - 0=positive,1=negative
    // @param {string} filename - file to load from
    // @param {callback} done - call this when loaded (used for sample)
    // @param {boolean} sample - if sample then no alert
    // @param {boolean} updatemeshes - if true then update surface
    //
    var loadmatrix = function(index,filename,done,sample,updatemeshes=true) {

        done= done || null;
        sample = sample || false;
        
        if (internal.parcellation===null) {
            loaderror('Load parcellation before loading connectivity matrix');
            return true;
        }

        let loaderror = function(msg) {
            webutil.createAlert(msg,true);
        };

        bisgenericio.read(filename).then( (obj) => {

            let text=obj.data;
            
            if (internal.parcellation===null) {
                loaderror('Load parcellation before loading connectivity matrix');
                return;
            }
            
            if (index===-1) {
                if (internal.conndata.posMatrix===null)
                    index=0;
                else if (internal.conndata.hasnegMatrix!==false)
                    index=0;
                else
                    index=1;
            }
            let n=internal.conndata.parsematrix(text,index,filename,loaderror);

            let np=internal.parcellation.rois.length;
            if (n>0 && n!==np) {
                loaderror('Matrix has '+n+' rows, while parcellation has '+np+' nodes. This is a problem!');
                cleanmatrixdata();
                return;
            }
            
            internal.undostack.initialize();
            internal.linestack=[];



            if (n>0) {
                if (index===0) {
                    internal.posFileInfo[0]=filename;
                    internal.posFileInfo[1] =n;
                    internal.negFileInfo[0] ="NONE";
                    internal.negFileInfo[1] =0;
                } else {
                    internal.negFileInfo[0] =filename;
                    internal.negFileInfo[1] =n;
                }

                if (done===null) {
                    internal.showlegend=true;
                    if (internal.parameters.degreethreshold>internal.conndata.maxsum)
                        internal.parameters.degreethreshold=Math.round(internal.conndata.maxsum/2);
                    internal.datgui_degreethresholdcontroller.min(0.1).max(internal.conndata.maxsum);
                    internal.datgui_degreethresholdcontroller.updateDisplay();
                    update();
                    setnode(internal.conndata.maxsumnode);

                    
                    if (updatemeshes) {
                        connectvis3d.update3DMeshes(internal.parameters.opacity,
                                                    internal.parameters.mode3d,
                                                    internal.parameters.display3d);
                        setTimeout( () => { drawColorScale(); },1000);
                    }
                    
                    if (!sample) {
                        if (filename.name)
                            filename=filename.name;
                        if (index===0)
                            webutil.createAlert('Positive matrix of dimensions '+np+'*'+np+' read from '+filename);
                        else
                            webutil.createAlert('Negative matrix of dimensions '+np+'*'+np+' read from '+filename);
                        window.dispatchEvent(new Event('resize'));
                    }
                } else {
                    done();
                }
                if (internal.keynodedlg!==null)
                    internal.keynodedlg.hide();
                internal.keynodedlg=null;
            }
        }).catch( (e) => { loaderror(e); });

        return false;
    };

    
    // Parses Parcellation
    // @param {string} text - parcellation text
    // @param {string} filename - file to load from (either .json or .txt)
    var parseparcellation = function(text,filename,silent,keepobjectmap=false) {
        silent = silent || false;
        internal.parcellation=new BisParcellation();
        internal.parcellation.loadrois(text,filename,bootbox.alert);
        internal.datgui_nodecontroller.min(1).max(internal.parcellation.rois.length);

        internal.parcellationtext= {
            text : text,
            filename : filename,
        };
        
        togglemode(false);//update();
        
        setnode(0);
        internal.undostack.initialize();
        internal.hadlinesonce=false;
        //          console.log('Going to loadmatrix');

        if (!silent) {
            webutil.createAlert('Connectivity Viewer initialized. The node definition loaded is from '+internal.parcellation.description+'.',
                                false);
        }
        if (!keepobjectmap)
            internal.orthoviewer.clearobjectmap();
        cleanmatrixdata();
    };
    // Loads Parcellation. 
    // @param {string} in_filename - file to load from (either .json or .txt)
    var loadparcellation = function(in_filename) {
        
        internal.parcellation=null;
        bisgenericio.read(in_filename).then( (obj) => {
            parseparcellation( obj.data,obj.filename);
        }).catch( (msg) => {
            console.log('msg=',msg,in_filename);
            bootbox.alert(msg);
        });
        return false;
    };



    // Reads BioImage Suite atlas file gets a description and off to callback
    // @param {callback} callback function with (atlasimage,description)
    var readatlas = function(callback,save=true,description=null) {

        let atlasimage=null;

        let myerror =  function () {
            bootbox.alert('Failed to read internal atlas file. Something is wrong here.');
            return 0;
        };
        
        let internalreadatlas = function(atlas,save=true) {
            atlasimage=atlas;
            if (save) {
                bootbox.prompt({
                    title: "Please enter a description of the node definition file",
                    value: "Unknown",
                    callback: function(result) {
                        if (result !== null) {
                            setTimeout(function() {
                                callback(atlasimage,result);
                            },100);
                        }
                    },
                });
            } else {
                callback(atlasimage,description);
            }
        };
        const img=new bisweb_image();
        const imagepath=webutil.getWebPageImagePath();
        img.load(`${imagepath}/Reorder_Atlas.nii.gz`,false)
            .then(function() { internalreadatlas(img,save); })
            .catch( (e) => { myerror(e) ; });
    };

    // Imports Parcellation Text and outputs text file in json format
    // @alias BisGUIConnectivityControls~importParcellationText
    // @param {filename} textfile - file to create node definition from
    var importParcellationText = function(textfile) {

        let loaderror = function(msg) {
            bootbox.alert(msg);
        };

        let atlasimage=null;
        let description="";
        let out="";
        let loadsuccess = function(textstring,filename) {
            console.log('++++ textstring of length='+textstring.length+' read from'+filename);
            try { 
                out=new BisParcellation().createParcellationFromText(textstring,filename,atlasimage,description)+"\n";
            } catch(e) {
                bootbox.alert(e);
                return;
            }
            parseparcellation(out,filename+".parc",true);
            bisgenericio.write({
                filename : filename+".parc",
                title : 'File to save node definition in',
                filters : [ { name: 'JSON formatted Node definition file', extensions: [ 'parc']}],
            },out);
        };


        bisgenericio.read(textfile).then( (obj) => {

            let textstring=obj.data;
            let filename=obj.filename;

            let loadsuccess1 =function(atlas,result) {
                atlasimage=atlas;
                description=result;
                loadsuccess(textstring,filename);
            };
            
            try { 
                util.parseMatrix(textstring,filename,false,3);
            } catch(e) {
                bootbox.alert('Failed to parse file '+filename+' it does not have 3 columns or something else is wrong. ('+e+')');
                return;
            }
            
            readatlas(loadsuccess1);
        }).catch( (e) => {
            loaderror(e);
        });
    };




    // Imports Parcellation Image and outputs text file in json format
    // @param {BisWebImage} image - image to create from
    var importParcellationImage = function(vol,atlasdesc=null) {
        

        let save=true;
        if (atlasdesc)
            save=false;

        let createparcellationfromimage = function(atlasimage,description) {
            
            let fname=vol.getFilename();
            let index=fname.lastIndexOf(".nii.gz");
            if (index>0)
                fname=fname.slice(0,index)+".parc";
            let out="";
            try { 
                out=new BisParcellation().createParcellationFromImage(vol,atlasimage,description)+"\n";
            } catch(e) {
                bootbox.alert(e);
                return;
            }
            if (save)
                parseparcellation(out,fname,true);
            else
                parseparcellation(out,fname,false);
            internal.orthoviewer.setobjectmap(vol,true);

            if (save) {
                bisgenericio.write({
                    filename : fname,
                    title : 'File to save node definition in',
                    filters : [ { name: 'JSON formatted Node definition file', extensions: [ 'parc']}],
                },out);
            }
        };

        let d=vol.getDimensions();
        let s=vol.getSpacing();
        let truedim = [  181,217,181,1 ] ;
        let truespa = [  1.0,1.0,1.0,1.0 ];
        d[3]=truedim[3];
        s[3]=truespa[3];


        let diff=numeric.norminf(numeric.sub(d,truedim));

        console.log(numeric.sub(s,truespa));
        let diff2=numeric.norminf(numeric.sub(s,truespa));
        let orient=vol.getOrientation().name;
        
        console.log([diff,diff2]);
        if (diff>0 || diff2>0.01 || orient!=="RAS") {
            bootbox.alert("Bad Parcellation Image for creating a Parcellation file."+
                          "Must be RAS 181x217x181 and 1x1x1 mm (i.e. MNI 1mm space)."+
                          "This image has orientation "+orient+", dimensions="+[d[0],d[1],d[2]]+
                          " voxel size="+
                          [ util.scaledround(s[0],10),util.scaledround(s[1],10),
                            util.scaledround(s[2],10) ]);
            return 0;
        }

        readatlas(createparcellationfromimage,save,atlasdesc);
    };

    // -------------------------------------------------------------------------------------------
    // create GUI
    // -------------------------------------------------------------------------------------------

    // actual GUI creation when main class is ready
    // The parent element is internal.parentDomElement
    var onDemandCreateGUI = function (useYale=true) {

        createNetworkNames(useYale,internal);
        
        if (internal.parentDomElement===null)
            return;
        
        internal.parentDomElement.empty();
        let basediv=webutil.creatediv({ parent : internal.parentDomElement});
        internal.domElement=basediv;

        let data = internal.parameters;
        data.this=this;
        internal.datgui = new dat.GUI({autoPlace: false});
        
        let gui=internal.datgui;
        basediv.append(gui.domElement);
        
        let coords = gui.addFolder('Core');
        coords.open();


        
        let disp = gui.addFolder('Display');
        let disp2 = gui.addFolder('Display 3D');
        let adv = gui.addFolder('Advanced');
        let clist = [];
        clist.push(coords.add(data,'mode',gui_Modes).name("Mode"));
        let a1=coords.add(data,'node',1,400).name("Node");
        clist.push(a1);
        a1.onChange(function(val) {
            setnode(Math.round(val-1));
        });
        internal.datgui_nodecontroller=a1;
        
        clist.push(coords.add(data,'lobe',gui_Lobes_Values).name("Lobe"));
        clist.push(coords.add(data,'network',internal.gui_Networks_Names).name("Network"));
        internal.datgui_degreethresholdcontroller=coords.add(data,'degreethreshold',1,100).name("Degree Thrshld");
        clist.push(internal.datgui_degreethresholdcontroller);
        clist.push(coords.add(data,'linestodraw',gui_Lines).name("Lines to Draw"));
        
        clist.push(disp.add(data,'length',10,100).name("Length"));
        clist.push(disp.add(data,'thickness',1,4).name("Thickness"));
        clist.push(disp.addColor(data, 'poscolor').name("Pos-Color"));
        clist.push(disp.addColor(data, 'negcolor').name("Neg-Color"));



        clist.push(adv.add(data,'matrixthreshold',0.0,1.0).name('Matrix Threshold'));
        clist.push(adv.add(data,'filter',connectvis.filter_modes).name('Threshold by'));

        let da1=disp2.add(data,'opacity',0.0,1.0).name('Opacity').onFinishChange( () => {
            connectvis3d.update3DMeshes(data.opacity,data.mode3d,data.display3d);
        });
        let da2=disp2.add(data,'mode3d',connectvis3d.color_modes).name("Mesh Color Mode");
        da2.onChange( () => {
            connectvis3d.update3DMeshes(data.opacity,data.mode3d,data.display3d);
            if (data.mode3d!=='Uniform')
                data.opacity=1.0;
            da1.updateDisplay();
            setTimeout( () => { drawColorScale(); },200);
        });
        let da3=disp2.add(data,'display3d',connectvis3d.display_modes).name("Show Meshes");
        da3.onChange( () => {
            connectvis3d.update3DMeshes(data.opacity,data.mode3d,data.display3d);
        });
        clist.push(disp2.add(data,'radius',0.2,4.0).name("Radius (3D)"));
        
        clist.push(da1);
        clist.push(da2);
        clist.push(da3);

        internal.datgui_controllers=clist;
        
        webutil.removedatclose(gui);
        
        let ldiv0=$("<H4> </H4>").css({ 'margin':'5px'});   basediv.append(ldiv0);

        let bbar1=webutil.createbuttonbar({ parent : basediv});

        webutil.createbutton({ type : "default",
                               name : "Toggle Legends",
                               position : "top",
                               tooltip : "Show/Hide auxiliary information",
                               parent : bbar1,
                               callback : toggleshowlegend,
                             });
        

        webutil.createbutton({ type : "default",
                               name : "Toggle 3D Mode",
                               position : "top",
                               css : { "margin-left": "5px"},
                               tooltip : "Click this to switch display mode from circle+3D to circle to 3D",
                               parent : bbar1,
                               callback : togglemode,
                             });


        let ldiv2=$("<H4> </H4>").css({ 'margin':'5px'});   basediv.append(ldiv2);
        let bbar2=webutil.createbuttonbar({ parent : basediv});

        webutil.createbutton({ type : "info",
                               name : "Create Lines",
                               position : "bottom",
                               css : { "margin": "5px"},
                               tooltip : "Click this to create lines",
                               parent : bbar2,
                               callback : connectvis.createlines,
                             });

        webutil.createbutton({ type : "default",
                               name : "Clear Lines",
                               position : "bottom",
                               css : { "margin": "5px"},
                               tooltip : "Click this to clear the lines",
                               parent : bbar2,
                               callback : connectvis.removelines,
                             });

        let bbar3 = webutil.createbuttonbar({ parent : basediv });
        webutil.createbutton({ type : "info",
                               name : "Chord Plot",
                               position : "bottom",
                               css : { "margin": "5px"},
                               tooltip : "Click this to draw a chord diagram from the lines on screen",
                               parent : bbar3,
                               callback : () => {
                                   //                                   console.log('Internal=',internal);
                                   connectvis.drawchords();
                               },
                             });
        
        
        webutil.createbutton({ type : "info",
                               name : "Summary Matrix",
                               position : "bottom",
                               css : { "margin": "5px"},
                               tooltip : "Click this to draw a chord diagram from the lines on screen",
                               parent : bbar3,
                               callback : () => {
                                   //console.log('Internal=',internal);
                                   connectvis.corrmap();
                               },
                             });

        webutil.createbutton({ type : "info",
                             name : "Graphs",
                             position : "bottom",
                             css : { "margin": "5px"},
                             tooltip : "Click this to display the scatterplot",
                             parent : bbar3,
                             callback : connectvis.drawScatterandHisto
                           });



        

        webutil.tooltip(internal.parentDomElement);

        // ------------------------------------------------
        // On to interesting dialog
        // ------------------------------------------------
    };

    var drawColorScale=function() {

        if (internal.rendermode===8)
            return;
        
        let context=internal.layoutmanager.overlaycontext;
        let fullwidth=internal.layoutmanager.getviewerwidth();
        let dw=fullwidth*internal.orthoviewer.cleararea[1];
        let dh=internal.layoutmanager.getviewerheight();
        let y0=30;
        
        let fnsize=webutil.getfontsize(context.canvas);
        if (dw<1700)
            fnsize=Math.round((dw/1000)*fnsize);
        
        let minv=connectvis3d.transferfunction.minth;
        let maxv=connectvis3d.transferfunction.maxth;
        let numsteps=14;

        let wd=(0.25*dw)/(numsteps+1);
        let dvalue=maxv-minv;
        let dv=dvalue/numsteps;
        
        let x0=0.7*dw;
        x0=x0+internal.orthoviewer.cleararea[0]*fullwidth;
        
        y0+=2;
        let ht=0.5*(dh-y0);
        if (ht>wd)
            ht=wd;
        
        let power=10.0;
        if (dvalue>100)
            power=1.0;
        if (dvalue<0.1)
            power=100.0;
        
        
        context.font=fnsize+"px Arial";
        context.textAlign="center";
        context.textBaseline="top";

        context.fillStyle="#ffffff";
        context.fillRect(x0-2,y0-2,wd*(numsteps+1)+3,3.0*ht);

        if (connectvis3d.transferfunction.map===null)
            return;
        context.drawImage(connectvis3d.displayimg[0],x0,y0,wd*15,ht);

        context.strokeStyle="#888888";
        context.lineWidth=1;
        context.beginPath();
        context.moveTo(x0,y0);
        context.lineTo(x0+wd*15,y0);
        context.lineTo(x0+wd*15,y0+ht);
        context.lineTo(x0,y0+ht);
        context.lineTo(x0,y0);
        context.stroke();

        context.strokeStyle="#000000";
        context.lineWidth=2;

        for (let i=0;i<=numsteps;i++) {
            if (i===0 || i===numsteps || i===numsteps/2) {


                context.beginPath();
                context.moveTo(x0+0.5*(wd-1),y0+0.5*ht);
                context.lineTo(x0+0.5*(wd-1),y0+1.3*ht);
                context.stroke();
                let w0=context.measureText('-').width*-0.5;
                context.fillStyle = "#000000";
                let data=i*dv+minv;
                context.fillText(util.scaledround(data,power),x0+w0+0.5*(wd-1),y0+1.5*ht);
            }
            
            x0+=wd;
        }
    };
    
    
    // -------------------------------------------------------------------------------------------
    // Public Interface from here on
    // -------------------------------------------------------------------------------------------
    let control= {

        // Internal stuff
        internal : internal,
        setnode : setnode,
        
        
        // initialize (or reinitialize landmark control). Called from viewer when image changes. This actually creates (or recreates the GUI) as well.(This implements a function from the {@link BisMouseObserver} interface.)
        // @memberof BisGUIConnectivityControl.prototype
        // @param {BisWebSubViewer[]} subviewers - subviewers to place info in
        // @param {BisWebImage} volume - new image (not used)
        initialize : function(subviewers) { 

            if (internal.inrestorestate)
                return;

            internal.subviewers=subviewers;
            onDemandCreateGUI(true);
            const imagepath=webutil.getWebPageImagePath();
            loadparcellation(`${imagepath}/shen.json`);
            
            bisgenericio.read(`${imagepath}/lobes_right.json`).then( (obj) => {
                connectvis3d.parsebrainsurface(obj.data,obj.filename);
            }).catch( (e) => { console.log(e); });
            
            bisgenericio.read(`${imagepath}/lobes_left.json`).then( (obj) => {
                connectvis3d.parsebrainsurface(obj.data,obj.filename);
            }).catch( (e) => { console.log(e); });
            
            update(false);
            setTimeout(function() {
                window.dispatchEvent(new Event('resize'));
            },10);
        },

        // recreate gui
        setNetworksToYale(flag=true) {

            if (flag && internal.networkAttributeIndex===4)
                return;
            if (!flag && internal.networkAttributeIndex===2)
                return;
            onDemandCreateGUI(flag);
            setnode(Math.round(internal.parameters.node-1));
            this.handleresize();
        },
        
        // Loads a parcellation from fname (json or txt)
        // @memberof BisGUIConnectivityControl.prototype
        loadparcellationfile : function(fname) {
            console.log('Loading from'+fname);
            loadparcellation(fname);
        },
        

        // receive mousecoordinates and act appropriately!
        // (This implements a function from the {@link BisMouseObserver} interface.)
        // @memberof BisGUIConnectivityControl.prototype
        // @param {array} mm - [ x,y,z ] array with current point
        // @param {number} plane - 0,1,2 to signify whether click was on YZ,XZ or XY image plane (-1,3 mean 3D click)
        // @param {number} mousestate - 0=click 1=move 2=release
        //
        updatemousecoordinates : function (mm,plane,mousestate) {
            if (mousestate<0 || mousestate === undefined || mousestate===2)
                return;

            internal.mni=internal.mni2tal.getMNICoordinates(mm);
            internal.mni[3]=-1;
            if (internal.mni===null)
                return;
            
            if (internal.parcellation!==null) {
                internal.mni[3]=internal.parcellation.findMNIPoint(internal.mni[0],internal.mni[1],internal.mni[2],
                                                                   internal.overlaycontext);
            } 

            connectvis3d.draw3dcrosshairs();
            updatetext();
        },
        
        // receive window resize events and redraw 
        // (This implements a function from the {@link BisResizeObserver} interface.)
        // @memberof BisGUIConnectivityControl.prototype
        handleresize : function() {
            update(false);
            if (internal.showlegend)
                setnode(Math.round(internal.parameters.node-1));

        },

        loadmatrix : function(index,fname) {
            return loadmatrix(index,fname);
        },


        loadsamplematrices : function(filenames) {

            let loadnext = function() {
                loadmatrix(1,filenames[1],null,true,true);
                webutil.createAlert('Sample connectivity matrices loaded.');
                //window.dispatchEvent(new Event('resize'));
            };
            loadmatrix(0,filenames[0],loadnext,true,false);

        },

        info : function() {
            let s="Using node definitions from "+internal.parcellation.description+" with "+internal.parcellation.rois.length+" regions. <BR>";
            s+='Positive matrix info = ('+internal.posFileInfo+'). <BR>';
            s+='Negative matrix info = ('+internal.negFileInfo+'). <BR>';
            s+='The Broadmann areas use the BioImage Suite internal definition.<BR>The Networks are as defined in Power et al. Neuron 2011.';
            webutil.createAlert(s);
        },

        handleMouseEvent : function(e) {

            if (internal.parcellation===null)
                return;
            let point=internal.parcellation.findPoint(e.offsetX,e.offsetY,internal.overlaycontext);
            if (point==-1) {
                return;
            }
            setnode(point);
        },

        handleKeyEvent : function(event) {
            let key=event.keyCode;
            let offset=0;
            if (key===80)
                offset=-1;
            else if (key===78)
                offset=+1;
            if (offset===0)
                return;

            let domap=(event.shiftKey);

            let nodenumber=Math.round(internal.parameters.node)-1 || 0;
            let maxnode= internal.parcellation.rois.length-1;
            let intnode;

            if (domap) {
                intnode=internal.parcellation.indexmap[nodenumber]+offset;
            } else {
                intnode=nodenumber+offset;
            }

            if (intnode<0)
                intnode=maxnode;
            else if (intnode>maxnode)
                intnode=0;
            
            let newnode=0;
            if (domap) {
                newnode=internal.parcellation.rois[intnode].index;
            } else {
                newnode=intnode;
            }
            setnode(newnode);
        },

        clearmatrices : function() {
            cleanmatrixdata();

        },

        undo : function() {
            getStateFromUndoOrRedo(false);
        },

        redo : function() {
            getStateFromUndoOrRedo(true);
        },

        resetdefault : function() {
            internal.parameters.length = 50;
            internal.parameters.thickness=2;
            internal.parameters.radius=1.0;
            internal.parameters.poscolor= "#ff0000";
            internal.parameters.negcolor= "#00dddd";
            for (let ia=0;ia<internal.datgui_controllers.length;ia++) 
                internal.datgui_controllers[ia].updateDisplay();
        },
        
        showmatrices : function() {
            drawMatricesInWindow();
        },

        about : function() {

            webutil.aboutDialog(' If you use this for a publication please cite Finn et. al Nature Neuro 2015.');
        },

        importparcellation : function(image,atlasdesc=null) {
            console.log('at=',atlasdesc);
            importParcellationImage(image,atlasdesc);
        },

        importparcellationtext : function(filename) {
            importParcellationText(filename);
        },

        

        // -------------------------------------------------------------------
        /** Set the element state from a dictionary object 
            @param {object} state -- the state of the element */
        setElementState : function (dt=null) {

            //            console.log('Cleaning up');
            internal.context.clearRect(0,0,internal.canvas.width,internal.canvas.height);
            internal.overlaycontext.clearRect(0,0,internal.canvas.width,internal.canvas.height);
            internal.rendermode=dt.rendermode;
            console.log('New Render mode=',dt.rendermode);
            togglemode(false);

            internal.posFileInfo=[ "NONE", 0 ];
            internal.negFileInfo=[ "NONE", 0 ];

            if (dt.parcellation) 
                parseparcellation(dt.parcellation.text,dt.parcellation.filename,false,true);

            
            if (dt.posmatrix) {
                let neg=null;
                let pos=new BisWebMatrix();
                pos.parseFromJSON(dt['posmatrix'].matrix);
                internal.posFileInfo=dt['posmatrix'].info;
                
                pos=pos.getNumericMatrix();

                if (dt.negmatrix) {
                    neg=new BisWebMatrix();
                    neg.parseFromJSON(dt['negmatrix'].matrix);
                    neg=neg.getNumericMatrix();
                    internal.negFileInfo=dt['negmatrix'].info;
                }
                internal.conndata.setMatrices(pos,neg);
            }

            for (let attr in dt.parameters) {
                if (internal.parameters.hasOwnProperty(attr)) {
                    internal.parameters[attr] = dt.parameters[attr];
                } 
            }
            //console.log('retrieving params(1)=',JSON.stringify(dt.parameters,null,3));
            //console.log('retrieving params(2)=',JSON.stringify(internal.parameters,null,3));
            for (let ia=0;ia<internal.datgui_controllers.length;ia++) 
                internal.datgui_controllers[ia].updateDisplay();

            if (dt.linestack) {
                internal.linestack=dt.linestack;
                update();
            }

            internal.showlegend=!dt.showlegend;
            toggleshowlegend();
            connectvis3d.update3DMeshes(internal.parameters.opacity,
                                        internal.parameters.mode3d,
                                        internal.parameters.display3d
                                       );
            internal.inrestorestate=false;
            setTimeout( () => { drawColorScale();},20);

        },
        
        /** Get State as Object 
            @returns {object} -- the state of the element as a dictionary*/
        getElementState : function() {
            
            let obj = {  };

            let mat=[ internal.conndata.posMatrix, internal.conndata.negMatrix ];
            let matnames = [ 'posmatrix','negmatrix' ];
            let nummatrices=0;
            for (let i=0;i<=1;i++) {
                let info=internal.posFileInfo;
                if (i==1)
                    info=internal.negFileInfo;
                if (mat[i]) {
                    nummatrices=nummatrices+1;
                    let newmat=new BisWebMatrix();
                    newmat.setFromNumericMatrix(mat[i]);
                    console.log('Matrix ',matnames[i],newmat.getDescription());
                    obj[matnames[i]]= {
                        matrix : newmat.serializeToJSON(false),
                        info : info,
                    };
                }
            }

            if (nummatrices>0) {
                obj.linestack=internal.linestack;
            }

            obj.parameters=JSON.parse(JSON.stringify(internal.parameters));
            console.log('storing params=',JSON.stringify(obj.parameters,null,2));
            
            obj.parcellation = internal.parcellationtext;
            obj.lastnode=internal.lastnode;
            obj.showlegend=internal.showlegend;
            obj.rendermode=internal.rendermode;
            console.log('Storing Render mode=',obj.rendermode);
            return obj;
        },

        /** Disable Mouse Updates */
        disableMouseUpdates : function() {
            internal.inrestorestate=true;
        },

        setRenderMode(md) {
            internal.rendermode=md-1;

            togglemode(true);
        },

        /** get the rendermode externally */
        getRenderMode() {
            return internal.rendermode;
        }

        
    };

    internal.updateFn=update;
    internal.setnodeFn=setnode;
    internal.this=control;
    internal.parentDomElement=parent;
    let basediv=$("<div>To appear...</div>");
    internal.parentDomElement.append(basediv);
    internal.orthoviewer=orthoviewer;
    internal.orthoviewer.extraWidth3D=connectvis3d.lobeoffset;
    internal.orthoviewer.addMouseObserver(internal.this);
    internal.orthoviewer.addResizeObserver(internal.this);

    internal.canvas=internal.layoutmanager.getcanvas();
    internal.context=internal.canvas.getContext("2d");
    internal.mni2tal=bismni2tal();

    internal.overlaycanvas = internal.layoutmanager.getoverlaycanvas();
    internal.overlaycontext=internal.overlaycanvas.getContext("2d");

    // Why this needs to be bound to renderer beats me ...
    let w=internal.layoutmanager.getrenderer().domElement;
    w.addEventListener('mousedown',function(fe) {
        internal.this.handleMouseEvent(fe);});

    window.addEventListener('keydown',function(fe) {
        internal.this.handleKeyEvent(fe);
    },true);

    
    return control;
};

/** 
 * A web element to create and manage a GUI for a Connectivity Display Tool (brain connectivity matrix visualizations.)
 *  The GUI for this appears inside a {@link ViewerLayoutElement}.
 * A manager element gets a pointer to this and calls the createMenu function to add
 *    load/save objectmap to a menu
 *
 * @example
 * <bisweb-connectivitycontrolelement
 *   id="conncontrol"
 *   bis-layoutwidgetid="#viewer_layout"
 *   bis-viewerid="#viewer">
 * </bisweb-connectivitycontrolelement>
 *
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in 
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 */

class ConnectivityControlElement extends HTMLElement {

    connectedCallback() {
        
        let viewerid=this.getAttribute('bis-viewerid');
        let layoutid=this.getAttribute('bis-layoutwidgetid');
        let viewer=document.querySelector(viewerid);
        let layoutcontroller=document.querySelector(layoutid);

        let panel=new BisWebPanel(layoutcontroller,
                                  { name : "Connectivity Control",
                                    permanent : "true",
                                  });
        panel.show();
        this.innercontrol=bisGUIConnectivityControl(panel.getWidget(),viewer,layoutcontroller);
    }

    /** load parcellation file 
     * @param {string} fname - the url or filename or file object or an electron object with members 
     */
    loadparcellationfile(fname) { this.innercontrol.loadparcellationfile(fname); }
    
    /** loads a a matrix file 
     * @param {string} fname - the url or filename or file object or an electron object with members 
     */
    loadmatrix(index,fname) { this.innercontrol.loadmatrix(index,fname); }

    /** Loads sample matrices
     * @param {array} fnames - an array of (the url or filename or file object or an electron object with members)
     */
    loadsamplematrices(fnames) { this.innercontrol.loadsamplematrices(fnames);  }

    /** clears matrices */
    clearmatrices() { this.innercontrol.clearmatrices(); }

    /* undo last draw operations */
    undo() { this.innercontrol.undo(); }

    /* redo last draw operations */
    redo() { this.innercontrol.redo(); }

    /* prints info about current data */
    info() { this.innercontrol.info(); }

    /* reset default display parameters */
    resetdefault() { this.innercontrol.resetdefault(); }
    
    /* shows a popup dialog listing the most "interesting" nodes */
    viewInteresting() {

        const internal=this.innercontrol.internal;
        
        if (internal.conndata.statMatrix===null) {
            bootbox.alert('No connectivity data loaded');
            return;
        }

        if (internal.keynodedlg!==null) {
            //                  console.log('Calling show on '+internal.keynodedlg);
            internal.keynodedlg.show();
            return;
        }
        
        
        let c_data=internal.conndata.getSortedNodesByDegree(2);
        let numnodes=c_data.length-1;
        let maxnodes=Math.round(0.1*numnodes);

        let ch=internal.context.canvas.height;
        let cw=internal.context.canvas.width;
        let vp=internal.parcellation.viewport;
        let width  = 350;
        console.log('vp='+[vp.x0,vp.x1,vp.y0,vp.y1]+' w*h'+[cw,ch]);

        let showdialog=new BisWebPanel(internal.layoutmanager,
                                       {
                                           name :"Top "+maxnodes+" Nodes<BR>(sorted by degree)",
                                           width : width,
                                           mode : 'sidebar',
                                           dual : false,
                                       });


        let templates=webutil.getTemplates();
        let newid=webutil.createWithTemplate(templates.bisscrolltable,$('body'));
        let stable=$('#'+newid);
        
        let buttonnodepairs = [];

        let callback = (e) => {
            let id=e.target.id;
            let node=buttonnodepairs[id];
            internal.parameters.mode="Single Node";
            this.innercontrol.setnode(node);
        };

        let thead = stable.find(".bisthead");
        let tbody = stable.find(".bistbody",stable);

        thead.empty();
        tbody.empty();
        tbody.css({'font-size':'12px',
                   'user-select': 'none'});
        thead.css({'font-size':'12px',
                   'user-select': 'none'});
        
        let hd=$('<tr>'+
                 ' <td width="5%">#</th>'+
                 ' <td width="15%">Node</th>'+
                 ' <td width="80%">Details</th>'+
                 '</tr>');
        thead.append(hd);
        thead.css({ font: "Arial 12px"});


        for (let i=0;i<maxnodes;i++) {

            let node=c_data[numnodes-i].node;
            let degree=c_data[numnodes-i].degree;
            if (degree>0) {
                let c = [ internal.parcellation.rois[node].x,
                          internal.parcellation.rois[node].y,
                          internal.parcellation.rois[node].z];
                
                let s0= i+1+".";
                let s1= node+1;
                let lobe=gui_Lobes[internal.parcellation.rois[node].attr[0]];
                
                let s2= 'Degree='+degree+'\t(MNI='+c+', Lobe='+lobe+')';
                let nid=webutil.getuniqueid();
                
                let w=$(`<tr>
                              <td width="5%">${s0}</td>
                              <td width="15%">${s1}</td>
                              <td width="80%" id="${nid}" class="btn-link">${s2}</td>
                            </tr>`);
                tbody.append(w);
                $('#'+nid).click(callback);
                buttonnodepairs[nid]=(node);
            }
        }

        showdialog.getWidget().append(stable);
        showdialog.show();
        window.dispatchEvent(new Event('resize'));
        internal.keynodedlg=showdialog;
    }

    /* displays the matrices */
    showmatrices() { this.innercontrol.showmatrices(); }
    
    /** Imports a parcellation as text file 
     * @param {array} fnames - an array of (the url or filename or file object or an electron object with members)
     */
    importparcellationtext(f) { this.innercontrol.importparcellationtext(f); }

    /** Imports a parcellation as json file 
     * @param {array} fnames - an array of (the url or filename or file object or an electron object with members)
     */
    importparcellation(f,desc) { this.innercontrol.importparcellation(f,desc); }

    /** popups a dialog showing info about this control */
    about() { this.innercontrol.about(); }

    /** Set the element state from a dictionary object 
        @param {object} state -- the state of the element */
    setElementState(dt=null) {
        this.innercontrol.setElementState(dt);
    }

    /** Get State as Object 
        @returns {object} -- the state of the element as a dictionary*/
    getElementState() {
        return this.innercontrol.getElementState();
    }

    /** disable mouse updates until setElementState is called */
    disableMouseUpdates() {
        this.innercontrol.disableMouseUpdates();
    }

    /** set the rendermode externally */
    setRenderMode(md) {
        this.innercontrol.setRenderMode(md);
    }
    
    getRenderMode() {
        return this.innercontrol.getRenderMode();
    }

    setNetworksToYale(flag=true) {
        return this.innercontrol.setNetworksToYale(flag);
    }
}


webutil.defineElement('bisweb-connectivitycontrolelement', ConnectivityControlElement);
export default ConnectivityControlElement;

