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

/* global window,setTimeout,document,HTMLElement */

"use strict";

const dat = require('bisweb_datgui');
const util=require('bis_util');
const bisweb_image = require('bisweb_image');
const UndoStack=require('bis_undostack');
const imagealgo=require('bis_imagealgorithms');
const webutil=require('bis_webutil');
const $=require('jquery');
const bootbox=require('bootbox');
const bisweb_apputil=require("bisweb_apputilities.js");
const biscustom = require('bisweb_custommodule.js');
const modules = require('moduleindex.js');
const biswrap = require('libbiswasm_wrapper');
const webfileutil = require('bis_webfileutil');
const inobounce=require('inobounce.js');
const BisWebPanel = require('bisweb_panel.js');
// -------------------------------------------------------------------------
// Keep warnings quiet
//    var a=[ new Blob() ]; a=null;

const NUMBUTTONS = [ 7, 30];
const NUMFIRST   = [ 0, 5 ];
const SHIFTS = [ [ 1,0,0], [-1,0,0], [0,1,0], [0,-1,0] , [ 0,0,1],[0,0,-1]];


/**
 * A web element to create and manage a GUI for a Paint Tool (interactive segmentation)
 * that draws landmarks in an {@link OrthogonalViewer} viewer.
 *  The GUI for this appears inside a {@link ViewerLayoutElement}.
 * A manager element gets a pointer to this and calls the createMenu function to add
 *    load/save objectmap to a menu
 *
 * @example
 * <bisweb-painttoolelement
 *    id="painttool"
 *    bis-layoutwidgetid="#viewer_layout"
 *    bis-viewerid="#viewer">
 * </bisweb-painttoolelement>
 *
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 */
class PaintToolElement extends HTMLElement {

    constructor() {

        super();
        this.internal = {

            // global stuff
            initialized : false,
            this : null,
            offsets : null,
            imagedim : null,
            imagespa : null,

            volume : null,
            volumedata : null,
            objectmap : null,
            objectmapdata : null,
            undostack : new UndoStack(100,10),
            currentundoarray : [],
            parentDomElement : null,

            // Viewer to update
            orthoviewer : null,
            settingviewer : false,

            // landmarks and index to current one
            currentvalue  : 1,
            lastselectedbutton : null,
            lasttwocolorbuttons : [ null,null ],
            colorbuttons : { },

            // layout controller
            layoutcontroller : null,

            // gui stuff
            selectcolormodal : null,
            overwritecheck : null,
            threedcheck : null,
            thresholdcheck : null,
            connectcheck : null,
            datgui : null,
            regdatgui : null,
            regularizemodal : null,
            minthreshold : null,
            maxthreshold : null,

            data : {
                enabled : false,
                threshold : false,
                connect : false,
                threed : false,
                overwrite : false,
                brushsize : 3,
                minth : 1.0,
                maxth : 10.0,

                reg_iter : 4,
                reg_smoothness :  2.0,
                reg_convergence : 0.1,

            },

            algoController : null,
            blockUndo : false,
            regularizeModule : null,
            morphologyModule : null,
            maskModule : null,
            thresholdModule : null,
            defaceModule : null,
            internalUpdate : false,
        };

    }

    connectedCallback() {

        let viewerid=this.getAttribute('bis-viewerid');
        let layoutid=this.getAttribute('bis-layoutwidgetid');
        let algoid=this.getAttribute('bis-algorithmcontrollerid') || null;

        this.internal.algocontroller=null;
        if (algoid !== null) 
            this.internal.algocontroller = document.querySelector(algoid) || null;
        
        let in_orthoviewer=document.querySelector(viewerid);

        this.internal.layoutcontroller=document.querySelector(layoutid);

        this.panel=new BisWebPanel(this.internal.layoutcontroller,
                                   {
                                       'name' : 'Paint Tool',
                                       'dual' : false,
                                       'permanent' : true,
                                       'width' : '300px'
                                   });
        
            
        $(this.panel.widget).attr('aria-label', 'bisweb-paint-widget');
        this.panel.show();
        this.internal.parentDomElement=this.panel.getWidget();
        var basediv=$("<div>Paint tool will appear once an image is loaded.</div>");
        this.internal.parentDomElement.append(basediv);
        this.internal.orthoviewer=in_orthoviewer;
        this.internal.orthoviewer.addMouseObserver(this);
        BisWebPanel.setMaxDockedPanels(2);
    }

    // --------------------------------------------------------------------------------
    // Update GUI from internal changes
    // --------------------------------------------------------------------------------

