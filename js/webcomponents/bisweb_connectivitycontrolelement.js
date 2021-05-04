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
const BisWebImage = require('bisweb_image.js');
const dat = require('bisweb_datgui');

const atlasutil=require('bisweb_atlasutilities');
const connectvis=require('bisweb_connectivityvis');
const connectvis3d=require('bisweb_connectivityvis3d');

const userPreferences = require('bisweb_userpreferences.js');


// -------------------------------------------------------------------------
// Parse Data
// -------------------------------------------------------------------------

// Critical flag for now, eventually make it an option

const guiParameters = {
    DrawLineOptions  : [ 'Positive', 'Negative', 'Both'],
    GroupNodeOptions : [ 'All', 'Single Node', 'Group' ],
    LobeValues : [],
    Lobes : [],
    Lobes2 : [],
    Lobes3 : [],
    BrodLabels : []
};

atlasutil.populateAtlasParameters(guiParameters);

const initializeBaseNameInformation = function(mode='yale',internal) {

    let index=0;
    guiParameters.LobeValues = [];
    //console.log('Mode=',mode,index);

    let currentname=atlasutil.getCurrentAtlasName();
    
    if (currentname!=='humanmni') {
        mode='mouse';
        internal.gui_Networks_Names=[];
        internal.gui_Networks_ShortNames=[];
        atlasutil.setCurrentAtlasName('allenmri');
        internal.networkAttributeIndex=0;

        const ATLAS=atlasutil.getCurrentAtlas();
        
        index=1;
        guiParameters.GroupNodeOptions[2]='Single Lobe';
        guiParameters.Lobes = ATLAS.labels.data[0].labels;
        let keys=Object.keys(guiParameters.Lobes);
        for (let i=0;i<keys.length;i++) {
            let k=keys[i];
            let v=guiParameters.Lobes[k];
            let ind = v.indexOf(' ');
            if (ind>=5) {
                guiParameters.Lobes[k]=v.substr(0,ind);
            }
        }
    } else {
        const ATLAS=atlasutil.getCurrentAtlas();
        guiParameters.Lobes = ATLAS.labels.data[0].labels;
    
        
        //    console.log('mode=',mode);
        if (mode==='yale') {
            index=1;
            internal.networkAttributeIndex=4;
            guiParameters.GroupNodeOptions[2]='Single Network';
        } else if ( mode === 'washu') {
            index=0;
            internal.networkAttributeIndex=2;
            guiParameters.GroupNodeOptions[2]='Single Network';
        } else {
            mode='lobes';
            internal.networkAttributeIndex=0;
            index=1;
            guiParameters.GroupNodeOptions[2]='Single Lobe';
        }
    }

    let keys=Object.keys(guiParameters.Lobes);
    for (let i=0;i<keys.length;i++) {
        guiParameters.LobeValues.push(guiParameters.Lobes[keys[i]]);
    }

    internal.gui_Networks=guiParameters.NetworksArray[index];
    keys=Object.keys(internal.gui_Networks);
    internal.gui_Networks_Names=[];
    internal.gui_Networks_ShortNames=[];
    for (let i=0;i<keys.length;i++) {
        internal.gui_Networks_Names.push(internal.gui_Networks[keys[i]]);
        internal.gui_Networks_ShortNames.push(guiParameters.NetworksArrayShort[index][keys[i]]);
    }


    internal.parameters.lobe=guiParameters.Lobes[1];
    internal.parameters.mode=guiParameters.GroupNodeOptions[1];
    internal.parameters.network=internal.gui_Networks[1];
    if (mode!=='mouse') 
        internal.lastguimode=mode;
};



// --------------------------------------------------------------------------------


