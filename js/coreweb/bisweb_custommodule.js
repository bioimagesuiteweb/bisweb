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

const parser = require('bisweb_webparser.js');
const webutil = require('bis_webutil.js');
const webfileutil = require('bis_webfileutil');
const BiswebImage = require('bisweb_image.js');
const $ = require('jquery');
const bootbox = require('bootbox');
const bisgenericio=require("bis_genericio");
const BisWebDialogElement = require('bisweb_dialogelement.js');


/**
 * @namespace bisWebCustomModule
 */
let ModuleList={};

/**
 * Creates a custom module and adds it to the frame as a child of parent. 
 *
 * If baseframe is null then this is created as a dialog and that is the end
 * If baseframe is not null and opts.dockable is false then just stick this in the dock area
 *
 * If baseframe is not null and opts.dockable is true then create multifunctional dialog that sits in the dock. 
 *    In this case baseframe is realy the layoutcontroller (i.e. it has layoutcontroller.createToolWidget)
 * 
 *
 *

 * @alias bisWebCustomModule.createCustom
 * @param {Node} parent - DOM Node to append the custom module frame to
 * @param {bisweb_algorithm} algorithmcontroller-  Algorithm controller associated with the viewers on the page
 * @param {Object} mod - Object containing a module that specifies how it should be displayed and run.
 * @param {object} opts - the options object 
 * @param {Number} opts.numViewers - Number of Image Viewers attached
 * @param {String} opts.name - Name of the dialog / panel (if set)

 * @param {Boolean} opts.dockable - If true and baseframe is not null allow the widget to dock!
 * @param {Boolean} opts.forcedock - If true and baseframe is not null force the widget to dock!
 * @param {Boolean} opts.showfirsttime - If true and docked, whether to show first time it is created
 */

class CustomModule {

    constructor(baseframe, mod, algocontroller, opts = {}) {

        // Check Input Params
        if (opts.numViewers !== 0)
            opts.numViewers = opts.numViewers || 1;

        if (opts.showfirsttime!==false)
            opts.showfirsttime=true;
        
        // Initialize
        this.module = mod;
        this.algocontroller = algocontroller;
        this.moduleOptions = opts;
        this.description = this.module.getDescription();

        // Docking Options
        this.dockWidget = null;
        this.dockable = opts.dockable || false;
        if (this.dockable)
            this.forcedock = opts.forcedock || false;
        else
            this.forcedock=false;

        this.docked = false;
        this.layoutcontroller=null;

        // Parameters
        this.dirtyInputs = true;

        //dictionary of parameters linked to dat.gui for parameters
        this.guiVars = undefined;
        //dictionary of parameters linked to dat.gui for inputs
        this.inputVars = {};
        //dictionary of parameters linked to dat.gui for outputs
        this.outputVars = {};

        // Controller Lists to update or attach callabacks for params, and inputs
        this.parameterControllers = null;
        this.inputControllers = {};

        this.name = opts.name || this.description.dialogname || this.description.name;

        const self=this;

        // Three states

        if (baseframe !== null && this.dockable===false) {
            baseframe=$(baseframe);
            this.basewidget = webutil.creatediv({ parent: baseframe });
            this.dialog=null;
            this.footer=this.basewidget;
            let placeholder = webutil.creatediv({ parent: this.basewidget });
            placeholder[0].innerHTML = `this element ${this.name} will load once data is available`;
        } else {
            this.dialog=new BisWebDialogElement();
            this.dialog.create(this.name,300,-500,100,100,500);
            this.dialog.removeCloseButton();
            this.dialog.setCloseCallback(function() { self.hideDialog(); });

            this.basewidget = this.dialog.widget;
            this.footer= this.dialog.footer;
            this.basewidget.css({ "background-color" : "#333333" });
            if (baseframe!==null) {
                this.dialog.makeDockable(baseframe,false);
            } else {
                console.log('baseframe is null');
            }
        }
        ModuleList[this.dialog]=this;
        
        this.threadmanager = $("bisweb-webworkercontroller")[0] || null;
    }

    /** Returns the current dialog object
     * @returns {JQueryElement} - the current dialog
     */
    getDialog() {
        return this.dialog;
    }

    /** shows the current dialog */
    showDialog() {

        if (!this.dialog) {
            console.log('No dialog');
            return;
        }

        this.dirtyInputs = true;
        this.createOrUpdateGUI();
        
        // ---- Docked Stuff ---------------------------------
        if (this.docked === true) {
            console.log('Show docked module');
            return this.dialog.showDockedDialog();
        }

        if (this.forcedock === true) {
            if (this.dialog.dockDialog(this.moduleOptions.showfirsttime))
                return;
        }

        // ------ From Here dialog related ------------------
        this.dialog.show();
    }
    
