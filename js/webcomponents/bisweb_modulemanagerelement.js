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

/*global window,document,setTimeout,HTMLElement */

"use strict";

const webutil = require('bis_webutil');

const biscustom = require('bisweb_custommodule.js');
const modules = require('moduleindex.js');
const biswrap = require('libbiswasm_wrapper');
const copyModule = require('viewerCopyImage');
/**
 * A Module Manager Element that manages processing algorithm elements
 *
 * @example
 *
 * <bisweb-modulemanager
 *     bis-layoutwidgetid="#layoutmanager"
 *     bis-algorithmcontrollerid ="#algocontroller"
 * </bisweb-viewerapplication>
 *
 * Attributes
 *     bis-layoutwidgetid : the id of a layout controller element (if not specified use dialog boxes)
 *     bis-algortihmcontrollerid : the id of the algorithm controller 
 */
class ModuleManagerElement extends HTMLElement {


    connectedCallback() {

        this.mode=this.getAttribute('bis-mode') || "normal";
        const algorithmcontrollerid = this.getAttribute('bis-algorithmcontrollerid');
        const layoutwidgetid = this.getAttribute('bis-layoutwidgetid') || null;
        if (layoutwidgetid === null) {
            this.layoutcontroller = null;
        } else {
            this.layoutcontroller = document.querySelector(layoutwidgetid);
        }
        this.algorithmController = document.querySelector(algorithmcontrollerid);
        this.customs = [];
        this.modules = {};
        this.moduleMenu = [ null,null,null,null];
        this.viewers = [];
    }



    createModuleOnDemandAndShow(name, module, moduleoptions = {}) {
        if (this.modules[name] === null) {
            if (typeof module === "function")
                module = new module(this.mode);
            this.modules[name] = biscustom.createCustom(null,
                                                        this.algorithmController,
                                                        module, moduleoptions);
            this.customs.push(this.modules[name]);
        }

        this.modules[name].showDialog();
    }


    createModule(name, index,dosep , module, moduleoptions = {}) {

        const self = this;
        if (this.layoutcontroller !== null) {
            if (typeof module === "function") 
                module = new module(this.mode);

            this.customs.push(biscustom.createCustom(this.layoutcontroller.createToolWidget(name),
                                                     this.algorithmController,
                                                     module, moduleoptions));
            return;
        }

        this.modules[name] = null;
        webutil.createMenuItem(this.moduleMenu[index], name,
                               function () {
                                   self.createModuleOnDemandAndShow(name, module, moduleoptions);
                               });
        if (dosep)
            webutil.createMenuItem(this.moduleMenu[index], '');
    }


    transferImages(v1,v2) {

        let img=this.viewers[v1].getimage();
        if (img) {
            this.viewers[v2].setimage(img);
            let obj=this.viewers[v1].getobjectmap();
            if (obj) {
                let clt=this.viewers[v1].getcolortype();
                this.viewers[v2].setobjectmap(obj,false,clt);
            }
        }
    }

    transferImageToOverlay(v1,v2) {

        let img=this.viewers[v1].getimage();
        if (img) {
            this.viewers[v2].setobjectmap(img);
        }
    }

    swapImages() {

        let img=this.viewers[0].getimage();
        let obj=this.viewers[0].getobjectmap();
        let clt=this.viewers[0].getcolortype();
        this.transferImages(1,0);
        if (img) {
            this.viewers[1].setimage(img);
            if (obj)
                this.viewers[1].setobjectmap(obj,false,clt);
        }
    }

