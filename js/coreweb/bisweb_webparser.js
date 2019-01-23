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

/**
 * Parser designed to take a JSON description of a GUI and create a DOM element in a given container. 
 * Expects the following fields in an element:
 *
 * name: Name of the module encapsulated by the DOM element, displayed as the heading of the tab.
 * description: Short description of what the module does.
 * author: Creator of the module.
 * version: Version of module software.
 * inputformat: What kind of input should be given to the module and how. Done on a per-input basis, i.e. inputformat is an array with each 
 * element controling one input. Specified as follows: 
 *  -type: The type of the input. One of either 'image' or 'matrix'.
 *  -name: The name for the input to be displayed to a user. 
 *  -description: A description of the input that should appear when a user hovers over the relevant element.
 *
 * params: Parameters of the module rendered as individual dat.gui elements. Control a single variable in the module.
 * Specified as follows:
 *  -name: Name of the parameter. 
 *  -description: Description of the variable controls within the module.
 *  -priority: Number describing the priority with which elements are to be displayed, 
 *      e.g. an element with priority 1 will be displayed above an element described with priority 2.
 *  -advanced: Whether element should be rendered directly in the parent element or in a box meant for more advanced options.
 *  -gui: What kind of UI element should represent the variable. 
 *      One of slider, check/checkbox, dropdown, text/entrywidget, tab/folder, or radio.
 *  -varname (optional): The name of the variable representing the value in the UI passed to the dictionary returned by CustomModule.getVars().
 *      If no value is supplied then webparser will supply varname using the name of the parameter in lowercase, stripped of spaces.
 *  -default (optional): Default value for the parameter. 
 *  -type (optional): Variable type of parameter, e.g. Number, Boolean, String.
 *  -fields: Options available to select from. Used in dropdowns, 
 *  -lowbound/low: Low value for the field. Used in sliders.
 *  -highbound/high: High value for the field. Used in sliders.
 * @namespace bisWebParser;
 */

const $ = require('jquery');
const webutil = require('bis_webutil');
const dat = require('bisweb_datgui');


// -------------------------------------------------------------------------------------
/** returns name of the controleer key for an element with name and type
 * @alias bisWebParser.getControllerKey
 * @param{string} name - the element name e.g. input or mask
 * @param{string} type - the element type e.g. image or overlay
 * @returns{string} - combination name
 */

let getControllerKey=function(name,type) {
    return `${name}_${type}`;
};

// -------------------------------------------------------------------------------------
/** Create Inputs */
let createInputsGUI=function(gui,description,numViewers,dict) {
    
    // Handle Inputs
    let numgood=0;

    let firstname = 'Inputs';
    description.inputs.forEach((inpt) => {
        if (inpt.guiviewer !== undefined ) {
            if (numgood===0)
                firstname=inpt.name;
            numgood=numgood+1;
        }
    });
    
    
    let inputsName="Inputs";
    if (numgood===1 && numViewers>1)
        inputsName=firstname;
    
    let inputVars = { };
    let inputControllers = { };
    let inputFolder = null;

    if (numgood>0) {

        inputFolder = gui.addFolder(inputsName);
        if (numgood>1)
            inputFolder.open();
        
        description.inputs.forEach((inpt) => {

            if (inpt.guiviewer !== undefined) {
                let myFolder=inputFolder;
                
                if (inpt.guiviewer !== undefined) {
                    
                    if (inpt.type === 'image') {

                        if (numgood>1 && numViewers>1) 
                            myFolder = inputFolder.addFolder(inpt.name);

                        if (numViewers>1) {
                            let key=getControllerKey(inpt.varname,'viewer');
                            inputVars[key]=inpt.guiviewer || 'viewer1';
                            inputControllers[key]=myFolder.add(inputVars,key,[ 'viewer1', 'viewer2' ]).name('Input Viewer');
                        }
                        let key=getControllerKey(inpt.varname,'source');
                        inputVars[key]= inpt.guiviewertype || 'image';
                        if (numViewers>1)
                            inputControllers[key]=myFolder.add(inputVars,key,[ 'image', 'overlay' ]).name('Input Element');
                        else
                            inputControllers[key]=myFolder.add(inputVars,key,[ 'image', 'overlay' ]).name(inpt.name);
                    } else if (inpt.type === "transformation" || inpt.type==='transform') {
                        let key=inpt.varname;
                        inputVars[key]= inpt.guiviewer || 'identity';
                        inputControllers[key]=myFolder.add(inputVars,key,[ 'identity', 'current' ]).name(inpt.name);
                    }
                } 
            }
        });
    }

    dict['inputVars']=inputVars;
    dict['inputControllers']=inputControllers;
    dict['inputFolder']= inputFolder;
};