    /** hides the current dialog */
    hideDialog() {

        this.dialog.hide();
    }
    
    /** returns the current module description 
     * @returns {Dictionary} - the current module description with low/high ranges updated
     */
    getDescription() {
        return this.description;
    }

    /**
     * Retrieves copies of the current value of the variables from params. Variables are referenced through params to avoid referencing issues or deep copying.
     * @returns {Dictionary} -- key/value dictionary of parameters
     */
    getVars() {
        return this.guiVars;
    }

    /** Returns the viewer name 'viewer1' or 'viewer2' for the current object based on the GUI setting
     * @returns{String} - the viewer name
     */
    getViewerFromName(vars, inpname) {
        let contkey = parser.getControllerKey(inpname, 'viewer');
        let viewer = 'viewer1';
        try {
            if (vars[contkey].indexOf("2") >= 0)
                viewer = 'viewer2';
        } catch (e) {
            //
        }
        return viewer;
    }

    /** Returns the viewer image type ('image' or 'overlay') based on the GUI setting
     * @returns{String} - the image type name
     */
    getTypeFromName(vars, inpname) {
        
        let contkey = parser.getControllerKey(inpname, 'source');
        let source = 'image';
        if (vars[contkey] === "overlay")
            source = 'overlay';
        return source;
    }
    
    /** Performs Undo operation */
    handleUndo() { this.algocontroller.undoImage(true);  }

    /** Performs Redo operation */
    handleRedo() { this.algocontroller.undoImage(false); }


    /**
     * This returns a list of current input objects to set to a module prior to execution
     * if forceupdate is false then if the module input is currently not null it is left alone
     */
    getCurrentInputObjects(forceupdate = true) {

        this.description = this.module.getDescription();
        let inputs = {};

        this.description.inputs.forEach((elem) => {
            let varname = elem.varname;
            let viewer = this.getViewerFromName(this.inputVars, varname);
            let itype = this.getTypeFromName(this.inputVars, varname);
            let ok = false;

            let obj = this.algocontroller.getImage(viewer, itype);
            if (elem.type === 'image') {

                let input_object = this.module.inputs[varname] || null;

                if (forceupdate || input_object === null) {
                    if (obj !== null) {
                        if (obj.getImageData() !== null) {
                            let l = obj.getImageData().length;
                            if (l > 2) {
                                ok = true;
                            }
                        }
                    }
                } else if (input_object !== null) {
                    // Xenios add on to make auto update work.
                    ok = true;
                    obj = input_object;
                }
            } else if (elem.type === 'transformation' || elem.type === 'transform') {
                let name = this.inputVars[elem.varname];
                obj = this.algocontroller.getTransform(name);
                ok = true;
            }

            if (ok) 
                inputs[varname] = obj;
        });
        return inputs;
    }

    /**
     * This updates the module GUI given the current set of Input Objects
     */
    updateModuleGUIFromInputObjects() {
        
        let inputelements = this.getCurrentInputObjects();
        this.description = this.module.updateOnChangedInput(inputelements, this.parameterControllers, this.guiVars);

        if (this.module.mouseobserver) {
            // get the current position in the viewer
            let elem=this.description.inputs[0];
            let varname = elem.varname;
            let viewer = this.getViewerFromName(this.inputVars, varname);
            let coords=this.algocontroller.getViewerCrossHairs(viewer);
            this.updateCrossHairs(coords);
        }
                
     
    }

    /**
     * This updates the module GUI given the current cross hairs 
     * @param {array} coords - the current viewer voxel cross hair locations
     */
    updateCrossHairs(coords) {
        this.module.setViewerCoordinates(this.parameterControllers, this.guiVars,coords);
    }
    
    /**
     * Reset Parameters of the module to default values
     */
    resetParameters() {

        this.description.params.forEach((param) => {
            let v = param.default;
            this.guiVars[param.varname] = v;
            this.parameterControllers[param.varname].updateDisplay();
        });
    }

    /** load parameters from file
     * @param{FileObject} fobj - the file object to load from
     */
    loadParameters(fobj) {
        this.module.loadParameters(fobj).then( (obj) => {
            this.description.params.forEach((param) => {
                let varname=param.varname;
                if (obj[varname]) {
                    this.guiVars[varname] = obj[varname];
                    this.parameterControllers[varname].updateDisplay();
                }
            });
            this.updateModuleGUIFromInputObjects();
        }).catch( (e) => {
            let fname=bisgenericio.getFixedLoadFileName(fobj);
            webutil.createAlert(`Failed to load parameters from ${fname} (${e})`,true);
        });
    }


