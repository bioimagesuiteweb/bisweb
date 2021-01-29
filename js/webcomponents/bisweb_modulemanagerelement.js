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

const webutil = require('bis_webutil');

const biscustom = require('bisweb_custommodule.js');
const bisconfig = require('bisConfigure.js');
const modules = require('moduleindex.js');
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
        const layoutwidgetid = this.getAttribute('bis-layoutwidgetid') || null;
        const algorithmcontrollerid = this.getAttribute('bis-algorithmcontrollerid') || null;
        
        if (layoutwidgetid === null) {
            this.layoutcontroller = null;
        } else {
            this.layoutcontroller = document.querySelector(layoutwidgetid);
        }
        
        if (algorithmcontrollerid===null) {
            let tid=webutil.getuniqueid('collection');
            let aid=webutil.getuniqueid('controller');
            
            let tcont=document.createElement('bisweb-collectionelement');
            tcont.setAttribute('bis-elementtype','transform');
            tcont.setAttribute('bis-layoutwidgetid',layoutwidgetid);
            tcont.setAttribute('id',tid);
            this.layoutcontroller.appendChild(tcont);
            
            this.algorithmController = document.createElement('bisweb-simplealgorithmcontrollerelement');
            this.algorithmController.setAttribute('id',aid);
            this.algorithmController.setAttribute('bis-viewerid',this.getAttribute('bis-viewerid') || '');
            this.algorithmController.setAttribute('bis-viewerid2',this.getAttribute('bis-viewerid2') || '');
            this.algorithmController.setAttribute('bis-transformelementid','#'+tid);
            this.layoutcontroller.appendChild(this.algorithmController);

        } else {
            this.algorithmController = document.querySelector(algorithmcontrollerid);
        }
        this.customs = [];
        this.modules = {};
        this.moduleExtra= {};
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
        this.moduleExtra[name]= {
            'module' : module,
            'moduleoptions' : moduleoptions
        };
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


    transfer(v1,v2,img1,img2) {
        v1=parseInt(v1);
        v2=parseInt(v2);
        img1=parseInt(img1);
        img2=parseInt(img2);

        if (v1=== v2 && img1===img2) {
            return;
        }

        let source=this.viewers[v1];
        let target=this.viewers[v2];

        let sourceimg=null;
        let sourcecolor=0;
        if (img1===0) {
            sourceimg=source.getimage();
        }  else {
            sourceimg=source.getobjectmap();
            if (sourceimg)
                sourcecolor=source.getcolortype();
        }

        if (!sourceimg)
            return;

        if (img2===0) {
            target.setimage(sourceimg);
            return;
        }

        target.setobjectmap(sourceimg,false,sourcecolor);
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

        if (!this.algorithmController) {
            return null;
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
        
        this.initializeElementsInternal(menubar,moduleoptions);
        return this.moduleMenu;
    }

    
    initializeElementsInternal(menubar,moduleoptions) {

        let usesgpl=window.bioimagesuitewasmpack.usesgpl;

        this.createModule('Smooth Image',1, false, modules.getModule('smoothImage'),moduleoptions);
        
        userPreferences.safeGetItem("internal").then( (f) => {
            if (f) {
                webutil.createMenuItem(this.moduleMenu[1],'');
//                this.createModule('Quality Measures',1, false, modules.getModule('qualityMeasures'), moduleoptions);
                this.createModule('Change Header Spacing',1, false, modules.getModule('changeImageSpacing'), moduleoptions);
                this.createModule('Fix Zebra Fish Images',1, false, modules.getModule('preprocessOptical'), moduleoptions);
                this.createModule('Individualize Parcellation',1, false, modules.getModule('individualizedParcellation'), moduleoptions);
//               this.createModule('Bilateral Filter', 1, false, modules.getModule('bilateralFilter'), moduleoptions);
                this.createModule('Patch Reformat Image', 1, false, modules.getModule('patchReformatImage'), moduleoptions);
            }
        });
        this.createModule('Normalize Image',1, false, modules.getModule('normalizeImage'), moduleoptions);
        this.createModule('Threshold Image',1, false, modules.getModule('thresholdImage'), moduleoptions);
        this.createModule('Cluster Threshold',1, false, modules.getModule('clusterThreshold'), moduleoptions);
        this.createModule('Correct Bias Field',1, true, modules.getModule('sliceBiasCorrect'), moduleoptions);
        

        this.createModule('Resample Image',1, false, modules.getModule('resampleImage'), moduleoptions);
        this.createModule('Shift+Scale(+Cast) Image',1, false, modules.getModule('shiftScaleImage'), moduleoptions);
        this.createModule('Reorient Image',1, false, modules.getModule('reorientImage'), moduleoptions);
        this.createModule('Flip Image',1, false, modules.getModule('flipImage'), moduleoptions);
        this.createModule('Permute Image',1, false, modules.getModule('permuteImage'), moduleoptions);
        this.createModule('Crop Image',1, false, modules.getModule('cropImage'), moduleoptions);
        this.createModule('Blank Image',1, false, modules.getModule('blankImage'), moduleoptions);
        this.createModule('Extract Frame',1, true, modules.getModule('extractFrame'), moduleoptions);
        if (bisconfig.usesafni === "ON") 
            this.createModule('AFNI Blur Image',1, false, modules.getModule('afniBlurImage'), moduleoptions);

        userPreferences.safeGetItem("internal").then( (f) => {
            if (f) {
                this.createModule('Circle Blank Image',1, false, modules.getModule('circleBlankImage'), moduleoptions);
            }
        });
        
        let dosep=(this.mode === 'paravision');
        
        this.createModule('Combine Images',1, false, modules.getModule('combineImages'), moduleoptions);
        this.createModule('Process 4D Image',1, dosep, modules.getModule('process4DImage'), moduleoptions);
        this.createModule('Drift Correct 4D Image',1, dosep, modules.getModule('driftCorrectImage'), moduleoptions);
        this.createModule('Temporal Filter 4D Image',1, dosep, modules.getModule('butterworthFilterImage'), moduleoptions);
        this.createModule('Normalize Time Series',1, dosep, modules.getModule('timeseriesnormalizeimage'), moduleoptions);
        
        this.createModule('Create Mask',2, false, modules.getModule('binaryThresholdImage'), moduleoptions);
        this.createModule('Morphology Filter',2, false, modules.getModule('morphologyFilter'), moduleoptions);
        if (usesgpl) {
            this.createModule('Segment Image',2, true, modules.getModule('segmentImage'), moduleoptions);
            this.createModule('Deface Head Image',2, true, modules.getModule('defaceImage'), moduleoptions);
        }


        this.createModule('Regularize Objectmap',2, true, modules.getModule('regularizeObjectmap'), moduleoptions);
        this.createModule('Mask Image', 2, false, modules.getModule('maskImage'), moduleoptions);

        if (this.mode!=='single') {
            this.attachTransformationController(3);
            this.createModule('Reslice Image',3, true, modules.getModule('resliceImage'), moduleoptions);
                
            this.createModule('Manual Registration',3, true, modules.getModule('manualRegistration'), moduleoptions);
            if (usesgpl) {
                this.createModule('Linear Registration',3, false, modules.getModule('linearRegistration'), moduleoptions);
                this.createModule('Non Linear Registration',3, true, modules.getModule('nonlinearRegistration'), moduleoptions);
            }
            this.createModule('Project Image',3, false, modules.getModule('projectImage'), moduleoptions);
            this.createModule('Back-Project Image',3, usesgpl, modules.getModule('backProjectImage'), moduleoptions);
            this.createModule('Jacobian Image',3, false, modules.getModule('jacobianImage'), moduleoptions);
            if (usesgpl) {
                this.createModule('Motion Correction',3, false, modules.getModule('motionCorrection'), moduleoptions);
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

    // -------------------------------------------------------------
    /** Element State stuff */
    
    getElementState() {

        const names=Object.keys(this.modules);
        const modules_out={};
        for (let i=0;i<names.length;i++) {
            let name=names[i];
            if (this.modules[name]) {
                console.log('Looking at',name);
                modules_out[name]=this.modules[name].getElementState();
            }
        }
        const output = {
            'modules' : modules_out,
        };
        if (this.algorithmController.getTransformController())
            output['transformController']=this.algorithmController.getTransformController().getElementState();

        if (this.algorithmController.getMatrixController())
            output['matrixController']=this.algorithmController.getMatrixController().getElementState();

        return output;
    }

    setElementState(dt=null) {

        if (!dt)
            return;
        
        const modules_out=dt['modules'];
        const names=Object.keys(modules_out);
        for (let i=0;i<names.length;i++) {
            const name=names[i];
            const current=this.modules[name] || null;
            if (!current) {
                this.createModuleOnDemandAndShow(name,
                                                 this.moduleExtra[name]['module'],
                                                 this.moduleExtra[name]['moduleoptions']);
            }
            this.modules[name].setElementState(modules_out[name]);
        }

        if (this.algorithmController.getTransformController())
            this.algorithmController.getTransformController().setElementState(dt['transformController'] || null);

        if (this.algorithmController.getMatrixController())
            this.algorithmController.getMatrixController().setElementState(dt['matrixController'] || null);

    }
}

module.exports=ModuleManagerElement;
webutil.defineElement('bisweb-modulemanager', ModuleManagerElement);