/** Create Inputs */
let createOutputsGUI=function(gui,description,numViewers,dict) {

    // Handle Outputs
    let numgood=0;
    
    description.outputs.forEach((opt) => {
        if (opt.guiviewer !== undefined)
            numgood=numgood+1;
    });
   
    let outputVars = { };
    let outputFolder=null;
    
    if (numgood>0) {
        let tmpOutputFolder=gui;
        if (numgood>1 || numViewers<2) {
            tmpOutputFolder = gui.addFolder('Outputs');
            outputFolder=tmpOutputFolder;
        }
        
        description.outputs.forEach((opt) => {
            
            if (opt.guiviewer !== undefined) {
                let myFolder=null;

                if (numViewers>1) {
                    myFolder = tmpOutputFolder.addFolder(opt.name);
                    if (outputFolder===null)
                        outputFolder=myFolder;
                } else {
                    myFolder=outputFolder;
                }
                
                if (opt.guiviewer !== undefined) {
                    if (numViewers>1) {
                        let key=getControllerKey(opt.varname,'viewer');
                        outputVars[key]= opt.guiviewer || 'viewer1';
                        myFolder.add(outputVars,key,[ 'viewer1', 'viewer2' ]).name('Output Viewer');
                    }
                    let key=getControllerKey(opt.varname,'source');
                    outputVars[key]=opt.guiviewertype || 'image';
                    if (numViewers>1) 
                        myFolder.add(outputVars,key,[ 'image', 'overlay' ]).name('Output Element');
                    else
                        myFolder.add(outputVars,key,[ 'image', 'overlay' ]).name(opt.name);
                }
            }
        });
        
    }

    dict['outputVars']=outputVars;
    dict['outputFolder']=outputFolder;
};

/** Create Inputs */
let createParametersGUI=function(gui,description,numViewers,dict) {

    if (description.params.length<1) {
        dict.guiVars={};
        dict.mainGUI=gui;
        dict.advancedParamGUI=null;
        dict.controllers = {};
        return;
    }
        

    let paramGUI = gui.addFolder('Parameters');
    let advancedParamGUI=gui.addFolder('Advanced');
    let guiVars = initializeDefaultParams(description);
    
    paramGUI.open();

    dict.controllers=createParametersGUIInternal(paramGUI,advancedParamGUI,description,guiVars,dict);
    dict.guiVars=guiVars;
    dict.mainGUI=gui;
    dict.paramGUI=paramGUI;
    dict.advancedGUI=advancedParamGUI;
};

/** Create Inputs */
let createParametersGUIInternal=function(paramGUI,advancedParamGUI,description,guiVars,dict) {

    
    //sort so that elements are added in priority order
    description.params = description.params.sort((a, b) => {
        return (a.priority - b.priority);
    });
    
    //create dictionary of parameters linked to dat.gui then create the HTML Elements
  
    
    
    //parse parameters out of the JSON and put them in the frame
    // store controllers in controller_list for later use
    const controller_list = { };

    paramGUI.open();
    
    let dopass=function(pass) {
        
        description.params.forEach( (param) => {
            let adv=true;
            if (param.advanced===false)
                adv=false;
            if (pass===0 && adv===false) 
                controller_list[param.varname]= parseParam(paramGUI, param, guiVars);
            else if (pass===1 && adv===true)
                controller_list[param.varname]= parseParam(advancedParamGUI, param, guiVars);
        });
    };
        
    for (let pass=0;pass<=1;pass++) {
        dopass(pass);
    }
    
    /*if (description.autoupdate===false)
        dict.inputVars['autoupdate']= false;
    else*/
    dict.inputVars['autoupdate']= true;
    //dict.inputControllers['autoupdate']=advancedParamGUI.add(dict.inputVars, 'autoupdate').name("Auto Update");
    return controller_list;

    
};