    getInitialFilename() {
        let date = new Date();
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        month = (month < 10 ? "0" : "") + month;
        let day  = date.getDate();
        day = (day < 10 ? "0" : "") + day;
        let extra=year+"_"+month+"_"+day;
        return this.module.name+'_'+extra+'.param';
    }
    
    /** save parameters to a file
     * @param{FileObject} fobj - the file object to save to (this might be a mouse event)
     */
    saveParameters(fobj=null) {

        fobj=bisgenericio.getFixedSaveFileName(fobj,"None");
        if (fobj === "None") {
            fobj=this.getInitialFilename();
        }
        this.module.saveParameters(fobj,this.guiVars);
    }

    
    /**
     * If needed creates the GUI. It then updates this with any new inputs
     */
    createOrUpdateGUI() {
        //if the module has modifications to its parameters add them, otherwise ignore them

        const self = this;

        if (this.parameterControllers === null) {
            // We need to create this thing

            this.description = this.module.getDescription();
            let generatedContent = parser.parseDescriptionAndCreateGUI(this.basewidget,
                                                                       this.footer,
                                                                       this.description,
                                                                       this.moduleOptions['numViewers']);
            
            // Gui Event Handling for Input stuff
            this.inputVars = generatedContent.inputVars;
            this.outputVars = generatedContent.outputVars;
            this.inputControllers = generatedContent.inputControllers;

            if (this.moduleOptions['numViewers']<1) {
                generatedContent.inputFolder.domElement.remove();
                generatedContent.outputFolder.domElement.remove();
            } else {
                Object.keys(this.inputVars).forEach((key) => {
                    if (key !== "autoupdate")
                        this.inputControllers[key].onChange(() => {
                            self.updateModuleGUIFromInputObjects();
                        });
                });
            }
            this.guiVars = generatedContent.guiVars;
            this.parameterControllers = generatedContent.controllers;
            
            let frame = $(this.basewidget);
            let oldcolor = frame.css('backgroundColor');
            
            let enableUI = ((status = false) => {

                webutil.enablebutton(generatedContent.runbutton, status);
                webutil.enablebutton(generatedContent.undobutton, status);
                webutil.enablebutton(generatedContent.redobutton, status);
                
                if (status)
                    frame.css({ 'background-color': oldcolor });
                else
                    frame.css({ 'background-color': webutil.getactivecolor() });
            });


            generatedContent.runbutton[0].addEventListener("click", (e) => {
                e.preventDefault();
                enableUI(false);
                webutil.createAlert('Invoking Module '+self.module.name,'progress',10,100000);
                setTimeout(() => {
                    this.executeModule().then(() => {
                        $('.alert-success').remove();
                        enableUI(true);
                    }).catch((e) => {
                        if (e.stack)
                            console.log(e.stack);
                        enableUI(true);
                        bootbox.alert(e);  
                    });
                }, 100);
            });

            generatedContent.undobutton[0].addEventListener("click", (e) => {
                e.preventDefault();
                this.handleUndo();
            });

            generatedContent.redobutton[0].addEventListener("click", (e) => {
                e.preventDefault();
                this.handleRedo();
            });
            
            let dropmenu=generatedContent.dropmenu;
            if (dropmenu!==null) {
                webutil.createDropdownItem(dropmenu,'Update Inputs', function() {
                    self.updateModuleGUIFromInputObjects();
                });
                
                webutil.createDropdownItem(dropmenu,'Reset Parameters',function() {
                    self.resetParameters();
                });
                
                
                webfileutil.createDropdownFileItem(
                    dropmenu,'Load Parameters', function(f) {
                        self.loadParameters(f);
                    },
                    { filters: [ { name: 'Parameter Files', extensions: ['param'] } ],
                      title : 'Load Parameters',
                      save : false,
                      suffix : "param"
                    }
                );
                
                
                webfileutil.createDropdownFileItem(dropmenu,'Save Parameters',
                                                   function(f) {
                                                       self.saveParameters(f);
                                                   },
                                                   {
                                                       title : 'Save Parameters',
                                                       save : true,
                                                       filters : [{ name: 'Parameter Files', extensions: ['param']}],
                                                       suffix: "param",
                                                       initialCallback : () => { return self.getInitialFilename() ;}
                                                   }
                                                  );


                if (this.description.url) {
                    webutil.createDropdownItem(
                        dropmenu,'Help', function() {
                            document.createElement('bisweb-helpvideoelement').displayVideo(this.description.url);
                        });
                }
            }
        }
        
        this.updateModuleGUIFromInputObjects();
    }

