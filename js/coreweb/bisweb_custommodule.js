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
const BisWebPanel = require('bisweb_panel.js');


/**
 * @namespace bisWebCustomModule
 */
let ModuleList={};

/**
 * Creates a custom module and adds it to the frame as a child of parent. 
 *
 *

 * @alias bisWebCustomModule.createCustom
 * @param {LayoutController} layoutcontroller - Master Controller
 * @param {Object} mod - Object containing a module that specifies how it should be displayed and run.
 * @param {object} opts - the options object 
 * @param {Number} opts.numViewers - Number of Image Viewers attached
 * @param {String} opts.name - Name of the panel / panel (if set)
 * @param {Boolean} opts.dual - If true allow dock and side bar (default false)
 */

class CustomModule {

    constructor(layoutcontroller, mod, algocontroller, opts = {}) {

        // Check Input Params
        if (opts.numViewers !== 0)
            opts.numViewers = opts.numViewers || 1;

        if (opts.showfirsttime!==false)
            opts.showfirsttime=true;
        
        // Initialize
        this.module = mod;
        this.algocontroller = algocontroller;
        this.moduleOptions = opts;


        // Docking Options
        this.dockWidget = null;
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

        let description = this.module.getDescription();
        this.name = opts.name || description.dialogname || description.name;
        this.dual = opts.dual || false;

        
        // Three states

        this.panel=new BisWebPanel(layoutcontroller,{
            name : this.name,
            width : 250,
            hasfooter : false,
            dual : this.dual,
        });

        this.basewidget=webutil.creatediv({  parent: this.panel.getWidget(),
                                             css : {
                                                 'padding-top' : '10px',
                                                 'padding-left' : '2px'
                                             }
                                          });
        this.footer=webutil.creatediv({  parent: this.panel.getWidget(),
                                         css : {
                                             'padding-top' : '20px',
                                             'padding-left' : '2px'
                                         }
                                      });
        ModuleList[this.name]=this;
        this.threadmanager = $("bisweb-webworkercontroller")[0] || null;
    }

    /** Returns the current panel object
     * @returns {JQueryElement} - the current panel
     */
    getPanel() {
        return this.panel;
    }

    /** shows the current panel */
    show() {

        if (!this.panel) {
            console.log('No panel');
            return;
        }

        this.dirtyInputs = true;
        this.createOrUpdateGUI();
        this.panel.show();
    }
    
    /** returns the current module description 
     * @returns {Dictionary} - the current module description with low/high ranges updated
     */
    getDescription() {
        return this.module.getDescription();
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

        let description = this.module.getDescription();
        let inputs = {};

        description.inputs.forEach((elem) => {
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
        let description = this.module.updateOnChangedInput(inputelements, this.guiVars,this.parameterControllers);

        if (this.module.recreateGUI) {

            let dict=parser.recreateParameterGUI(this.generatedContent,description);
            this.parameterControllers = dict.controllers;
            this.module.recreateGUI=false;
            // recreateGUI
        }
            
        

        if (this.module.mouseobserver) {
            // get the current position in the viewer
            let description = this.module.getDescription();
            let elem=description.inputs[0];
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
        let description = this.module.getDescription();
        description.params.forEach((param) => {
            let v = param.default;
            this.guiVars[param.varname] = v;
            this.parameterControllers[param.varname].updateDisplay();
        });
    }

    /** load parameters from file
     * @param{FileObject} fobj - the file object to load from
     */
    loadParameters(fobj) {
        let description = this.module.getDescription();
        this.module.loadParameters(fobj).then( (obj) => {
            description.params.forEach((param) => {
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

            let description = this.module.getDescription();
            let generatedContent = parser.parseDescriptionAndCreateGUI(this.basewidget,
                                                                       this.footer,
                                                                       description,
                                                                       this.moduleOptions['numViewers']);
            
            // Gui Event Handling for Input stuff
            this.generatedContent=generatedContent;
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
            
            
            let enableUI = ((status = false) => {

                webutil.enablebutton(generatedContent.runbutton, status);
                webutil.enablebutton(generatedContent.undobutton, status);
                //                webutil.enablebutton(generatedContent.redobutton, status);
            });


            generatedContent.runbutton[0].addEventListener("click", (e) => {
                e.preventDefault();
                enableUI(false);
                this.panel.makeActive(true);
                webutil.createAlert('Invoking Module '+self.module.name,'progress',10,100000);
                setTimeout(() => {
                    this.executeModule().then(() => {
                        this.panel.makeActive(false);
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

            /*            generatedContent.redobutton[0].addEventListener("click", (e) => {
                e.preventDefault();
                this.handleRedo();
            });*/
            
            let dropmenu=generatedContent.dropmenu;
            if (dropmenu!==null) {
                /*webutil.createDropdownItem(dropmenu,'Update Inputs', function() {
                    self.updateModuleGUIFromInputObjects();
                });*/
                
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


                if (description.url) {
                    webutil.createDropdownItem(
                        dropmenu,'Help', function() {
                            document.createElement('bisweb-helpvideoelement').displayVideo(description.url);
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

        webutil.createAlert(`Module ${this.module.getDescription().name} done`);

        let count=0;
        let description=this.module.getDescription();
        description.outputs.forEach((opt) => {
            let outobj = outputs[opt.varname];

            if (outobj) {
                //console.log('Result=', opt.varname, '=', outobj.getDescription(), outobj.getFilename());
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
                } else if (outobj.getObjectType() === "text") {
                    count=count+1;
                    if (count===1) {
                        // Only show the first text object
                        this.showText(outobj,"Module "+this.module.getDescription().name+' done.');
                    }
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
                let description=this.getDescription();
                let outputs = {};
                description.outputs.forEach((opt) => {
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

    /** show text
     * display text object and present an option to save it
     * @param{BisWebTextObject} - obj
     */
    showText(obj,title="Output Information") {

        let txt=obj.getText();
        if (txt.length<1)
            return;

        // Hide alert messages
        $('.alert-success').remove();
        $('.alert-info').remove();

        
        txt=txt.replace(/\n---\n/g,'<HR>');
        txt=txt.replace(/\n/g,'<BR>').replace(/\t/g,'&nbsp;&nbsp;&nbsp;&nbsp;');
        txt=txt.replace(/\\n/g,'<BR>').replace(/\\t/g,'&nbsp;&nbsp;&nbsp;&nbsp;');

        console.log(obj.getText(),'--->\n',txt);
        
        const output=`<div style="margin-left:5px; margin-right:5px; margin-top:5px; overflow-y: auto; position:relative; color:#fefefe; width:100%; background-color:#000000;">${txt}</div>`;

        
        bootbox.dialog({
            title: title,
            message: output,
                buttons: {
                    ok: {
                        label: "Save To File",
                        className: "btn-success",
                        callback: function () {
                            bisgenericio.write({
                                filename: "log.txt",
                                title: 'Select file to save snapshot in',
                                suffix : "txt" ,
                                filters: [{ name: 'Text Files', extensions: ['txt'] }],
                            }, output, false);
                        }
                    },
                cancel: {
                    label: "Close",
                    className: "btn-danger",
                }
                
                }
        });
        return false;
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

    let panels=BisWebPanel.getActivePanels();
    for (let i=0;i<panels.length;i++) {
        if (panels[i]) {
            let mod=ModuleList[panels[i].options.name];
            if (mod) {
                mod.createOrUpdateGUI();
            }
        }
    }
};


module.exports = {
    createCustom: createCustom,
    updateModules : updateModules
};