    /** function that enables or disables editing
     * @param {boolean} doenable - if true enable else disable
     */
    enableEdit(doenable=false) {

        if (doenable !== true)
            doenable=false;

        if (doenable === this.internal.data.enabled)
            return;

        if (doenable===false)
            this.unselectbutton(this.internal.lastselectedbutton);
        else
            this.selectbutton(this.internal.lastselectedbutton);

        this.internal.data.enabled=doenable;

        if (this.internal.data.enabled) {
            this.panel.makeActive(true);
            inobounce.enable();
        } else {
            this.panel.makeActive(false);
            inobounce.disable();
        }
    }

    /** function to update gui after internal operations
     */
    updategui() {
    }

    // --------------------------------------------------------------------------------
    // Undo & Redo
    // --------------------------------------------------------------------------------
    /** reset undo stack (e.g. when creating a new objectmap or loading one in) */
    resetundo() {
        this.internal.undostack.initialize();
    }


    /** lowel level undo (usethis=2) or redo (usethis=1) operation
     * @param {number} usethis - if 2 does undo, if 1 does redo
     */
    applyarray(arr,usethis) {

        var index=0,val=0,i=0;
        for (i=0;i<arr.length;i+=3) {
            index=arr[i];
            val=arr[i+usethis];
            this.internal.objectmapdata[index]=val;
        }
        this.internal.orthoviewer.updateobjectmapdisplay();
    }

    /** GUI Callback for undo  */
    undooperation() {
        if (this.internal.currentundoarray.length>0) {
            this.internal.undostack.addOperation(this.internal.currentundoarray);
            this.internal.currentundoarray=[];
        }
        var arr=this.internal.undostack.getUndo();
        if (arr===null) {
            return false;
        }
        this.applyarray(arr,2);
        return false;
    }

    /** GUI Callback for redo */
    redooperation() {
        if (this.internal.currentundoarray.length>0) {
            this.internal.undostack.addOperation(this.internal.currentundoarray);
            this.internal.currentundoarray=[];
        }

        var arr=this.internal.undostack.getRedo();
        if (arr===null) {
            return false;
        }

        this.applyarray(arr,1);
        return false;
    }

    // --------------------------------------------------------------------------------
    // Brush Operations ...
    // --------------------------------------------------------------------------------

    /** Connectivity operator, called when painting with threshold & connect on
     * @param {TypedArray} intensities - obtained from BisWebImage.getImageData();
     * @param {array} x - center of mask in voxels [ x,y,z]
     * @param {object} bounds - has members x0,x1,y0,y1,z0,z1 that define extend to limit operation to
     * @param {number} minth - minimum paint threshold
     * @param {number} maxth - maximim paint threshold
     * @returns {array} mask - an array of voxels in the bounds with 1 if to be painted or 0 otherwise
     */
    createconnectmask(intensities,x,bounds,minth,maxth) {

        var maskdim = [ (bounds.x1-bounds.x0+1),(bounds.y1-bounds.y0+1),(bounds.z1-bounds.z0+1)];
        var masksize=  maskdim[0]*maskdim[1]*maskdim[2];
        var maskoffsets = [ 1,maskdim[0],maskdim[0]*maskdim[1]];
        var mask=new Array(masksize);
        var maskindex=(x[0]-bounds.x0)+(x[1]-bounds.y0)*maskoffsets[1]+(x[2]-bounds.z0)*maskoffsets[2];
        mask[maskindex]=1;

        for (var i=0;i<masksize;i++)
            mask[i]=-1;

        // mask ... 1 good
        //          0 bad
        //         -1 not visited yet


        var stack = []; stack.push([x[0],x[1],x[2]]);

        var testloc= [0,0,0],diff=0,j=0,k=0,center=null,index=0;


        while (stack.length>0) {

            center=stack.pop();
            for (j=0;j<=5;j++) {

                testloc[0]=util.range(SHIFTS[j][0]+center[0],bounds.x0,bounds.x1);
                testloc[1]=util.range(SHIFTS[j][1]+center[1],bounds.y0,bounds.y1);
                testloc[2]=util.range(SHIFTS[j][2]+center[2],bounds.z0,bounds.z1);

                diff=0;
                for (k=0;k<=2;k++)
                    diff+=Math.abs(testloc[k]-center[k]);

                if (diff>0) { // i.e. we are not on a boundary
                    maskindex=
                        (testloc[0]-bounds.x0)+
                        (testloc[1]-bounds.y0)*maskoffsets[1]+
                        (testloc[2]-bounds.z0)*maskoffsets[2];

                    if (mask[maskindex]===-1) {
                        index=testloc[0]+
                            testloc[1]*this.internal.offsets[1]+
                            testloc[2]*this.internal.offsets[2];

                        if (intensities[index]>=minth && intensities[index]<=maxth) {
                            mask[maskindex]=1;
                            stack.push([testloc[0],testloc[1],testloc[2]]);
                        } else {
                            mask[maskindex]=0;
                        }
                    }
                }
            }
        }
        return mask;
    }