const bisGUIConnectivityControl = function(parent,orthoviewer,layoutmanager) {

    // -------------------------------------------------------------------------
    // Control State variables
    // -------------------------------------------------------------------------


    let internal = {

        hassurfaceindices : false,
        
        // store here
        gui_Lines : guiParameters.DrawLineOptions,
        gui_Modes : guiParameters.GroupNodeOptions,
        gui_Lobes : guiParameters.Lobes,


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
            autodrawenabled : true,
            matrixscaling : false,
            node  : 200,
            linestodraw : guiParameters.DrawLineOptions[2],
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
            resol3d : 0,
            hidecereb : false,
            saturate3d : false,
            maximum3d : 1000.0,
            customhue : false,
            huevalue : 0.2,
        },
        datgui_controllers : null,
        datgui_nodecontroller : null,
        datgui_maximumcontroller : null,
        datgui_degreethresholdcontroller : null,
        datgui_opacitycontroller : null,
        datgui_customhuecontroller : null,
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
        loadingimage   : false,
        parcellationtext : null,
        lastnode : 0,

        // Info for external use
        laststate : null,
        lastsurfacename : '',
        lastguimode : 'yale'

    };



    connectvis.initialize(internal);
    connectvis3d.initialize(internal);
    //    initializeBaseNameInformation(useYaleNetworks,internal);

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

        const ATLASHEADER=atlasutil.getCurrentAtlasHeader();
        
        let half=ATLASHEADER['halflobe'];
        
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
        let numgaps=half*2+2;
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

            
            for (let i=1;i<=half;i++) {
                let arr=internal.parcellation.lobeStats[i] || [0,0,0 ];
                let arr2=internal.parcellation.lobeStats[i+half] || [0,0,0 ];
                let tot=util.range(arr[2],0,10000),tot2=0;
                if (internal.parcellation.lobeStats.length>(i+half))
                    tot2=util.range(arr2[2],0,10000);
                if (tot+tot2>0) {
                    internal.overlaycontext.fillStyle=internal.parcellation.getNonSidedLobeColor(i);
                    internal.overlaycontext.fillRect(px,py,pw,1.5*lobegap);
                    internal.overlaycontext.fillStyle=internal.parcellation.getInverseNonSidedLobeColor(i);
                    let name=guiParameters.Lobes[i] || '';
                    let ind = name.indexOf(' ');
                    if (ind<5)
                        ind=name.length;
                    name=name.slice(2,ind);
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

                let citation=atlasutil.getNetworkCitation(internal.networkAttributeIndex);
                if (citation) 
                    internal.overlaycontext.fillText(citation,midx,y0_0+20);
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
                //let state=internal.linestack[max];
                //let mode=state.mode;
                // Show the node in all times
                setnode(Math.round(internal.parameters.node-1));
                donewithmatrices=true;
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


    var setnode = function(node,updateviewer=true) {

        if (internal.parcellation===null)
            return;

        node = node || 0;
        internal.lastnode=node;
        let actualnode=util.range(Math.round(node),0,internal.parcellation.rois.length-1);
        let sortednode=Math.floor(internal.parcellation.indexmap[actualnode]);
        //console.log('Nodenumber=',actualnode,'sorted order',sortednode);
        
        internal.mni[0]= internal.parcellation.rois[sortednode].x;
        internal.mni[1]= internal.parcellation.rois[sortednode].y;
        internal.mni[2]= internal.parcellation.rois[sortednode].z;
        internal.mni[3]= actualnode;

        if (internal.showlegend) 
            internal.parcellation.drawPoint(actualnode,internal.overlaycontext);

        let coords=[];
        
        const ATLASHEADER=atlasutil.getCurrentAtlasHeader();
        
        if (ATLASHEADER['ismni']) {
            coords = internal.mni2tal.getMMCoordinates(internal.mni);
            if (updateviewer)
                internal.orthoviewer.setcoordinates(coords);
        } else {
            coords=[ 0,0,0];
            for (let i=0;i<=2;i++)
                coords[i]=internal.mni[i];
            
            if (updateviewer)
                internal.orthoviewer.setcoordinates(coords);
        }
        // END
        
        drawMatricesAndLegendsAsImages();
        if (internal.showlegend) {
            if (updateviewer)
                connectvis3d.draw3dcrosshairs(coords);
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

        //console.log('Setting:=',internal.mni);
        //        if (internal.conndata.statMatrix) {
        //  console.log('Internal=',internal.conndata.statMatrix[0]);
        //console.log('Internal=',internal.conndata.statMatrix[1]);
        //        }
        
        let s_text='MNI=('+internal.mni[0]+','+internal.mni[1]+','+internal.mni[2]+' n='+nodenumber+')';
        let s_text2="";

        if (nodenumber>-1) {

            let sortednode=internal.parcellation.indexmap[nodenumber];
            
            //console.log('Nodenumber=',nodenumber,'sortednode',sortednode);
            let displaynumber=nodenumber+1;

            let lobe=guiParameters.Lobes[internal.parcellation.rois[sortednode].attr[0]];
            internal.parameters.lobe=lobe;

            //

            let atlasinfo='';
            let coordinfo='';
            if (atlasutil.getCurrentAtlasName() === 'humanmni') {
                // MIGRATE


                
                let n=internal.parcellation.rois[sortednode].attr[internal.networkAttributeIndex]; // switch to shen network
                let network=internal.gui_Networks[n];
                if (network===undefined) {
                    network="unknown";
                } else {
                    internal.parameters.network=network;
                }

                
                
                let brod=guiParameters.BrodLabels[internal.parcellation.rois[sortednode].attr[3]];
                if (brod===undefined) {
                    brod="n/a";
                }
                atlasinfo=' ( '+lobe+', NTW='+network+', BA='+brod+').';
                coordinfo=' MNI=('+internal.mni[0]+','+internal.mni[1]+','+internal.mni[2]+')';
            } else {
                let lobe2=guiParameters.Lobes2[internal.parcellation.rois[sortednode].attr[1]];
                let lobe3=guiParameters.Lobes3[internal.parcellation.rois[sortednode].attr[2]];
                
                atlasinfo=' ( '+lobe+', '+lobe2+', ';
                coordinfo= lobe3+').';
            }
            
            s_text='Node:'+displaynumber+atlasinfo;
            s_text2=coordinfo;

            if (internal.conndata.statMatrix!==null) {
                s_text2+=', (Degree: pos='+internal.conndata.statMatrix[nodenumber][0]+', ';
                s_text2+='neg='+internal.conndata.statMatrix[nodenumber][1]+', ';
                s_text2+='sum='+internal.conndata.statMatrix[nodenumber][2]+') ';
            }
            s_text2+=' (draw order ='+(internal.parcellation.indexmap[nodenumber]+1)+')';

            internal.parameters.node=displaynumber;


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

    var cleanmatrixdata = function(dosurfaces=true) {
        internal.conndata.cleanup();
        if (internal.keynodedlg!==null) {
            internal.keynodedlg.hide();
            internal.keynodedlg.getWidget().empty();
        }
        internal.keynodedlg=null;
        internal.posFileInfo=[ "NONE", 0 ];
        internal.negFileInfo=[ "NONE", 0 ];
        internal.undostack.initialize();
        internal.linestack=[];
        if (dosurfaces) {
            connectvis3d.createAndDisplayBrainSurface(0, [1.0,1.0,1.0],internal.parameters.opacity,-1);
            connectvis3d.createAndDisplayBrainSurface(1, [1.0,1.0,1.0],internal.parameters.opacity,-1);
        }
        internal.parameters.mode3d='Uniform';
        if (internal.datgui_controllers) {
            for (let ia=0;ia<internal.datgui_controllers.length;ia++)
                internal.datgui_controllers[ia].updateDisplay();
            update();
        }

    };

    // Loads matrix. Called from input=File element
    // @param {number} index - 0=positive,1=negative
    // @param {string} filename - file to load from
    // @param {callback} done - call this when loaded (used for sample)
    // @param {boolean} sample - if sample then no alert
    // @param {boolean} updatemeshes - if true then update surface
    //
    var loaderror = function(msg) {
        webutil.createAlert(msg,true);
    };

    var updateMeshesDisplay =  function(drawcolorscale=false) {

        //console.log(JSON.stringify(internal.parameters,null,2));
        
        connectvis3d.update3DMeshes(internal.parameters.opacity,
                                    internal.parameters.mode3d,
                                    internal.parameters.display3d,
                                    internal.parameters.resol3d,
                                    internal.parameters.hidecereb,
                                    internal.parameters.saturate3d,
                                    internal.parameters.maximum3d,
                                    internal.parameters.customhue,
                                    internal.parameters.huevalue);

        
        let da1=internal.datgui_opacitycontroller;        
        if (internal.parameters.mode3d!=='Uniform') {
            internal.parameters.opacity=1.0;
            da1.domElement.style.opacity = 0.1;
        } else {
            da1.domElement.style.opacity = 1.0;
        }
        setTimeout( () => { da1.updateDisplay(); },100);

        if (internal.datgui_maximumcontroller) {
            let controllers = [ internal.datgui_maximumcontroller,
                                internal.datgui_customhuecontroller ];
            let values = [ internal.parameters.saturate3d,
                           internal.parameters.customhue ];
            for (let i=0;i<=1;i++) {
                if (values[i]) {
                    controllers[i].domElement.style.opacity=1.0;
                } else {
                    controllers[i].domElement.style.opacity=0.10;
                }
                
                if (i==0) {
                    if (connectvis3d.transferfunction.maxth>2.0 &&  !internal.parameters.saturate3d) {
                        internal.parameters['maximum3d']=connectvis3d.transferfunction.maxth;
                    }
                } else {
                    if (connectvis3d.transferfunction.hue>=0.0 &&
                        connectvis3d.transferfunction.hue<=1.0 &&
                        !internal.parameters.customhue) {
                        internal.parameters['huevalue']=connectvis3d.transferfunction.hue;
                        internal.parameters['huevalue2']=connectvis3d.transferfunction.hue2;
                        internal.parameters['mode']=connectvis3d.transferfunction.mode;
                    }
                }
                setTimeout( () => { controllers[i].updateDisplay(); },100);
            }
        }

        if (drawcolorscale) {
            setTimeout( () => { drawColorScale(); },200);
        }

        internal.orthoviewer.informToRender();
        
    };

    
    var loadmatrix = function(index,filename,doupdate=true,sample=false,updatemeshes=true) {

        return new Promise( (resolve,reject) => {

            sample = sample || false;
            
            if (internal.parcellation===null) {
                loaderror('Load parcellation before loading connectivity matrix');
                reject();
            }
            
            bisgenericio.read(filename).then( (obj) => {

                let text=obj.data;
                if (internal.parcellation===null) {
                    loaderror('Load parcellation before loading connectivity matrix');
                    reject();
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
                    reject();
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
                    
                    if (doupdate) {
                        internal.showlegend=true;
                        if (internal.parameters.degreethreshold>internal.conndata.maxsum) 
                            internal.parameters.degreethreshold=Math.round(internal.conndata.maxsum/2);
                        if (internal.parameters.maximum3d>internal.conndata.maxsum)
                            internal.parameters.maximum3d=Math.round(internal.conndata.maxsum);
                            
                        internal.datgui_degreethresholdcontroller.min(0.1).max(internal.conndata.maxsum);
                        internal.datgui_degreethresholdcontroller.updateDisplay();
                        if (internal.datgui_maximumcontroller) { 
                            let a=internal.conndata.maxsum;
                            if (a<200)
                                a=200;
                            internal.datgui_maximumcontroller.max(a);
                        }
                        
                        update();
                        setnode(internal.conndata.maxsumnode);


                        if (updatemeshes) {
                            updateMeshesDisplay();
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
                        
                        setTimeout( () => {
                            if (updatemeshes) 
                                drawColorScale();
                            autoDrawLines();
                            resolve();
                        },200);
                    } else {
                        resolve();
                    }
                    
                    if (internal.keynodedlg!==null)
                        internal.keynodedlg.hide();
                    internal.keynodedlg=null;
                }
            }).catch( (e) => {
                loaderror(e);
                reject(e);
            });
        });
    };


    // Parses Parcellation
    // @param {string} text - parcellation text
    // @param {string} filename - file to load from (either .json or .txt)
    var parseparcellation = function(text,filename,silent) {

        silent = silent || false;

        const ATLASHEADER=atlasutil.getCurrentAtlasHeader();
        internal.parcellation=new BisParcellation(ATLASHEADER);
        internal.parcellation.loadrois(text,filename,bootbox.alert);
        if (internal.datgui_nodecontroller)
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
        internal.hassurfaceindices=false;
    };

    // Loads Parcellation.
    // @param {string} in_filename - file to load from (either .json or .txt)
    var loadparcellation = function(in_filename,silent=false) {

        return new Promise( (resolve,reject) => {
            internal.parcellation=null;
            bisgenericio.read(in_filename).then( (obj) => {

                try {
                    let jsonobj=JSON.parse(obj.data);
                    let base=jsonobj.baseatlas || 'humanmni';
                    console.log('____ Loaded parcellation atlas=',base);
                    if (base !== atlasutil.getCurrentAtlasName()) {
                        atlasutil.setCurrentAtlasName(base);

                        let ATLAS=atlasutil.getCurrentAtlas();
                        let gdef=ATLAS['groupdefinitions'];
                        let name=gdef[gdef.length-1]['name'];
                        onDemandCreateGUI(name);
                        let fname=ATLAS.anatomical;
                        fname=webutil.getWebPageImagePath()+'/'+fname;
                        let newimg=new BisWebImage();
                        newimg.load(fname,'RAS').then( () => {
                            internal.loadingimage=true;
                            const ATLASHEADER=atlasutil.getCurrentAtlasHeader();
                            internal.orthoviewer.extraWidth3D=ATLASHEADER['midoffset']*1.2;
                            internal.orthoviewer.setimage(newimg);
                            internal.loadingimage=false;

                            let objmap=new BisWebImage();
                            objmap.cloneImage(newimg, { 'type' : 'short',
                                                        'numframes' : 1
                                                      });
                            internal.orthoviewer.setobjectmap(objmap,true);
                            
                            parseparcellation( obj.data,obj.filename,silent);
                            loadatlassurface(null).then( () => {
                                internal.hassurfaceindices=false;
                                resolve();
                            }).catch( (e) => {
                                reject(e);
                            });
                        });
                    }
                } catch(e) {
                    console.log('Not JSON ' +e );
                }
                parseparcellation( obj.data,obj.filename,silent);
                resolve();
            }).catch( (e) => {
                reject(e);
            });
        });
    };

    // Loads the surface atlas files
    var loadatlassurface = function(surfacename=null) {

        //console.log('Surfacename=',surfacename);
        let default_name=false;

        
        return new Promise( (resolve,reject) => {
            if (!surfacename) {
                const ATLAS=atlasutil.getCurrentAtlas();
                surfacename=webutil.getWebPageImagePath()+'/'+ATLAS['parcellations'][0].surface;
                console.log('____ Loading default surface=',atlasutil.getCurrentAtlasName(),surfacename);
                default_name=true;
            }
                
            bisgenericio.read(surfacename,true).then( (obj) => {
                let createparcels=connectvis3d.parsebrainsurface(obj.data,obj.filename);
                if (!default_name && !createparcels)
                    internal.hassurfaceindices=true;
                else
                    internal.hassurfaceindices=false;
                internal.lastsurfacename=obj.filename;
                resolve();
            }).catch( (e) => {
                bootbox.alert('Failed to load surfacename'+surfacename);
                reject(e);
            });
        });
    };

    var get_parcellation_description=function() {

        return new Promise( (resolve) => {

            let description=internal.parcellation.description || '';
            
            bootbox.prompt({
                title: "Please enter a description of the parcellation definition file",
                value: description,
                callback: function(result) {
                    if (result !== null) {
                        setTimeout(function() {
                            resolve(result);
                        },200);
                    } else {
                        setTimeout(function() {
                            resolve('');
                        },200);
                    }
                }
            });
        });

    };
    
    // Reads BioImage Suite atlas file gets a description and off to callback
    var read_ordered_lobes_image = function() {

        return new Promise( (resolve,reject) => {

            const img=new bisweb_image();
            const imagepath=webutil.getWebPageImagePath();
            const ATLAS=atlasutil.getCurrentAtlas();
            let fname=imagepath+'/'+ATLAS.labels.filename;
            console.log('____ Loading image to reorder nodes: ',fname);
            img.load(fname,'RAS').then( () => {
                resolve(img);
            }).catch( (e) => {
                bootbox.alert('Failed to read internal atlas spec file '+fname+'. Something is wrong here.');
                reject(e);
            });
        });
    };

    var createsurfacelabels=function(uniform=true) {
        let objmap=internal.orthoviewer.getobjectmap();
        if (objmap!==null) {
            connectvis3d.createSurfaceLabels(objmap);

            internal.parameters.opacity=1.0;
            if (uniform)
                internal.parameters.mode3d='Uniform';
            else
                internal.parameters.mode3d='Parcels';
            internal.parameters.display3d='Both';
            internal.parameters.hidecereb=false;
            internal.parameters.resol3d=0;
            for (let ia=0;ia<internal.datgui_controllers.length;ia++)
                internal.datgui_controllers[ia].updateDisplay();
            
            updateMeshesDisplay();
            return true;
        }
        return false;
    };
        
    // Save a parcellation
    var saveparcellation=async function() {
        
        let description='';
        try {
            description= await get_parcellation_description();
        } catch(e) {
            description='none';
        }

        internal.parcellationtext.text=internal.parcellation.serialize(description);
        
        try {
            await bisgenericio.write({
                filename : "parcellation.parc",
                title : 'File to save node definition in',
                filters : [ { name: 'JSON formatted Node definition file', extensions: [ 'parc']}],
            },internal.parcellationtext.text);
            return true;
        } catch (e) { 
            return false;
        }
    };
    
    // Imports Parcellation Text and outputs text file in json format
    // @alias BisGUIConnectivityControls~importParcellationText
    // @param {filename} textfile - file to create node definition from
    var importParcellationText = function(textfile) {

        cleanmatrixdata();
        
        return new Promise( (resolve,reject) => {
            bisgenericio.read(textfile).then( (obj) => {
                
                let textstring=obj.data;
                let filename=obj.filename;
                
                try {
                    util.parseMatrix(textstring,filename,false,3);
                } catch(e) {
                    bootbox.alert('Failed to parse file '+filename+' it does not have 3 columns or something else is wrong. ('+e+')');
                    reject(e);
                    return;
                }

                read_ordered_lobes_image().then( (atlasimage) => {
                    internal.hassurfaceindices=false;
                    let out='';
                    try {
                        const ATLASHEADER=atlasutil.getCurrentAtlasHeader();
                        out=new BisParcellation(ATLASHEADER).createParcellationFromText(textstring,filename,atlasimage,'')+"\n";
                    } catch(e) {
                        reject(e);
                    }
                    parseparcellation(out,filename+".parc",true);
                    resolve();
                }).catch( (e) => {
                    bootbox.alert(e);
                    reject(e);
                });
            }).catch( (e)=> {
                reject(e);
            });
        });
    };

    var compareLoadedImageWithAtlas=function() {

        let d=[0,0,0],s=[0,0,0];
        try {
            d=internal.orthoviewer.getimage().getDimensions();
            s=internal.orthoviewer.getimage().getSpacing();
        } catch(e) {
            return false;
        }
        const ATLASHEADER=atlasutil.getCurrentAtlasHeader();
        let truedim = ATLASHEADER['dimensions'];
        let truespa = ATLASHEADER['spacing'];
        let sum=0.0,sumsp=0.0;
        for (let i=0;i<=2;i++) {
            sum=sum+Math.abs(d[i]-truedim[i]);
            sumsp=sumsp+Math.abs(s[i]-truespa[i]);
        }

        if (sum>0 || sumsp>0.01) {
            return false;
        }

        return true;
    };
    
    

    // Imports Parcellation Image and outputs text file in json format
    // @param {BisWebImage} image - image to create from
    var importParcellationImage = function(vol,atlasdesc=null,surfacename=null) {

        let oldatlasname=atlasutil.getCurrentAtlasName();        
        
        return new Promise( (resolve,reject) => {

            let createparcellationfromimage = async (atlasimage) => {
                
                let fname=vol.getFilename();
                let index=fname.lastIndexOf(".nii.gz");
                if (index>0)
                    fname=fname.slice(0,index)+".parc";
                
                let description=atlasdesc || '';

                let out="";
                try {
                    const ATLASHEADER=atlasutil.getCurrentAtlasHeader();
                    out=new BisParcellation(ATLASHEADER).createParcellationFromImage(vol,atlasimage,description)+"\n";
                } catch(e) {
                    console.log('Error=',e);
                    bootbox.alert(e);
                    reject(e);
                    return;
                }
                
                internal.orthoviewer.setobjectmap(vol,true);
                parseparcellation(out,fname,true);
                // Check for surfaces
                loadatlassurface(surfacename).then( () => {
                    resolve();
                }).catch( (e) => {
                    console.log('No surfaces');
                    reject(e);
                });

            };


            let isvalid=atlasutil.findAndSetAtlas(vol);
            if (!isvalid) {
                const ATLASHEADER=atlasutil.getCurrentAtlasHeader();
                bootbox.alert('Bad image loaded '+vol.getDescription()+'. Must be'+ATLASHEADER['correct']);
                reject();
                return;
            }

            let atlasname=atlasutil.getCurrentAtlasName();
            onDemandCreateGUI(internal.lastguimode);
            
            if (atlasname!==oldatlasname) {
                console.log('____ Changed base',oldatlasname,'-->',atlasname,'loading anatomical image');

                let base=new BisWebImage();
                const ATLAS=atlasutil.getCurrentAtlas();
                let fname=ATLAS.anatomical;
                fname=webutil.getWebPageImagePath()+'/'+fname;
                base.load(fname,'RAS').then( () => {
                    internal.loadingimage=true;
                    const ATLASHEADER=atlasutil.getCurrentAtlasHeader();
                    internal.orthoviewer.extraWidth3D=ATLASHEADER['midoffset']*1.2;
                    internal.orthoviewer.setimage(base);
                    internal.loadingimage=false;
                    read_ordered_lobes_image().then( (atimage) => {
                        createparcellationfromimage(atimage);
                    }).catch( (e) => { reject(e); });
                }).catch( (e) => { reject(e); });
            } else {
                read_ordered_lobes_image().then( (atimage) => {
                    createparcellationfromimage(atimage);
                }).catch( (e) => { reject(e); });
            }
        });
    };

    // -------------------------------------------------------------------------------------------
    // create GUI
    // -------------------------------------------------------------------------------------------

    var autoDrawLines=function() {
        if (!internal.parameters.autodrawenabled ||
            internal.conndata.statMatrix===null)
            return;

        connectvis.removelines();
        connectvis.createlines();
    };


    // actual GUI creation when main class is ready
    // The parent element is internal.parentDomElement
    var onDemandCreateGUI = function (mode='yale') {


        initializeBaseNameInformation(mode,internal);
        //console.log('attr=',        internal.networkAttributeIndex,mode);

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
        coords.add(data,'autodrawenabled').name('Auto Draw');


        let disp = gui.addFolder('Display');
        let disp2 = gui.addFolder('Display 3D');
        let adv = gui.addFolder('Advanced');


        let clist = [];

        let modecnt=coords.add(data,'mode',guiParameters.GroupNodeOptions).name("Mode");
        modecnt.onChange( () => {
            autoDrawLines();
        });


        clist.push(modecnt);
        let a1=coords.add(data,'node',1,400).name("Node");
        clist.push(a1);
        a1.onChange(function(val) {
            setnode(Math.round(val-1));
            autoDrawLines();
        });
        internal.datgui_nodecontroller=a1;

        let dlist=[];

        if (internal.networkAttributeIndex===0)
            dlist.push(coords.add(data,'lobe',guiParameters.LobeValues).name("Lobe"));
        else
            dlist.push(coords.add(data,'network',internal.gui_Networks_Names).name("Network"));

        internal.datgui_degreethresholdcontroller=coords.add(data,'degreethreshold',1,100).name("Degree Thrshld");
        dlist.push(internal.datgui_degreethresholdcontroller);

        dlist.push(coords.add(data,'linestodraw',guiParameters.DrawLineOptions).name("Lines to Draw"));

        

        dlist.push(internal.datgui_degreethresholdcontroller);
        dlist.push(disp.add(data,'length',10,200).name("Length"));
        dlist.push(disp.add(data,'thickness',1,4).name("Thickness"));
        dlist.push(disp.addColor(data, 'poscolor').name("Pos-Color"));
        dlist.push(disp.addColor(data, 'negcolor').name("Neg-Color"));
        for (let i=0;i<dlist.length;i++) {
            let e=dlist[i];
            clist.push(e);
            e.onFinishChange( () => { autoDrawLines();});
        }



        clist.push(adv.add(data,'matrixthreshold',0.0,1.0).name('Matrix Threshold'));
        clist.push(adv.add(data,'filter',connectvis.filter_modes).name('Threshold by'));
        userPreferences.safeGetItem("internal").then( (f) => {
            if (f) {
                clist.push(adv.add(data,'matrixscaling').name('Matrix Scaling').onChange( () => {
                    if (connectvis.hideDisplayDialog())
                        connectvis.corrmap();
                }));
            }
        });

        let da1=disp2.add(data,'opacity',0.0,1.0).name('Opacity').onFinishChange( () => {
            updateMeshesDisplay();
        });
        internal.datgui_opacitycontroller=da1;

        const ATLASHEADER=atlasutil.getCurrentAtlasHeader();
        if (ATLASHEADER['multiressurfaces']) {
            let da15=disp2.add(data,'resol3d',0,3).name('Smoothness').step(1).onFinishChange( () => {
                updateMeshesDisplay();
            });
            clist.push(da15);
            
            let da16=disp2.add(data,'hidecereb',0,3).name('Hide Cereb').onChange( () => {
                updateMeshesDisplay();
            });
            clist.push(da16);
        } else {
            data['hidecereb']=false;
            data['smoothness']=0;
        }

        let da2=disp2.add(data,'mode3d',connectvis3d.color_modes).name("Mesh Color Mode");
        da2.onChange( () => {
            updateMeshesDisplay(true);
        });


        userPreferences.safeGetItem("internal").then( (f) => {
            if (f) {
                let disp3 = gui.addFolder('Advanced (Display 3D)');
                disp3.add(data,'saturate3d').name("Force Maximum").onChange( () => {
                    updateMeshesDisplay(true);
                });
                
                internal.datgui_maximumcontroller=disp3.add(data,'maximum3d',0.0,2000)
                    .name("Max Value for 3D Surface (3D)").
                    step(1.0).onFinishChange( () => {
                        if (data['saturate3d']) {
                            updateMeshesDisplay(true);
                        }
                    });
                
                disp3.add(data,'customhue').name("Custom Hue").onChange( () => {
                    updateMeshesDisplay(true);
                    
                });
                internal.datgui_customhuecontroller=disp3.add(data,'huevalue',0.01,0.99).name("Hue").step(0.01).onFinishChange( () => {
                    if (data['customhue']) {
                        updateMeshesDisplay(true);
                    }
                });
            }
        });

                                                                              
        let da3=disp2.add(data,'display3d',connectvis3d.display_modes).name("Show Meshes");
        da3.onChange( () => {
            updateMeshesDisplay();
        });

        let da4=disp2.add(data,'radius',0.2,4.0).name("Radius (3D)");
        da4.onFinishChange( () => {   autoDrawLines();      });


        


        clist.push(da4);
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
        /*userPreferences.safeGetItem("internal").then( (f) => {
            if (f) {
                webutil.createbutton({ type : "info",
                                       name : "Graphs",
                                       position : "bottom",
                                       css : { "margin": "5px"},
                                       tooltip : "Click this to display the scatterplot",
                                       parent : bbar3,
                                       callback : connectvis.drawScatterandHisto
                                     });
            }
        });*/






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

        let numsteps=14;

        let wd=(0.25*dw)/(numsteps+1);
        let x0=0.7*dw;
        x0=x0+internal.orthoviewer.cleararea[0]*fullwidth;

        y0+=2;
        let ht=0.5*(dh-y0);
        if (ht>wd)
            ht=wd;


        context.fillStyle="#ffffff";
        context.fillRect(x0-20,y0-ht,wd*(numsteps+1)+23,4.0*ht);

        if (connectvis3d.transferfunction.map===null)
            return;

        let minv=connectvis3d.transferfunction.minth;
        let maxv=connectvis3d.transferfunction.maxth;

        if (connectvis3d.transferfunction.mode==='dual') {
            maxv=Math.max(Math.abs(maxv),Math.abs(minv));
            minv=-maxv;
            
        }

        let dvalue=maxv-minv;
        let dv=dvalue/numsteps;
        
        
        let power=10.0;
        if (dvalue>100)
            power=1.0;
        if (dvalue<0.1)
            power=100.0;

        context.font=fnsize+"px Arial";
        context.textAlign="center";
        context.textBaseline="top";
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

        if (connectvis3d.transferfunction.showlabels) {
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
                    context.fillText(util.scaledround(data,power)+'  ',x0+w0+0.5*(wd-1),y0+1.5*ht);
                }
                
                x0+=wd;
            }
        }
    };


    // -------------------------------------------------------------------------------------------
    // Public Interface from here on
    // -------------------------------------------------------------------------------------------
    let control= {

        // Internal stuff
        internal : internal,
        setnode : setnode,


        loaddefaultatlas(atlasname=null) {

            atlasutil.setCurrentAtlasName(atlasname);
            const ATLAS=atlasutil.getCurrentAtlas();
            let gdef=ATLAS['groupdefinitions'];
            let name=gdef[gdef.length-1]['name'];
            onDemandCreateGUI(name);
            return this.setParcellation(ATLAS['parcellations'][0]);
        },

        // initialize (or reinitialize landmark control). Called from viewer when image changes. This actually creates (or recreates the GUI) as well.(This implements a function from the {@link BisMouseObserver} interface.)
        // @memberof BisGUIConnectivityControl.prototype
        // @param {BisWebSubViewer[]} subviewers - subviewers to place info in
        // @param {BisWebImage} volume - new image (not used)
        initialize : function(subviewers) {

            internal.subviewers=subviewers;
            if (internal.inrestorestate)
                return;
            
            if (!internal.loadingimage) {
                this.loaddefaultatlas();
            }
            
            update(false);
            setTimeout(function() {
                window.dispatchEvent(new Event('resize'));
            },10);
        },

        // autoDrawLines
        autoDrawLines() {
            autoDrawLines();
        },
        
        // recreate gui
        setnodeGroupOption(flag='yale') {

            if (flag === 'yale' && internal.networkAttributeIndex===4)
                return;
            if (flag === 'washu' && internal.networkAttributeIndex===2)
                return;
            if (flag === 'lobes' && internal.networkAttributeIndex===0)
                return;

            onDemandCreateGUI(flag);
            setnode(Math.round(internal.parameters.node-1));
            this.handleresize();
        },

        // Loads a parcellation from fname (json or txt)
        // @memberof BisGUIConnectivityControl.prototype
        loadparcellationfile : function(fname) {
            return loadparcellation(fname);
        },


        // receive mousecoordinates and act appropriately!
        // (This implements a function from the {@link BisMouseObserver} interface.)
        // @memberof BisGUIConnectivityControl.prototype
        // @param {array} mm - [ x,y,z ] array with current point
        // @param {number} plane - 0,1,2 to signify whether click was on YZ,XZ or XY image plane (-1,3 mean 3D click)
        // @param {number} mousestate - 0=click 1=move 2=release
        //
        updatemousecoordinates : function (mm,plane,mousestate) {
            if (mousestate!==2)
                return;

            connectvis3d.draw3dcrosshairs(mm);
            
            let objmap=internal.orthoviewer.getobjectmap();
            if (objmap!==null) {
                let spa=objmap.getSpacing();
                let dim=objmap.getDimensions();
                let c=[0,0,0];
                for (let i=0;i<=2;i++) {
                    c[i]=Math.floor(mm[i]/spa[i]+0.5);
                }

                let voxel=c[0]+c[1]*dim[0]+c[2]*dim[0]*dim[1];
                try {
                    let val=objmap.getImageData()[voxel];
                    if (val>=0) {
                        setnode(val-1,false);
                        autoDrawLines();
                    }
                    return;
                } catch (e) {
                    console.log('Some error trying old fashioned way',e);
                }
            }
            
            
            
            internal.mni=internal.mni2tal.getMNICoordinates(mm);
            internal.mni[3]=-1;
            if (internal.mni===null)
                return;

            if (internal.parcellation!==null) {
                internal.mni[3]=internal.parcellation.findMNIPoint(internal.mni[0],internal.mni[1],internal.mni[2],
                                                                   internal.overlaycontext);
            }

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

            return new Promise( (resolve,reject) => {
                loadmatrix(0,filenames[0],false,true,false).then( () => {
                    loadmatrix(1,filenames[1],true,true,true).then( () => {
                        webutil.createAlert('Sample connectivity matrices loaded.');
                        resolve();
                    }).catch( (e) => { reject(e); });
                }).catch( (e) => { reject(e); });
            });
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
            autoDrawLines();
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

            let domap=!(event.shiftKey);

            let nodenumber=Math.round(internal.parameters.node)-1 || 0;
            let maxnode= internal.parcellation.rois.length-1;
            let newnode=0;

            if (domap) {
                newnode=internal.parcellation.indexmap[nodenumber]+offset;
            } else {
                newnode=nodenumber+offset;
            }

            if (newnode<0)
                newnode=maxnode;
            else if (newnode>maxnode)
                newnode=0;

            if (domap) {
                newnode=internal.parcellation.rois[newnode].index;
            }
            
            //            let newnode=0;
            //            if (domap) {
            //                newnode=
            //            } else {
            //                newnode=sortednode;
            //            }
            setnode(newnode);
            autoDrawLines();
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

        importparcellation : function(image,atlasdesc=null,surfacename=null) {
            cleanmatrixdata(false);
            return importParcellationImage(image,atlasdesc,surfacename);
        },

        importparcellationtext : function(filename) {
            internal.orthoviewer.clearobjectmap();
            cleanmatrixdata(false);
            return importParcellationText(filename);
            
        },



        // -------------------------------------------------------------------
        /** Set the element state from a dictionary object
            @param {object} state -- the state of the element */
        setElementState : function (dt=null) {

            return new Promise( (resolve,reject) => {
                internal.context.clearRect(0,0,internal.canvas.width,internal.canvas.height);
                internal.overlaycontext.clearRect(0,0,internal.canvas.width,internal.canvas.height);
                internal.rendermode=dt.rendermode;
                togglemode(false);
                cleanmatrixdata();
                
                internal.posFileInfo=[ "NONE", 0 ];
                internal.negFileInfo=[ "NONE", 0 ];
                
                if (dt.parcellation) {
                    
                    let obj=JSON.parse(dt.parcellation.text);
                    atlasutil.setCurrentAtlasName(obj.baseatlas);
                    parseparcellation(dt.parcellation.text,dt.parcellation.filename,false);
                }
                
                let gmode=internal.lastguimode || null;
                
                if (gmode===null) {
                    const ATLAS=atlasutil.getCurrentAtlas();
                    let gdef=ATLAS['groupdefinitions'];
                    gmode=gdef[gdef.length-1]['name'];
                }
                onDemandCreateGUI(gmode);
                
                let prom=Promise.resolve();
                if (dt.hassurfaceindices) {
                    prom=loadatlassurface(dt.lastsurfacename);
                }
                
                prom.then( () => {
                    
                    if (!internal.hassurfaceindices)
                        createsurfacelabels();
                    
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
                    
                    for (let ia=0;ia<internal.datgui_controllers.length;ia++)
                        internal.datgui_controllers[ia].updateDisplay();
                    
                    if (dt.linestack) {
                        internal.linestack=dt.linestack;
                        update();
                    }
                    
                    internal.showlegend=!dt.showlegend;
                    toggleshowlegend();
                    updateMeshesDisplay();
                    internal.inrestorestate=false;
                    setTimeout( () => {
                        drawColorScale();
                        resolve();
                    },20);
                }).catch( (e) => {
                    bootbox.alert('Failed to restore state'+e);
                    reject(e);
                });
            });
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

            obj.hassurfaceindices=internal.hassurfaceindices;
            obj.lastsurfacename=internal.lastsurfacename;
  
            obj.parcellation = internal.parcellationtext;
            obj.lastnode=internal.lastnode;
            obj.showlegend=internal.showlegend;
            obj.rendermode=internal.rendermode;
            obj.lastguimode=internal.lastguimode;
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
        },

        setobjectmap( vol ) {
            internal.orthoviewer.setobjectmap(vol,true);
        },
        
        loadatlas(objname,species=null) {


            return new Promise( (resolve,reject) => {
                
                const imagepath=webutil.getWebPageImagePath();
                atlasutil.setCurrentSpeciesName(species);
                let same=compareLoadedImageWithAtlas();
                let p=null;
                if (!same) {
                    p=new Promise( (resolve,reject) => {
                        let image0 = new BisWebImage();
                        const ATLAS=atlasutil.getCurrentAtlas();
                        let fname=ATLAS.anatomical;
                        let imgname=`${imagepath}/${fname}`;
                        console.log('____ Loading new anatomical image',imgname);
                        image0.load(imgname,"RAS").then( () => {
                            internal.loadingimage=true;
                            internal.orthoviewer.setimage(image0);
                            internal.loadingimage=false;
                            /*let center = ATLASHEADER['center'];
                            setTimeout( () => {
                                internal.orthoviewer.setcoordinates(center);
                                resolve();
                                },100);*/
                            resolve();
                        }).catch( (e) => { reject(e); });
                    });
                } else {
                    p=Promise.resolve();
                }

                p.then( () => { 
                    let image1 = new BisWebImage();
                    image1.load(objname,"RAS").then( () => { 
                        this.setobjectmap(image1);
                        resolve(image1);
                    }).catch( (e) => {
                        bootbox.alert("Error loading"+ (e|| ''));
                        reject(e);
                    });
                }).catch( (e) => { reject(e); });
            });
        },


        setParcellation(element) {

            cleanmatrixdata(false);

            let name=element['name'];
            let imagename=element['image'];
            let surfacename=element['surface'];
            let parcfile=element['parc'] || null;
            atlasutil.setCurrentSpeciesName(element['species']);
            const imagepath=webutil.getWebPageImagePath();
            this.clearmatrices();
            
            return new Promise( (resolve,reject) => {
                this.loadatlas(imagepath+'/'+imagename,element['species']).then( (img) => {
                    if (parcfile) {
                        loadparcellation(imagepath+'/'+parcfile,false,true).then( () => {
                            onDemandCreateGUI(internal.lastguimode);
                            loadatlassurface(imagepath+'/'+surfacename).then( () => {
                                if (!internal.hassurfaceindices)
                                    createsurfacelabels();

                                resolve();
                            }).catch( (e) => { reject(e); });
                        }).catch( (e) => { reject(e); });
                    } else {
                        importParcellationImage(img,name+' Atlas',imagepath+'/'+surfacename).then( () => {
                            if (!internal.hassurfaceindices)
                                createsurfacelabels();
                            resolve();
                        }).catch( (e) => { reject(e); });
                    }
                }).catch( (e) => { reject(e); });
            });
        },

        createSurfaceLabels() {
            return createsurfacelabels(false);
        },

        saveParcellation() {
            return saveparcellation();
        }
    };

    internal.updateFn=update;
    internal.setnodeFn=setnode;
    internal.this=control;
    internal.parentDomElement=parent;
    let basediv=$("<div>To appear...</div>");
    internal.parentDomElement.append(basediv);
    internal.orthoviewer=orthoviewer;
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
    loadparcellationfile(fname) {
        return this.innercontrol.loadparcellationfile(fname);
    }

    /** loads a a matrix file
     * @param {string} fname - the url or filename or file object or an electron object with members
     */
    loadmatrix(index,fname) {
        return this.innercontrol.loadmatrix(index,fname);
    }

    /** Loads sample matrices
     * @param {array} fnames - an array of (the url or filename or file object or an electron object with members)
     */
    loadsamplematrices(fnames) {
        return this.innercontrol.loadsamplematrices(fnames);
    }

    /** clears matrices */
    clearmatrices() {
        this.innercontrol.clearmatrices();
    }

    /* undo last draw operations */
    undo() {
        this.innercontrol.undo();
    }

    /* redo last draw operations */
    redo() {
        this.innercontrol.redo();
    }

    /* prints info about current data */
    info() {
        this.innercontrol.info();
    }

    /* reset default display parameters */
    resetdefault() {
        this.innercontrol.resetdefault();
    }

    /* shows a popup dialog listing the most "interesting" nodes */
    viewInteresting() {

        const internal=this.innercontrol.internal;

        if (internal.conndata.statMatrix===null) {
            bootbox.alert('No connectivity data loaded');
            return;
        }

        if (internal.keynodedlg!==null) {
            internal.keynodedlg.show();
            return;
        }


        let c_data=internal.conndata.getSortedNodesByDegree(2);

        let numnodes=c_data.length-1;
        let maxnodes=Math.round(0.1*numnodes);

        
        //let ch=internal.context.canvas.height;
        //let cw=internal.context.canvas.width;
        //let vp=internal.parcellation.viewport;
        let width  = 350;
        //console.log('vp='+[vp.x0,vp.x1,vp.y0,vp.y1]+' w*h'+[cw,ch]);

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
            this.innercontrol.autoDrawLines();
            /*if (!internal.parameters.autodrawenabled ||
                internal.conndata.statMatrix===null)
                return;
            
            connectvis.removelines();
            connectvis.createlines();*/
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

            // numnodes-i, reverse sort greater to smaller
            let node=c_data[numnodes-i].node;
            let degree=c_data[numnodes-i].degree;

            if (degree>0) {
                let c = [ internal.parcellation.rois[node].x,
                          internal.parcellation.rois[node].y,
                          internal.parcellation.rois[node].z];

                let s0= i+1+".";
                let s1= node+1;
                let sortednode=Math.floor(internal.parcellation.indexmap[node]);
                let lobe=guiParameters.Lobes[internal.parcellation.rois[sortednode].attr[0]];

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
    showmatrices() {
        this.innercontrol.showmatrices();
    }

    /** Imports a parcellation as text file
     * @param {array} fnames - an array of (the url or filename or file object or an electron object with members)
     */
    importparcellationtext(f) {
        return this.innercontrol.importparcellationtext(f);
    }

    /** Imports a parcellation as json file
     * @param {array} fnames - an array of (the url or filename or file object or an electron object with members)
     */
    importparcellation(f,desc,surfacename=null) {        
        return new Promise( (resolve,reject) => {
            this.innercontrol.importparcellation(f,desc,surfacename).then( () => {
                this.clearmatrices();
                if (surfacename===null) {
                    this.innercontrol.createSurfaceLabels();
                }
                resolve();
            }).catch( (e) => {
                reject(e);
            });
        });
    }

    /** popups a dialog showing info about this control */
    about() {
        this.innercontrol.about();
    }

    /** Set the element state from a dictionary object
        @param {object} state -- the state of the element */
    setElementState(dt=null) {
        return this.innercontrol.setElementState(dt);
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

    setnodeGroupOption(flag='yale') {
        return this.innercontrol.setnodeGroupOption(flag);
    }

    setParcellation(element) {
        this.innercontrol.setParcellation(element);
    }

    loaddefaultatlas(externalmode) {

        
        return new Promise( (resolve,reject) => {

            let prom=null;
            if (!externalmode) {
                prom=userPreferences.safeGetItem('species');
            } else {
                prom=Promise.resolve('human');
            }

            prom.then( (species) => {

                let sp=webutil.getQueryParameter('species') || '';
                if (sp==='mouse')
                    species='mouse';
                else
                    species='human';

                console.log('++++ Load default atlas',species);

                setTimeout( () => {
                    if (species==='all')
                        species='human';
                    atlasutil.setCurrentSpeciesName(species);
                    if (species === atlasutil.getCurrentSpeciesName()) {
                        this.innercontrol.loaddefaultatlas(atlasutil.getCurrentAtlasName()).then( () =>{
                            resolve();
                        }).catch( (e) => {
                            reject(e);
                        });
                    }
                },500);
            }).catch( (e) => { reject(e); });
        });
    }

    createSurfaceLabels() {
        return this.innercontrol.createSurfaceLabels();
    }

    saveParcellation() {
        return this.innercontrol.saveParcellation();
    }

}


webutil.defineElement('bisweb-connectivitycontrolelement', ConnectivityControlElement);
export default ConnectivityControlElement;