    initializeElements(menubar, viewers = [],editmenu=null) {
        if (!this.algorithmController) {
            return;
        }
        
        this.viewers = viewers;
        let numviewers = this.viewers.length;
        for (let i = 0; i < numviewers; i++)
            this.viewers[i].addImageChangedObserver(this);

        let moduleoptions = { 'numViewers': numviewers };
        if (editmenu===null) {
            this.moduleMenu[0] = webutil.createTopMenuBarMenu('Edit', menubar);
        } else {
            this.moduleMenu[0]=editmenu;
            webutil.createMenuItem(editmenu,'');
        }
        this.algorithmController.createMenuItems(this.moduleMenu[0]);
        webutil.createMenuItem(this.moduleMenu[0], '');
        
        const self=this;
        if (this.mode==='dual' || this.mode==='paravision') {
            webutil.createMenuItem(this.moduleMenu[0],"Transfer Viewer 1 &rarr; 2",function() {
                self.transferImages(0,1);
            });
            webutil.createMenuItem(this.moduleMenu[0],"Transfer Viewer 2 &rarr; 1",function() {
                self.transferImages(1,0);
            });
            webutil.createMenuItem(this.moduleMenu[0],"Swap Images 1 &harr; 2 ",function() {
                self.swapImages();
            });
            webutil.createMenuItem(this.moduleMenu[0],"Transfer Viewer 2 Image &rarr; Viewer 1 Overlay ",function() {
                self.transferImageToOverlay(1,0);
            });
            this.createModule('Custom Transfer', 0,false , new copyModule, moduleoptions);

        } else {
            webutil.createMenuItem(this.moduleMenu[0],"Copy Overlay &rarr; Image",function() {
                let obj=self.viewers[0].getobjectmap();
                if (obj) {
                    self.viewers[0].setimage(obj);
                }
            });
        }

        if (this.mode==='overlay') {
            webutil.createMenuItem(this.moduleMenu[0], '');
            this.createModule('Reslice Image',0, false, modules.resliceImage, {'numViewers' : 1 });
            return this.moduleMenu[0];
        } 

        
        this.moduleMenu[1] = webutil.createTopMenuBarMenu('Image Processing', menubar);

        if (this.mode !== 'paravision')
            this.moduleMenu[2] = webutil.createTopMenuBarMenu('Segmentation', menubar);
        else
            this.moduleMenu[2] = this.moduleMenu[1];

        if (this.mode!=='single') {
            this.moduleMenu[3] = webutil.createTopMenuBarMenu('Registration', menubar);
        }

        biswrap.initialize().then( () => {
            this.initializeElementsInternal(menubar,moduleoptions);
        });
        
        return null;
    }

    
    initializeElementsInternal(menubar,moduleoptions) {

        let usesgpl=biswrap.uses_gpl();
        if (usesgpl)
            usesgpl=true;
        else
            usesgpl=false;
    
        this.createModule('Smooth Image',1, false, modules.smoothImage, moduleoptions);
        this.createModule('Normalize Image',1, false, modules.normalizeImage, moduleoptions);
        this.createModule('Threshold Image',1, false, modules.thresholdImage, moduleoptions);
        this.createModule('Correct Bias Field',1, true, modules.sliceBiasFieldCorrect, moduleoptions);
        this.createModule('Change Spacing',1, true, modules.changeImageSpacing, moduleoptions);
        this.createModule('Resample Image',1, false, modules.resampleImage, moduleoptions);
        this.createModule('Flip Image',1, false, modules.flipImage, moduleoptions);
        this.createModule('Crop Image',1, false, modules.cropImage, moduleoptions);
        this.createModule('Blank Image',1, false, modules.blankImage, moduleoptions);
        this.createModule('Extract Frame',1, true, modules.extractFrame, moduleoptions);
        
        let dosep=(this.mode === 'paravision');
        
        this.createModule('Combine Images',1, false, modules.combineImages, moduleoptions);
        this.createModule('Average 4D Image',1, dosep, modules.process4DImage, moduleoptions);
        this.createModule('Create Mask',2, false, modules.binaryThresholdImage, moduleoptions);
        this.createModule('Morphology Filter',2, false, modules.morphologyFilter, moduleoptions);
        if (usesgpl) {
            this.createModule('Segment Image',2, true, modules.segmentImage, moduleoptions);
        }
        this.createModule('Regularize Objectmap',2, true, modules.regularizeObjectmap, moduleoptions);
        this.createModule('Mask Image', 2, false, modules.maskImage, moduleoptions);

        if (this.mode!=='single') {
            this.createModule('Reslice Image',3, true, modules.resliceImage, moduleoptions);
            this.createModule('Manual Registration',3, true, modules.manualRegistration, moduleoptions);
            if (usesgpl) {
                this.createModule('Linear Registration',3, false, modules.linearRegistration, moduleoptions);
                this.createModule('Non Linear Registration',3, true, modules.nonlinearRegistration, moduleoptions);
            }
            this.createModule('Project Image',3, false, modules.projectImage, moduleoptions);
            this.createModule('Back-Project Image',3, usesgpl, modules.backProjectImage, moduleoptions);
            if (usesgpl) {
                this.createModule('Motion Correction',3, false, modules.motionCorrection, moduleoptions);
            }
        } else {
            webutil.createMenuItem(this.moduleMenu[1], '');
            this.createModule('Reslice Image',1, false, modules.resliceImage, moduleoptions);
        }
        return this.moduleMenu[0];
            
    }

    handleViewerImageChanged() { //viewer, source, colortype) 

        // This is mostly for drag and drop but who knows
        let openmod=biscustom.getOpenModule();
        if (openmod!==null) {
            openmod.createOrUpdateGUI();
        }
       
    }
}

webutil.defineElement('bisweb-modulemanager', ModuleManagerElement);
