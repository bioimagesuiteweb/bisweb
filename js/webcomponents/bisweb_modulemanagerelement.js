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
const userPreferences = require('bisweb_userpreferences.js');

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
            moduleoptions.name=name;
            this.modules[name] = biscustom.createCustom(this.layoutcontroller,
                                                        this.algorithmController,
                                                        module, moduleoptions);
            this.customs.push(this.modules[name]);
        }
        
        this.modules[name].show();
        return this.modules[name];
    }


    createModule(name, index,dosep , module, moduleoptions = {}) {

        this.modules[name] = null;
        const self=this;
        webutil.createMenuItem(this.moduleMenu[index], name,
                               function () {
                                   self.createModuleOnDemandAndShow(name, module, moduleoptions);
                               });
        if (dosep)
            webutil.createMenuItem(this.moduleMenu[index], '');
    }

    attachTransformationController(index) {
        if (this.algorithmController.getTransformController()) {
            const self=this;
            webutil.createMenuItem(this.moduleMenu[index],'Transformation Manager',
                                   function() {
                                       self.algorithmController.getTransformController().show();
                                   });
            webutil.createMenuItem(this.moduleMenu[index],'');
        }
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

    transferOverlayToImage(v1,v2) {

        let img=this.viewers[v1].getobjectmap();
        if (img) {
            this.viewers[v2].setimage(img);
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

    initializeElements(menubar, viewers = []) {

        return new Promise( (resolve,reject) => {
            
            if (!this.algorithmController) {
                reject('No algorithm controller');
            }
        
            this.viewers = viewers;
            let numviewers = this.viewers.length;
            for (let i = 0; i < numviewers; i++)
                this.viewers[i].addImageChangedObserver(this);

            let moduleoptions = { 'numViewers': numviewers, 'dual' : false };
            if (numviewers>1)
                moduleoptions.dual=true;
            
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
                resolve(this.moduleMenu);
            }).catch( (e) => {
                reject(e+' '+e.stack);
            });
        });
    }

    
    initializeElementsInternal(menubar,moduleoptions) {

        let usesgpl=biswrap.uses_gpl();
        if (usesgpl)
            usesgpl=true;
        else
            usesgpl=false;

        this.createModule('Smooth Image',1, false, modules.smoothImage, moduleoptions);
        userPreferences.safeGetItem("internal").then( (f) => {
            if (f) {
                webutil.createMenuItem(this.moduleMenu[1],'');
                this.createModule('Quality Measures',1, false, modules.qualityMeasures, moduleoptions);
                this.createModule('Change Header Spacing',1, false, modules.changeImageSpacing, moduleoptions);
            }
        });
        this.createModule('Normalize Image',1, false, modules.normalizeImage, moduleoptions);
        this.createModule('Threshold Image',1, false, modules.thresholdImage, moduleoptions);
        this.createModule('Cluster Threshold',1, false, modules.clusterThreshold, moduleoptions);
        this.createModule('Correct Bias Field',1, true, modules.sliceBiasFieldCorrect, moduleoptions);
        

        this.createModule('Resample Image',1, false, modules.resampleImage, moduleoptions);
        this.createModule('Shift+Scale(+Cast) Image',1, false, modules.shiftScaleImage, moduleoptions);
        this.createModule('Reorient Image',1, false, modules.reorientImage, moduleoptions);
        this.createModule('Flip Image',1, false, modules.flipImage, moduleoptions);
        this.createModule('Crop Image',1, false, modules.cropImage, moduleoptions);
        this.createModule('Blank Image',1, false, modules.blankImage, moduleoptions);
        this.createModule('Extract Frame',1, true, modules.extractFrame, moduleoptions);
        
        let dosep=(this.mode === 'paravision');
        
        this.createModule('Combine Images',1, false, modules.combineImages, moduleoptions);
        this.createModule('Process 4D Image',1, dosep, modules.process4DImage, moduleoptions);
        this.createModule('Create Mask',2, false, modules.binaryThresholdImage, moduleoptions);
        this.createModule('Morphology Filter',2, false, modules.morphologyFilter, moduleoptions);
        if (usesgpl) {
            this.createModule('Segment Image',2, true, modules.segmentImage, moduleoptions);
            this.createModule('Deface Head Image',2, true, modules.defaceImage, moduleoptions);
        }
        this.createModule('Regularize Objectmap',2, true, modules.regularizeObjectmap, moduleoptions);
        this.createModule('Mask Image', 2, false, modules.maskImage, moduleoptions);

        if (this.mode!=='single') {
            this.attachTransformationController(3);
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
        } 
        return this.moduleMenu[0];
            
    }

    handleViewerImageChanged() { //viewer, source, colortype) 
        biscustom.updateModules();
    }

    getAlgorithmController() {
        return this.algorithmController;
    }
}

webutil.defineElement('bisweb-modulemanager', ModuleManagerElement);