/**
   recreate GUI if module has dramatically changed 
 * Uses dat.gui to generate the menu items.
 * @alias bisWebParser.parseDescriptionAndCreateGUI
 * @param {JQueryElement} frame - JQuery Element for dat.gui
 * @param {JQueryElement} buttonFrame - JQuery Element for buttons
 * @param {Object} description - JSON description of how elements should be displayed
 * @param {Number} numViewers - how many image viewers (1 or 2)
 * @returns A dictionary containing information about the added element.
*/
let recreateParameterGUI = function(dict, description) {

    // Empty the folders and redo them;

    let guiVars=dict.guiVars;
    let paramGUI=dict.paramGUI;
    let advancedParamGUI=dict.advancedGUI;

    let folders=[ paramGUI,advancedParamGUI];

    for (let folder=0;folder<=1;folder++) {
        
        let f=folders[folder];
        let l=f.__controllers.length-1;
        for (let c=l;c>=0;c=c-1) {
            let elem=f.__controllers[c];
            if (elem !==null) {
                try {
                    f.remove(elem);
                } catch(e) {
                    // Left over mess as contollers.remove does not always do the right thing.
                    //
                }
            }
        }
        f.__controllers=[ ];
    }


    dict.controllers=createParametersGUIInternal(paramGUI,advancedParamGUI,description,guiVars,dict);
    return dict;
};

/** 
 * Takes a description of an HTML element and a point of entry and creates the element. 
 * Uses dat.gui to generate the menu items.
 * @alias bisWebParser.parseDescriptionAndCreateGUI
 * @param {JQueryElement} frame - JQuery Element for dat.gui
 * @param {JQueryElement} buttonFrame - JQuery Element for buttons
 * @param {Object} description - JSON description of how elements should be displayed
 * @param {Number} numViewers - how many image viewers (1 or 2)
 * @returns A dictionary containing information about the added element.
 */
let parseDescriptionAndCreateGUI = function(frame, buttonFrame,description, numViewers) {

    let gui = new dat.GUI( { autoPlace: false } );
    webutil.removeallchildren(frame);

    let dict= { };
    createInputsGUI(gui,description,numViewers,dict);
    createOutputsGUI(gui,description,numViewers,dict);
    createParametersGUI(gui,description,numViewers,dict);

    if (description.params.length<1) {
        dict.inputFolder.open();
        dict.outputFolder.open();
    }
    
    // Finalize dat.gui 
    webutil.removedatclose(gui);
    $(gui.domElement).css({ "margin-left" : "0px",
                            "margin-top" : "0px",
                            "margin-bottom" : "2px",
                          });
    frame.append(gui.domElement);


    // Now Buttons, buttons, buttons
    let runButtonName = description.buttonName || 'Run';
    dict.runbutton = webutil.createbutton({
        'name': runButtonName,
        'type': 'success',
        'parent' :  buttonFrame,
        'css' : { 'margin-right' : '5px' },
    });
    dict.runbutton[0].setAttribute('data-toggle', 'tooltip');
    dict.runbutton[0].setAttribute('title', 'Execute the algorithm');
    
    dict.undobutton = webutil.createbutton({
        'name': 'Undo',
        'type': 'warning',
        'parent' :  buttonFrame,
    });
    dict.undobutton[0].setAttribute('data-toggle', 'tooltip');
    dict.undobutton[0].setAttribute('title', 'Undo last operation');
    
    /*    dict.redobutton = webutil.createbutton({
        'name': 'Redo',
        'type': 'info',
        'parent' :  buttonFrame,
    });
    dict.redobutton[0].setAttribute('data-toggle', 'tooltip');
    dict.redobutton[0].setAttribute('title', 'Redo last operation');*/
    if (description.params.length>0) 
        dict.dropmenu=webutil.createDropdownMenu('More',buttonFrame);
    else
        dict.dropmenu=null;

    
    return dict;
};