    /** Called when the module is Done
     * @param{object}  inputParams - a dictionary of the actual parameters used
     * @param{object} outputs - a dictionary of the module outputs
     */
    moduleDone(inputParams, outputs) {

        this.description.outputs.forEach((opt) => {
            let outobj = outputs[opt.varname];

            if (outobj) {
                //                console.log('Result=', opt.varname, '=', outobj.getDescription(), outobj.getFilename());
                let outputCreationInfo = 'Generated by ' + this.module.getDescription().name + ' on ' + webutil.createTimestamp();

                if ((outobj instanceof BiswebImage) && (opt.guiviewer !== undefined)) {
                    let viewername = this.getViewerFromName(this.outputVars, opt.varname);
                    let itype = this.getTypeFromName(this.outputVars, opt.varname);
                    let ctype = opt.colortype || 'Auto';

                    //TODO: Incorporate viewer info into custom module
                    //let viewerInfo = this.algocontroller.getViewersInfo(viewername);

                    this.algocontroller.handleUpdate(outobj, {
                        'viewername': viewername,
                        'viewersource': itype,
                        'colortype': ctype,
                        'savename': outobj.getFilename(),
                        'saveinput': false,
                        'inputinfo': {
                            'description': outputCreationInfo
                        }
                    });

                } else if (outobj.getObjectType() === "transform") {
                    this.algocontroller.handleUpdate(outobj, {
                        'savename': outobj.getFilename(),
                        'saveinput': true,
                        'inputinfo': {
                            'description': outputCreationInfo
                        }
                    });
                }
            }
        });



        this.module.cleanupMemory(this.inputVars['autoupdate']);
    }

    /**
    * MAIN Function called when "execute" button is pressed in the module
     * Calls the function passed to customModule with the current arguments in the GUI and images in the viewer. 
     * 
     * executeModule will append the current image in the viewer to the dictionary. 
     * It is to the module's discretion what it does with this input, but most of the time it will use it as its standard input if it does not have it from somewhere else, e.g. from its module buttons.
     */
    executeModule() {

        let inputParams = this.getVars();

        let force = this.inputVars['autoupdate'];
        if (this.dirtyInputs)
            force = true;
        this.dirtyInputs = false;
        let inputObjects = this.getCurrentInputObjects(force);

        return new Promise((resolve, reject) => {
            this.module.execute(inputObjects, inputParams).then(() => {
                let outputs = {};
                this.description.outputs.forEach((opt) => {
                    let obj = this.module.getOutputObject(opt.varname);
                    outputs[opt.varname] = obj ? obj : undefined;
                });
                this.moduleDone(inputParams, outputs);
                resolve();
            }).catch((e) => { reject(e); });
        });
    }



    /**
    * MAIN Function called when "execute" button is pressed in the module (if using web workers)
     * Calls the function passed to customModule with the current arguments in the GUI and images in the viewer. 
     * 
     * executeModule will append the current image in the viewer to the dictionary. 
     * It is to the module's discretion what it does with this input, but most of the time it will use it as its standard input if it does not have it from somewhere else, e.g. from its module buttons.
     */
    executeModuleInWorker() {

        if (this.module.useworker === false || this.threadmanager === null) {
            return this.executeModule();
        }

        console.log('wwww Running in Web Worker Module', this.threadmanager);
        let inputParams = this.getVars();

        let force = this.inputVars['autoupdate'];
        if (this.dirtyInputs)
            force = true;
        this.dirtyInputs = false;
        let inputObjects = this.getCurrentInputObjects(force);
        const self = this;

        return new Promise((resolve, reject) => {

            this.threadmanager.executeModule(self.module.name, inputObjects, inputParams).then((outputs) => {
                this.moduleDone(inputParams, outputs);
                resolve();
            }).catch((e) => {
                console.log(e, e.stack);
                reject(e);
            });
        });
    }
}

/**
 * Creates a custom module and adds it to the frame as a child of parent. 
 * Custom Module Class. 
 * @alias bisWebCustomModule.createCustom
 * @param {Node} parent - DOM Node to append the custom module frame to
 * @param {bisweb_algorithm} algorithmcontroller-  Algorithm controller associated with the viewers on the page
 * @param {Object} mod - Object containing a module that specifies how it should be displayed and run.
 * @param {object} opts - the options object 
 * @param {Boolean} opts.numViewers - Number of Image Viewers attached
 */
let createCustom = function (parent, algorithmcontroller, mod, opts = {}) {
    return new CustomModule(parent, mod, algorithmcontroller, opts);
};

/** Update open Modules */
let updateModules = function() {

    let dialogs=BisWebDialogElement.getOpenDialogs();
    for (let i=0;i<dialogs.length;i++) {
        if (dialogs[i]) {
            if (ModuleList[dialogs[i]])
                ModuleList[dialogs[i]].createOrUpdateGUI();
        }
    }
};


module.exports = {
    createCustom: createCustom,
    updateModules : updateModules
};