    /** Perfor  mouse (brush )operation
     * @param {array} x - position of mouse click in voxels [ x,y,z]
     * @param {number} plane - plane that was clicked (0=YZ,1=XZ,2=XY)
     */
    dobrushoperation(x,plane) {

        var mask=null, dothreshold=this.internal.data.threshold, proceed=1;
        var newv=this.internal.currentvalue;
        var maskindex=0,i,j,k,slice_offset,offset,index,oldv,intensity;

        // First use brushsize to figure out bounds in bounds. x0:x1 y0:y1 z0:z1
        var w=Math.floor(this.internal.data.brushsize/2);

        let bounds = {
            x0 : util.range(x[0] - w,0,this.internal.imagedim[0]-1),
            x1 : util.range(x[0] + w,0,this.internal.imagedim[0]-1),
            y0 : util.range(x[1] - w,0,this.internal.imagedim[1]-1),
            y1 : util.range(x[1] + w,0,this.internal.imagedim[1]-1),
            z0 : util.range(x[2] - w,0,this.internal.imagedim[2]-1),
            z1 : util.range(x[2] + w,0,this.internal.imagedim[2]-1),
        };

        // If not threed
        if (!this.internal.data.threed && (plane>=0 && plane<=2) ) {
            if (plane===0) {
                bounds.x0 = x[0]; bounds.x1=x[0];
            } else if (plane===1) {
                bounds.y0 = x[1]; bounds.y1=x[1];
            } else {
                bounds.z0 = x[2]; bounds.z1=x[2];
            }
        }


        // To do connectivity must be thresholding as well and central value must pass muster
        if (this.internal.data.connect && dothreshold) {
            intensity=this.internal.volumedata[x[0]+x[1]*this.internal.offsets[1]+x[2]*this.internal.offsets[2]];
            if ( intensity>= this.internal.data.minth && intensity<=this.internal.data.maxth) {
                mask=this.createconnectmask(this.internal.volumedata,x,bounds,
                                            this.internal.data.minth,this.internal.data.maxth);
                dothreshold=false;
            } else {
                return false;
            }
        }

        for (k=bounds.z0;k<=bounds.z1;k++) {
            slice_offset=k*this.internal.offsets[2];

            for (j=bounds.y0;j<=bounds.y1;j++)  {
                offset=j*this.internal.offsets[1]+slice_offset;

                for (i=bounds.x0;i<=bounds.x1;i++)  {
                    index=i+offset;

                    if (mask!==null)  {
                        proceed=mask[maskindex];
                        ++maskindex;
                    }

                    oldv=this.internal.objectmapdata[index];
                    intensity=this.internal.volumedata[index];

                    // to proceed we need following conditions
                    if (proceed>0) {
                        if (oldv!==newv) {
                            if (this.internal.data.overwrite === true || oldv===0) {
                                if (dothreshold === false || ( intensity>= this.internal.data.minth && intensity<=this.internal.data.maxth)) { // intensity threshold
                                    this.internal.objectmapdata[index]=newv;
                                    this.internal.currentundoarray.push( index,newv,oldv);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // --------------------------------------------------------------------------------
    // Smooth Operations ...
    // --------------------------------------------------------------------------------
    /** Perfor  objectmap regularization -- gets values from popup dialog */
    smoothoperation() {

        var vol = imagealgo.regularizeObjectmap(this.internal.objectmap,
                                                this.internal.reg_iter,
                                                this.internal.data.reg_smoothness,
                                                this.internal.data.reg_convergence);


        var newdata=vol.getImageData();
        var l=newdata.length;
        this.internal.currentundoarray = [] ;
        var numchanges=0.0;
        for (var i=0;i<l;i++) {
            if (this.internal.objectmapdata[i]!=newdata[i]) {
                this.internal.currentundoarray.push( i,newdata[i],this.internal.objectmapdata[i]);
                this.internal.objectmapdata[i]=newdata[i];
                ++numchanges;
            }
        }
        this.internal.undostack.addOperation(this.internal.currentundoarray);

        var per=util.scaledround( (100.0*numchanges/l),100.0);
        webutil.createAlert("Objectmap Regularized "+per+"% voxels changed");

        const self=this;

        setTimeout(function() {
            self.internal.orthoviewer.updateobjectmapdisplay();
        },1);

        return false;
    }


    /** Pops up modal to obtain parameters for objectmap regularization and if "OK" calls smoothoperation */
    smoothoperationyesno () {

        if (this.internal.objectmap===null) {
            webutil.createAlert('No objectmap in memory!',true);
            return;
        }


        if (this.internal.regularizemodal===null) {

            var f2 = new dat.GUI({autoPlace: false});
            f2.add(this.internal.data, 'reg_smoothness',[ 1.0,2.0,4.0,8.0,16.0,32.0 ]).name("Smoothness");
            f2.add(this.internal.data, 'reg_iter', [ 1,2,4,8,12,16]).name("Iterations");
            f2.add(this.internal.data, 'reg_convergence', [0.05,0.1,0.2,0.4 ]).name("Convergence");

            this.internal.regularizemodal=webutil.createmodal("Regularize Objectmap Properties","modal-sm");
            this.internal.regularizemodal.body.append(f2.domElement);
            webutil.removedatclose(f2);
            this.internal.regularizemodal.close.prop('textContent','Cancel');

            const self=this;
            let clb=function(e) {
                e.preventDefault(); // cancel default behavior
                webutil.enablebutton(self.internal.regularizemodal.close, false);
                webutil.enablebutton(self.internal.regularizemodal.exec,false);
                var alert = $("<div class=\"alert alert-info\" role=\"alert\">Regularizing objectmap. See Javascript console for print output.</div>");
                self.internal.regularizemodal.body.append(alert);
                setTimeout(function() {
                    self.smoothoperation();
                    self.internal.regularizemodal.dialog.modal('hide');
                    alert.remove();
                    webutil.enablebutton(self.internal.regularizemodal.close,true);
                    webutil.enablebutton(self.internal.regularizemodal.exec,true);
                },10);
            };


            this.internal.regularizemodal.exec=
                webutil.createbutton({ type : "danger",
                                       name : "Smooth Objectmap",
                                       parent : this.internal.regularizemodal.footer}).click(clb);

        }

        this.internal.regularizemodal.dialog.modal('show');
        return;
    }

    // --------------------------------------------------------------------------------
    // Load & Save Objectmap
    // --------------------------------------------------------------------------------
    /** Save objectmap to a file */
    saveobjectmap(fname) {

        if (!webutil.inElectronApp()) {
            fname="objectmap.nii.gz";
        }
        fname = fname || this.internal.objectmap.getFilename();
        bisweb_apputil.saveImage(this.internal.objectmap,fname,"Objectmap");
    }


    safeSetNewObjectmap(in_objmap) {

        const self=this;
        
        return new Promise( (resolve,reject) => { 
            
            if (this.internal.imagedim===null) {
                reject('No image in memory can not load/accept objectmap');
                return;
            }


            var dim=in_objmap.getDimensions();
            var spa=in_objmap.getSpacing();
            var name=in_objmap.getFilename();
            
            var diff=0.0;
            for (var i=0;i<=2;i++) {
                diff+=Math.abs(self.internal.imagedim[i]-dim[i]);
                diff+=Math.abs(self.internal.imagespa[i]-spa[i]);
            }
            
            if (diff>0.001) {
                reject('Objectmap '+name+' has different dimensions or spacing ('+self.internal.imagedim.join()+' vs'+ dim.join() +') than currently loaded image');
                return;
            }
        
            var orient1=self.internal.volume.getOrientationName();
            var orient2=in_objmap.getOrientationName();
            if (orient1!==orient2) {
                reject('Objectmap '+name+' has different orientation '+ orient2 + ' vs '+orient1+' than currently loaded image');
                return;
            }


            setTimeout(function() {
                self.internal.objectmap=in_objmap;
                self.internal.objectmapdata=self.internal.objectmap.getImageData();
                self.internal.settingviewer=true;
                console.log('objectmap loaded',self.internal.objectmap.getDescription());
                self.setViewerObjectmap(in_objmap,true,"Objectmap");
                self.internal.settingviewer=false;
                self.resetundo();
                self.updategui();
                self.setObjectmapOpacity(0.8);
                resolve('all set');
            },1);
        });
    }                 

    
    /** Load objectmap from a file
     * @param {event} evt - event response to input=file (file = evt.target.files[0])
     * @param {boolean} isimage -- if true evt is really an image
     */
    loadobjectmap(evt) {

        const self=this;
        var infile=evt;
        try {
            infile = evt.target.files[0];
        } catch(e) {
            // Nothing really, it is not a file object
        }
        if (infile.length<2)
            return;
        
        let img=new bisweb_image();
        img.load(infile)
            .then(() => {
                self.safeSetNewObjectmap(img).catch( (e) => {
                    webutil.createAlert(e,true);
                });
            }).catch( (e) =>  {
                webutil.createAlert(e,true);
            });
        return false;
    }

    // --------------------------------------------------------------------------------
    // Create New Objectmap
    // --------------------------------------------------------------------------------
    /** Create new objectmap (also reset undo and set viewer) */

    createnewobjectmap() {

        this.resetundo();
        this.internal.objectmap=new bisweb_image();
        this.internal.objectmap.cloneImage(this.internal.volume,{ type : 'short', numframes : 1 });
        this.internal.objectmapdata=this.internal.objectmap.getImageData();
        var len=this.internal.objectmapdata.length;

        for (var j=0;j<len;j++)
            this.internal.objectmapdata[j]=0;
        this.internal.objectmap.computeIntensityRange();

        this.setnewobjectmap(null,true);
    }

    /** set new objectmap to this tool and optionally update the viewer
     * @param {BisWebImage} newobj - the new objectmap image
     * @param {boolean} updateviewer - if true notify viewer. (false probably means event came from viewer}
     */
    setnewobjectmap(newobj=null,updateviewer=false) {

        
        if (newobj !== null )
            this.internal.objectmap=newobj;

        this.internal.imagedim=this.internal.objectmap.getDimensions();
        this.internal.offsets = [ 1 , this.internal.imagedim[0], this.internal.imagedim[0]*this.internal.imagedim[1] ];
        this.internal.imagespa = this.internal.objectmap.getSpacing();
        this.internal.objectmapdata=this.internal.objectmap.getImageData();

        const self=this;
        const fn=function() {
            self.setViewerObjectmap(self.internal.objectmap,true,false);
            self.updategui();
        };

        if (updateviewer) {
            setTimeout(fn,100);
        }
    }

    /** Pops up a modal to confirm if user is sure they want to create new objectmap,
     * then calls createnewobjectmap
     */
    createnewobjectmapyesno() {

        if (this.internal.objectmap===null) {
            return;
        }

        const self=this;
        let clb=function(result) {
            if (result===true) {
                self.createnewobjectmap();
            }
        };

        bootbox.confirm("Are you sure you want to delete current objectmap and create a new empty one?", clb);
        return false;
    }
    // --------------------------------------------------------------------------------
    // Create GUI
    // --------------------------------------------------------------------------------

    /** Function that is an aid to managing the color selection. Call this to make a color button's
     * state ``not selected'' (square, not highlighted)
     * @param {JQueryElement} button - the button to manipulate
     */
    unselectbutton(btn) {
        if (btn===null)
            return;

        btn.css({
            'border-radius':'0px',
            'border-color':'#000000',
        });
    }

    /** Function that is an aid to managing the color selection. Call this to make a color button's
     * state ``selected'' (round, highlighted)
     * @param {JQueryElement} button - the button to manipulate
     */
    selectbutton(btn) {
        if (btn===null)
            return;

        btn.css({
            'border-radius':'30px',
            'border-color':'#ffffff',
        });
        btn.blur();
        this.internal.lastselectedbutton=btn;
        var val=parseInt(btn.attr('bis')) || 0 ;
        this.internal.currentvalue=val;
        if (val>1000)
            val=val-1000;
    }

    /** Callback to handle colorbutton pressed (i.e. select which color to use from here on)
     * @param {evt} event - callback event. Color index is in evt.target.attr('bis')
     */
    colorbuttonpressed(evt) {

        var btn=$(evt.target);
        if (( btn || null) === null)
            return;

        if (this.internal.lastselectedbutton!==null)
            this.unselectbutton(this.internal.lastselectedbutton);

        var val=parseInt(btn.attr('bis')) || 0 ;

        var selected=null;

        if (val> 1000)  {
            // Callback is coming from dialog box
            val=val-1000;

            // Copy attributes
            var b = btn.css('backgroundColor'),f = btn.css('color'),t = btn.prop('textContent');
            t=t.slice(1,t.length-1).trim();
            var title=""+val;

            // Set attributes
            this.internal.lasttwocolorbuttons[0].attr({'bis':title});
            this.internal.lasttwocolorbuttons[0].prop('textContent',t);
            this.internal.lasttwocolorbuttons[0].css({'background-color':b,   'color':f});

            // Put in swap buttons
            selected=this.internal.lasttwocolorbuttons[0];
            var tmp=this.internal.lasttwocolorbuttons[1];
            this.internal.lasttwocolorbuttons[1]=this.internal.lasttwocolorbuttons[0];
            this.internal.lasttwocolorbuttons[0]=tmp;
        } else {
            // Just a boring regular click button
            selected=btn;
        }
        this.selectbutton(selected);
        return false;
    }

    /** Create the GUI for the tool when appropriate */
    onDemandCreateGUI() {

        if (this.internal.parentDomElement===null)
            return;

        this.internal.parentDomElement.empty();
        let basediv=webutil.creatediv({ parent : this.internal.parentDomElement});

        let sbar=webutil.createbuttonbar({ parent: basediv});
        let sbar2=webutil.createbuttonbar({ parent: basediv});
        
        const self=this;
        const en_clb=function(sel) { self.enableEdit(sel); };

        this.internal.enablecheck=webutil.createcheckbox({name : 'Enable',
                                                          type : "danger",
                                                          checked : this.internal.data.enabled,
                                                          parent : sbar,
                                                          callback : en_clb,
                                                          css : { 'margin-right':'10px'},
                                                         });

        const ov_clb=function(sel) { self.internal.data.overwrite=sel; };

        this.internal.overwritecheck=webutil.createcheckbox({name : 'Overwrite',
                                                             checked : this.internal.data.overwrite,
                                                             parent : sbar,
                                                             css : { 'margin-right':'10px'},
                                                             callback : ov_clb,
                                                            });

        const br3d_clb=function(sel) { self.internal.data.threed=sel; };
        this.internal.threedcheck=webutil.createcheckbox({name : '3D Brush',
                                                          checked : this.internal.data.threed,
                                                          parent : sbar,
                                                          css : { 'margin-right':'5px'},
                                                          callback : br3d_clb,
                                                         });



        const thr_clb=function(sel) {
            self.internal.data.threshold=sel;
            if (!sel && self.internal.data.connect===true) {
                self.internal.data.connect=false;
                self.internal.connectcheck.prop("checked", false );
            }
        };
        this.internal.thresholdcheck=webutil.createcheckbox({name : 'Threshold',
                                                             checked : this.internal.data.threshold,
                                                             parent : sbar2,
                                                             css : { 'margin-right':'10px'},
                                                             callback : thr_clb,
                                                            });

        const con_clb=function(sel) {
            self.internal.data.connect=sel;
            if (sel && self.internal.data.threshold===false) {
                self.internal.data.threshold=true;
                self.internal.thresholdcheck.prop("checked", true );
            }
        };
        this.internal.connectcheck=webutil.createcheckbox({name : 'Connect',
                                                           checked : this.internal.data.connect,
                                                           css : { 'margin-right':'10px'},
                                                           parent : sbar2,
                                                           callback : con_clb,
                                                          });


        var f1 = new dat.GUI({autoPlace: false});
        basediv.append(f1.domElement);
        var c1=f1.addFolder('Brush Parameters');
        c1.add(this.internal.data,'brushsize',1,25).name("Brush Size").step(1);


        var r=this.internal.volume.getIntensityRange();
        this.internal.data.minth=r[0];
        this.internal.data.maxth=r[1];

        this.internal.minthreshold=c1.add(this.internal.data,'minth',r[0],r[1]).name("Min Threshold");
        this.internal.maxthreshold=c1.add(this.internal.data,'maxth',r[0],r[1]).name("Max Threshold");
        c1.open();
        var elem1=webutil.creatediv({ parent : basediv,
                                      css : {'margin-top':'20px', 'margin-left':'10px'}});

        webutil.removedatclose(f1);


        var cmap=util.objectmapcolormap;

        var modal=webutil.createmodal("Select Object/Color");
        this.internal.selectcolormodal=modal.dialog;

        const colorcallback = function(e) {
            e.preventDefault(); // cancel default behavior
            self.colorbuttonpressed(e);
        };


        for (var pass=0;pass<=1;pass++) {

            var min=NUMFIRST[pass];
            for (var i=min;i<NUMBUTTONS[pass]+min;i++) {
                var cl = [ cmap[i][0], cmap[i][1],cmap[i][2] ];
                var hexcolor = util.rgbToHex(cl[0],cl[1],cl[2]);
                for (var k=0;k<=2;k++) {
                    if (cl[k]<128)
                        cl[k]=255;
                    else
                        cl[k]=0;
                }
                var hexcolor2 = util.rgbToHex(cl[0],cl[1],cl[2]);
                var name= ""+i;
                var epar=elem1;
                var attr=i;
                var tooltip = null;
                if (pass==1) {
                    var jn="",kn="";
                    if (i<100)
                        jn=" ";
                    if (i<10)
                        kn=" ";
                    name = "["+jn+i+kn+"]";
                    epar=modal.body;
                    attr=i+1000;
                    tooltip = ""+i;
                }

                this.internal.colorbuttons[attr]=webutil.createbutton({
                    name : name,
                    attr : attr,
                    type : 'color-btn',
                    parent : epar,
                    tooltip : tooltip,
                    css : { "background-color": hexcolor,
                            'font-family':'monospace',
                            'border-color':'#000000',
                            'border-radius':'0px',
                            'color': hexcolor2},
                    callback : colorcallback });
            }
        }
        this.internal.lasttwocolorbuttons[0]=this.internal.colorbuttons[NUMBUTTONS[0]-1];
        this.internal.lasttwocolorbuttons[1]=this.internal.colorbuttons[NUMBUTTONS[0]-2];
        if (this.internal.data.enabled===true)
            this.selectbutton(this.internal.colorbuttons[1]);
        else
            this.internal.lastselectedbutton=this.internal.colorbuttons[1];

        webutil.createbutton({
            name : '..',
            type : 'info',
            parent : elem1,
            position : 'top',
            tooltip : 'Click here to select more colors',
            css : { 'margin-left': '0px'},
            callback : ( () => { this.internal.selectcolormodal.modal('show'); })
        });

        var bbar0=webutil.createbuttonbar({ parent: basediv,
                                            css : {'margin-top': '20px','margin-bottom': '10px'}});


        const undo_clb=function() {
            self.undooperation();

        };
        const redo_clb=function() { self.redooperation();};

        webutil.createbutton({ type : "warning",
                               name : "Undo",
                               position : "bottom",
                               tooltip : "Click this to undo the last edit operation.",
                               parent : bbar0,
                               callback : undo_clb,
                             });

        webutil.createbutton({ type : "info",
                               name : "Redo",
                               position : "bottom",
                               tooltip : "Click this to redo the last edit operation.",
                               parent : bbar0,
                               callback : redo_clb,
                             });

        webutil.tooltip(this.internal.parentDomElement);
        webutil.tooltip(modal.body);
    }


    /** initialize (or reinitialize the paint tool). Called from viewer when image changes. This actually creates (or recreates the GUI) as well.(This implements a function from the {@link BisMouseObserver} interface.
     * @param {Bis_SubViewer} subviewers - subviewers to place info in
     * @param {BisWebImage} volume - new image
     * @param {Boolean} samesize - does new image have the same size as the old one
     */

    initialize(subviewers,volume,samesize=false) {
        // ignore subviewers

        this.internal.volume=volume;
        this.internal.volumedata=volume.getImageData();
        // new image

        // Feb 2018 -- make these two conditional if same image dimensions no need to do anything
        if (!samesize) {
            this.resetundo();
            this.createnewobjectmap();
        } else {
            this.setnewobjectmap(null,true);
        }
        this.onDemandCreateGUI();
        this.updategui();

        if (this.internal.thresholdModule)
            this.internal.thresholdModule.createOrUpdateGUI();
        if (this.internal.morphologyModule)
            this.internal.morphologyModule.createOrUpdateGUI();
        if (this.internal.regularizeModule)
            this.internal.regularizeModule.createOrUpdateGUI(); 
        if (this.internal.maskModule)
            this.internal.maskModule.createOrUpdateGUI();
        if (this.internal.defaceModule)
            this.internal.defaceModule.createOrUpdateGUI();
       
    }


    /** receive mousecoordinates and act appropriately!
     * (This implements a function from the {@link BisMouseObserver} interface.)
     * @param {array} mm - [ x,y,z ] array with current point
     * @param {number} plane - 0,1,2 to signify whether click was on YZ,XZ or XY image plane (-1,3 mean 3D click)
     * @param {number} mousestate - 0=click 1=move 2=release
     */
    updatemousecoordinates(mm,plane,mousestate) {

        if (this.internal.imagespa===null)
            return;
        
        let good=true,x=[0,0,0];
        for (let i=0;i<=2;i++) {
            x[i]=Math.round(mm[i]/this.internal.imagespa[i]);
            if (x<0 || x>=this.internal.imagedim[i]) {
                good=false;
            }
        }

        if (this.internal.morphologyModule && good)
            this.internal.morphologyModule.updateCrossHairs(x);


        if (!this.panel.isOpen())
            return;
    
        
        if (mousestate === undefined || this.internal.objectmap===null || this.internal.data.enabled===false) {
            return;
        }


        if (mousestate===-1)
            return;

        if (mousestate===2) {
            this.internal.undostack.addOperation(this.internal.currentundoarray);
            this.internal.currentundoarray=[];
            if (mousestate===2)
                return;
        }

        if (mousestate===0)  {
            // Initialize undo array
            if (this.internal.currentundoarray.length>0) {
                this.internal.undostack.addOperation(this.internal.currentundoarray);
            }
            this.internal.currentundoarray = [] ;
        }

        const self=this;
        const clb=function() { self.internal.orthoviewer.updateobjectmapdisplay(); };

        if (good) {
            this.dobrushoperation(x,plane);
            
            if (mousestate===0) {
                setTimeout(clb,1);
            }
            return false;
        }
    }

    createMenu(parent)  {

        const self=this;
        let new_clb=function() { self.createnewobjectmapyesno(); };
        
        webutil.createMenuItem(parent,'Clear Objectmap',
                               new_clb);

        let load_clb=function(f) {  self.loadobjectmap(f);};

        webutil.createMenuItem(parent,''); // separator
        webfileutil.createFileMenuItem(parent,'Load Objectmap',
                                       load_clb,
                                       { title : 'Load Objectmap Image',  save : false,
                                         suffix : 'NII',
                                       });

        let save_clb=function(f) { console.log(f); self.saveobjectmap(f);};

        webfileutil.createFileMenuItem(parent,'Save Objectmap',
                                       function(f) {  save_clb(f);},
                                       { title : 'Save Objectmap',
                                         save : true,
                                         filters : "NII",
                                         suffix : "NII",
                                       });

        webutil.createMenuItem(parent,''); // separator
    }

    setObjectmapOpacity(val) {
        setTimeout( () => {
            let cmapcontrol=this.internal.orthoviewer.getColormapController();
            let elem=cmapcontrol.getElementState();
            elem.opacity=val;
            cmapcontrol.setElementState(elem);
            cmapcontrol.updateTransferFunctions(true);
        },10);
    }


    
    addTools(tmenu)  {
        // Trap set objectmap function and redirect this here ...
        const self=this;
        this.internal.orthoviewer.setObjectMapFunction = function (f) {
            self.setobjectmapimage(f);
        };


        //        webutil.createMenuItem(tmenu,'Paint Tool',function() {
        //            webutil.activateCollapseElement(self.internal.parentDomElement);
        //        });
        //webutil.createMenuItem(tmenu,''); // separator

        return new Promise( (resolve) => {


            if (this.internal.algocontroller) {
                
                const self=this;
                this.internal.algocontroller.sendImageToViewer=function(input,options) {
                    let type = options.viewersource || 'image';
                    if (type==='overlay') {
                        self.safeSetNewObjectmap(input).catch( (e) => {
                            webutil.createAlert(e,true);
                        });
                    } else {
                        self.internal.orthoviewer.setimage(input);
                        self.setObjectmapOpacity(0.5);
                    }
                };

                let moduleoptions = { 'numViewers' : 0,
                                      'dual' : false ,
                                    };

                moduleoptions.name='Create Objectmap';
                this.internal.thresholdModule=biscustom.createCustom(this.internal.layoutcontroller,
                                                                     this.internal.algocontroller,
                                                                     modules.getModule('binaryThresholdImage'),
                                                                     moduleoptions);
                webutil.createMenuItem(tmenu, moduleoptions.name,function() {
                    self.internal.thresholdModule.show();
                });

                

                biswrap.initialize().then( () => {
                    if (biswrap.uses_gpl()) {
                        moduleoptions.name='Deface Head Image';
                        let mod=modules.getModule('defaceImage');
                        mod.outputmask=true;
                        this.internal.defaceModule=biscustom.createCustom(this.internal.layoutcontroller,
                                                                          this.internal.algocontroller,
                                                                          mod,
                                                                          moduleoptions);
                        webutil.createMenuItem(tmenu, moduleoptions.name,function() {
                            self.internal.defaceModule.show();
                        });
                        webutil.createMenuItem(tmenu,'');

                        moduleoptions.name='Morphology Operations';
                        this.internal.morphologyModule=biscustom.createCustom(this.internal.layoutcontroller,
                                                                              this.internal.algocontroller,
                                                                              modules.getModule('morphologyFilter'),
                                                                              moduleoptions);
                        webutil.createMenuItem(tmenu, moduleoptions.name, () => {
                            self.internal.morphologyModule.show();
                        });

                        moduleoptions.name='Regularize Objectmap';
                        this.internal.regularizeModule=biscustom.createCustom(this.internal.layoutcontroller,
                                                                              this.internal.algocontroller,
                                                                              modules.getModule('regularizeObjectmap'),
                                                                              moduleoptions);
                        webutil.createMenuItem(tmenu, moduleoptions.name,function() {
                            self.internal.regularizeModule.show();
                        });

                        webutil.createMenuItem(tmenu,'');
                        moduleoptions.name='Mask Image';
                        this.internal.maskModule=biscustom.createCustom(this.internal.layoutcontroller,
                                                                        this.internal.algocontroller,
                                                                        modules.getModule('maskImage'),
                                                                        moduleoptions);
                        webutil.createMenuItem(tmenu, moduleoptions.name,function() {
                            self.internal.maskModule.show();
                        });



                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    setViewerObjectmap(vol,plainmode,alert) {
        if (alert !== false)
            webutil.createAlert('Objectmap loaded from ' + vol.getDescription());
        plainmode = plainmode || false;
        this.internal.orthoviewer.setobjectmap_internal(vol, plainmode);
    }

    setobjectmapimage(img) {
        this.safeSetNewObjectmap(img).catch( (e) => {
                webutil.createAlert(e,true);
        });
    }
}

webutil.defineElement('bisweb-painttoolelement', PaintToolElement);
export default PaintToolElement;