/** 
 * Creates a single GUI element given a description of an element and a link to a variable (that the GUI tracks). 
 * Uses dat.gui to generate the menu items.
 * @alias bisWebParser.parseParam
 * @param {dat.GUI} gui - dat.GUI that gets embedded in the main frame.
 * @param {Object} param - JSON description of a single parameter.
 * @param {Object} guiParams - Dictionary of elements created and tracked by by bisweb_custommodule. 
 * @returns A dat.gui reference to the added element
 */
let parseParam = function(gui, param, guiParams) {
    let controller = {}, base = gui;

    //add a UI element appropriate to the type specified in param
    //names of parameters are taken from param.name (specified by 'name' in call to base.add)
    switch(param.gui) {
    case 'slider': {
        
        let step=param.step;
        let low=(param.lowbound || param.low);
        let high=(param.high || param.highbound);
        if (low===undefined)
            low=null;
        if (high===undefined)
            high=null;
        if (step===undefined)
            step=null;

        if (low!==null && high!==null && step!==null) {

            if (high<low) {
                let tmp=low;
                low=high;
                high=tmp;
            } else if (high===low) {
                high=low+1.0;
            }
        }
        
        if (param.type === "int" && step!==null) {
            step = Math.round(step);
            if (step<1)
                step=1;
        }

        if (param.type === "int" && step===null) {
            step=1;
        }
        

        if (low!==null && high!==null && step!==null) {
            controller = base.add(guiParams, param.varname,low,high).name(param.name).step(step);
        } else if (low!==null && high!==null) {
            controller = base.add(guiParams, param.varname,low,high).name(param.name);
        } else {
            if (step!==null)
                controller = base.add(guiParams, param.varname).name(param.name).step(step);
            else
                controller = base.add(guiParams, param.varname).name(param.name);
            if (low!==null)
                controller.min(low);
            if (high!==null)
                controller.max(high);
        }
        break;
    }
    case 'check':
    case 'checkbox': 
        controller = base.add(guiParams, param.varname).name(param.name);
        break;
    case 'dropdown':
        controller = base.add(guiParams, param.varname, param['fields']).name(param.name);
        break;
    case 'text':
    case 'entrywidget':
        controller = base.add(guiParams, param.varname).name(param.name);
        break;
    case 'tab':
    case 'folder': 
        controller = base.addFolder(param.name);
        break;
    default:
        controller = base.add(guiParams, param.varname).name(param.name);
        break;
    }

    
    //set tooltip
    controller.domElement.setAttribute("data-toggle", "tooltip");
    controller.domElement.setAttribute("title", (param.description || ""));

    return controller;
};

/**
 * Creates dictionary of parameters to link to dat.gui separate from the JSON description. 
 * @alias bisWebParser.initializeDefaultParams
 * @param {Object} description JSON description of the element used by webparser
 */
let initializeDefaultParams = function(description) {
    let vars = {};
    description.params.forEach( (item) => {
        if (!item.varname) {
            console.log('cannot parse item without specified varname -- have you named each component?');
        } else {
            let name = item.varname;
            if (item.default !== undefined) {
                vars[name] = item.default;
            } else if (item.type) {
                switch (item.type) {
                case "bool":
                case "boolean": vars[name] = false; break;
                case "string": vars[name] = ''; break;
                case "float": vars[name] = 1.0; break;
                case "int":
                case "integer": vars[name] = 0; break;
                default: vars[name] = undefined;
                    console.log('assigning default value to item with unrecognized type');
                }
            } else if (item.gui) {
                switch (item.gui) {
                case 'slider': vars[name] = 0; break;
                case 'check':
                case 'checkbox': vars[name] = false; break;
                case 'dropdown': vars[name] = ''; break;
                case 'text':
                case 'entrywidget': vars[name] = ''; break;
                default: console.log('Not adding default to complex/ambiguous gui element');
                }
            } else {
                console.log('could not assign value to untyped item with no default specified');
                vars[name] = undefined;
            }
        }
    });

    return vars;
};



module.exports = {
    parseDescriptionAndCreateGUI : parseDescriptionAndCreateGUI,
    recreateParameterGUI :     recreateParameterGUI,
    getControllerKey :          getControllerKey 
};
