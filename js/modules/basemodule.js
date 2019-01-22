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

'use strict';

/**
 * First-tier generic module class meant to encapsulate the functionality common to all command-line. Directly inherited by another abstract class
 * that will specify the IO methods for a module.  
 *
 * @example
 *  ------------    ------------    ------------
 * |    base    |->|   [input]  |->|  [module]  |
 *  ------------    ------------    ------------
 */

const BisWebDataObjectCollection = require('bisweb_dataobjectcollection.js');
const genericio = require('bis_genericio');
const biswrap = require('libbiswasm_wrapper');
const baseutils = require('baseutils');

class BaseModule {
    /**
     * Class representing the base level functionality every module should implement. Not meant to be instantiated directly. 
     * @constructor
     */
    constructor() {
        this.name = 'base';
        this.inputs = {};
        this.outputs = {};
        this.description = null;
        this.useworker=false;
        this.mouseobserver=false;
        this.recreateGUI = false;
    }

    /**
     * Return the JSON description associated with a module. 
     * See bisweb_webparser.js for the complete list of description parameters.
     * @return JSON description of module
     */
    getDescription() {
        if (this.description === null) {
            this.description = this.createDescription();
        }
        return this.description;
    }

    /** Runs the module programmatically 
     * @param {dictionary} inputs -- input objects
     * @param {dictionary} parameters -- input parameters
     * @returns {Promise} 
     */
    execute(inputs, params = {}) {
        
        let fullparams = this.parseValuesAndAddDefaults(params);
        let des = this.getDescription();

        let error = [];
        des.inputs.forEach((param) => {
            let name = param['varname'];
            this.inputs[name] = inputs[name] || null;
            if (this.inputs[name] === null && param.required === true) {
                console.log("No/empty " + param.name + " specified.");
                error.push("No/empty " + param.name + " specified.");
            }
        });

        if (error.length > 0)
            return Promise.reject(error.join("\n"));

        const self=this;
        let name=this.name;

        return new Promise( (resolve,reject) => { 
            self.directInvokeAlgorithm(fullparams).then( (m) => {
                self.storeCommentsInOutputs(baseutils.getExecutableArguments(name), params, baseutils.getSystemInfo(biswrap));
                resolve(m);
            }).catch( (e) => {
                reject(e);
            });
        });
    }


    /**
     * Runs webassembly functionality associated with the module. This method should be overwritten.
     * @param {Object} vals Dictionary containing the parameters parsed from the command line.
     */
    directInvokeAlgorithm(vals) {
        console.log('Called base class directInvokeAlgorithm -- this is most likely not what you wanted!');
        console.log('Invoked with vals', vals);
    }

    /** Returns a clean dictionary of key:value.
     * Logic first use cmd.name if not defined then extra.name else use param.default
     * @param {cmd} -- the parameters provided by commander or the file server
     * @param {extra} -- an extra dictionary most likely from a parameter file containing some parameters 
     * @returns {Dictionary} of parameter names and values */
    parseValuesAndAddDefaults(cmd, extra = {}) {
        let des = this.getDescription();
        let out = {};
        let parsedCmd = {};

        //make case insensitive directory of input parameters
        let cmdKeys = Object.keys(cmd);
        for (let key of cmdKeys) {
            let lowerCasedKey = key.toLowerCase();
            parsedCmd[lowerCasedKey] = cmd[key];
        }
        
        des.params.forEach((param) => {
            let rawName = param.varname;
            let name = rawName.toLowerCase();

            if (parsedCmd[name] === undefined || parsedCmd[name] === null) {
                if (extra[name] === undefined || extra[name] === null) {
                    let defaultv = param['default'];
                    if (defaultv !== undefined)
                        out[rawName] = defaultv;
                } else {
                    out[rawName] = extra[name];
                }
            } else {
                out[rawName] = parsedCmd[name];
            }
        });
        return out;
    }


    /**
     * Update Single GUI Element  on changedInput 
     * @param {object} param - the current parameters
     * @param {object} controller - the data.gui controller for this parameter
     * @param {object} guiVars - the object bound to the dat.gui controller
     * @param {String} name - the parameter varname
     * @param {Number} index - the index of the current parameter
     */
    updateSingleGUIElement(param,controller,guiVars,name) {

        if (param.low===param.high)
            param.high=param.low+0.001;
        
        if (param.step !==undefined)
            controller.min(param.low).max(param.high).step(param.step);
        else
            controller.min(param.low).max(param.high);
        
        if (guiVars[name]<param.low ||
            guiVars[name]>param.high)
            guiVars[name]=param.default;


        controller.onFinishChange(() => {
            console.log('On finish change',name);
            let val=guiVars[name];
            let changed=false;
            if (param.low !== undefined) {
                if (val<param.low) {
                    guiVars[name]=param.low;
                    changed=true;
                }
            }
            if (param.high !== undefined) {
                if (val>param.high) {
                    guiVars[name]=param.high;
                    changed=true;
                }
            }
            if (changed)
                controller.updateDisplay();
        });
       
        controller.updateDisplay();
    }
    
    /**
     * Takes properties from the input and adjusts parameters in the description accordingly, 
     * e.g. set a frame slider to have min 0 and max the number of frames in the image.
     * 
     * NOTE: input is a parameter to parseParamsFromInput for all inheriting classes. It is omitted from the signature here because it would be unused.
     * @param {Object} input - Dictionary of input objects or null if you use existing inputs (commandline)
     * @return Updated module description
     */
    updateOnChangedInput() {
        return this.description;
    }

    /** Compare two arrays and return the max difference or null
     * @param{Array} arr1 -- the first array
     * @param{Array} arr2 -- the second array
     * @param{Number} beginindex - the begin index (or 0 if not specified)
     * @param{Number} endindex - the begin index (or arr1.length-1 if not specified)
     */
    compareArrays(arr1,arr2,beginindex=0,endindex=null) {

        if (!arr1 || !arr2)
            return 1000;
        
        if (endindex===null) {
            endindex=arr1.length-1;
        }
        let maxd=0;
        for (let i=beginindex;i<=endindex;i++) {
            let v=Math.abs(arr1[i]-arr2[i]);
            if (v>maxd)
                maxd=v;
        }
        return maxd;   
    }
    
    /**
     * Gets the viewer coordinates (see morphologyFilter)
     */
    setViewerCoordinates() {
        
    }

    /**
     * Checks an individual parameter against an individual type and provided set of input restrictions.
     * @param {String} param The JSON description of the parameter being tested
     * @param {Any} val The value under test 
     * @return true for acceptable parameters, false otherwise
     */
    typeCheckParam(param, val) {

        param.type = param.type || "string";

        if (param.default === undefined && param.type !== 'string') {
            console.log('Parameter', param.name, 'does not have a default value');
            return false;
        }

        switch (param.type.toLowerCase()) {
        case 'bool':
        case 'boolean': return (['0', '1', true, false, 'true', 'false', 'on', 'off'].indexOf(val)) >= 0;
        case 'float': return (isNaN(parseFloat(val)) === false);
        case 'int':
        case 'integer': return (isNaN(parseFloat(val, 10)) === false);
        case 'string':
        case '': break;
        default: console.log('warning: could not interpret param', val);
        }

        let restrict = param.restrict || param.restrictAnswer || null;
        let lowval = param.lowval || param.low || null;
        let highval = param.highval || param.high || null;

        if (restrict && !restrict.includes(val)) {
            console.log('----\n---- Parameter', param.name, ' val=', val, 'is not in [', restrict.join(" "), "]");
            return false;
        }

        if (lowval && val < lowval) {
            console.log('----\n---- Parameter', param.name, ' val=', val, 'is < bound=', lowval);
            return false;
        }
        if (highval && val > highval) {
            console.log('----\n---- Parameter', param.name, ' val=', val, 'is > bound=', highval);
            return false;
        }
        return true;
    }

    /**
     * Checks the user-provided values of a parameter dictionary against what the description specifies the arguments should be. 
     * Returns true if all parameters conform to provided types.
     * Returns false if not all parameters conform to provided types or if not all expected parameters are included in vars.
     * @param {Object} vals The dictionary of values to a function provided by a user. 
     * @return true for dictionaries containing all conformant values, false otherwise
     */
    typeCheckParams(vals) {
        let desc = this.getDescription(), param;
        for (let i = 0; i < desc.params.length; i++) {
            param = desc.params[i];
            if (vals[param.varname] === null ||
                vals[param.varname] === undefined ||
                !this.typeCheckParam(param, vals[param.varname])
               ) {
                console.log('Error: parameter with name=', param.varname, 'and  value=', vals[param.varname], ' does not match expected.');
                return false;
            }

            let tp = (param.type.toLowerCase());
            if (tp === "bool" || tp === "boolean")
                vals[param.varname] = this.parseBoolean(vals[param.varname]);
        }

        return true;
    }

    /**
     * Small wrapper function to handle boolean input from the command line in the expected way (0 == false, 1 == true, 'true' == true, 'false' == false)
     * @param {String} val
     * @return false for '0' or 'false', true otherwise 
     */
    parseBoolean(val) {
        let c = Boolean(val);
        let out = c;
        if (val === '1' || val === 'true' || val === true)
            out = true;
        else
            out = false;
        return out;
    }

    /** Code to load objects 
     * @param {string} key -- the object key in this.inputs
     * @param {string} filename -- the filename to load from
     * @param {string} objecttype -- one of image,matrix,transformation,...
     * @returns {Promise} with payload { data, filename}
     */
    loadSingleInput(key, filename, objecttype) {

        const self = this;
        return new Promise((resolve, reject) => {
            BisWebDataObjectCollection.loadObject(filename, objecttype).then((obj) => {
                self.inputs[key] = obj;
                resolve();
            }).catch((e) => {
                console.log('oooo Failed to load object=',key,' from',filename);
                reject(e.stack);
            });
        });
    }

    // TODO: Implement logic for naming images intelligently
    getOutputFilename(name) {
        let obj = this.outputs[name];
        if (!obj)
            return 'none.json';

        let inpfilenames= [];
        let des = this.getDescription();

        for (let i=0;i<des.inputs.length;i++) {
            let varname = des.inputs[i].varname;
            if (this.inputs[varname]) {
                let fn=this.inputs[varname].getFilename();
                if (fn.length>1) {
                    let ext = fn.split('.').pop();
                    if (ext==="gz") {
                        fn=fn.substr(0,fn.length-3);
                        ext = fn.split('.').pop();
                    }
                    fn=fn.substr(0,fn.length-(ext.length+1));
                    if (i>0) { 
                        let t=fn.lastIndexOf("/");
                        fn=fn.substr(t+1, fn.length-t);
                    }
                    inpfilenames.push(fn);
                }
            }
        }

        let nm=des.shortname;
        if (!nm)
            nm=this.name;
        nm=nm.toLowerCase();

        let extra="__"+nm;
        let coreout=inpfilenames.join("__")+extra;
        // Clean up the _sm_sm bit
        let twoextra=extra+extra;
        coreout=coreout.replace(twoextra,extra);
        return coreout+obj.getExtension();
    }

    /** Code to save objects 
     * @param {string} key -- the object key in this.outputs
     * @param {string} filename -- the filename to save to
     * @returns {Promise} with comments about success
     */
    saveSingleOutput(key, filename) {
        return this.outputs[key].save(filename);
    }

    /** Sets an input object 
     * @param{Object} obj -- the input object pointer 
     *  @param{string} name -- the name of the object */

    setInputObject(obj, name = 'input') {
        this.inputs[name] = obj;
    }

    /** Gets the output object 
     *  @param{string} name -- the name of the object
     * @param{Object} obj -- the input object pointer */
    getOutputObject(name = 'output') {
        return this.outputs[name] || null;
    }

    /** cleanup memory 
     *  Release pointers to objects */
    cleanupMemory(cleaninputs = true, cleanoutputs = true) {
        let des = this.getDescription();
        if (cleaninputs) {
            des.inputs.forEach((param) => {
                this.inputs[param.name] = null;
            });
        }
        if (cleanoutputs) {
            des.outputs.forEach((param) => {
                this.outputs[param.name] = null;
            });
        }
    }


    /** default load function
     * @param{array} params - remaining parameters
     * @returns {Promise}
     */
    loadInputs(inputparameters = {},basedirectory='') {
        let p = [];
        let des = this.getDescription();

        des.inputs.forEach((param) => {
            let name = param.varname;
            let inpname = inputparameters[name] || null;
            let required = param['required'] || false;
            let objtype = param['type'];
            
            if (required && inpname === null) {
                console.log('---- Error no filename specified for input ' + name + ' (of type:' + objtype + ')');
                p = null;
                return null;
            }
            if (required || inpname !== null) {
                console.log('.... Queuing reading of ' + objtype + ' ' + name + ' from: ' + basedirectory+inpname);
                p.push(this.loadSingleInput(name, basedirectory+inpname, objtype));
            }
        });

        if (p == null)
            return Promise.reject("error");

        const self = this;

        return new Promise((resolve, reject) => {
            Promise.all(p).then(() => {
                self.description = self.updateOnChangedInput(null);
                resolve();
            }).catch((e) => {
                reject(e);
            });
        });
    }

    /** Store Comments in Outputs 
     * Adds the command line options to each output */
    storeCommentsInOutputs(commandlineargs,vars=null,systeminfo=null) {

        let des = this.getDescription();
        des.outputs.forEach((param) => {
            let name = param['varname'];
            let cmt= { 'command ' : commandlineargs, 'output' : name};
            if (vars) 
                cmt['parameters']=JSON.parse(JSON.stringify(vars));
            if (systeminfo)
                cmt['systeminfo']=JSON.parse(JSON.stringify(systeminfo));
            if (this.outputs[name]) {
                this.outputs[name].addComment({ "ModuleOutput" : cmt});
                let fn=this.getOutputFilename(name);
                this.outputs[name].setFilename(fn);
            }
        });
    }


    /** default save function
     * @param {Object} inputparameters - Dictionary containing output filenames. Optional.
     * @returns {Promise}
     */
    saveOutputs(inputparameters = {}) {
        let p = [];
        let des = this.getDescription();
        des.outputs.forEach((param) => {
            let name = param['varname'];
            let objtype = param['type'];
            let required = param['required'] || false;

            let filename = inputparameters[name] || null;

            //if there's no specified filename and the file is required give it a default one
            if (required && filename === null)
                filename = this.getOutputFilename(name);

            //save outputs that have filenames and have targets present in this.outputs (if it's not required it may not have a filename)
            if (filename !== null && this.outputs[name] !== null) {
                console.log('.... Queuing writing of ' + objtype + ' ' + name + ' from: ' + filename);
                p.push(this.saveSingleOutput(name, filename));
            }
        });
        return Promise.all(p);
    }


    /** save parameters to file 
     * @param {FileObject} fobj - the file object to save to
     * @param {Object} guiVars - a dictionary of the current parameter values
     * @returns {Promise} - when save is done
     */
    saveParameters(fobj,guiVars) {

        let output= JSON.stringify({
            "module" : this.name,
            "params" : guiVars
        },null,4);
                                
        return new Promise(function (resolve, reject) {
            genericio.write(fobj, output).then((f) => {
                if (fobj.name)
                    fobj=fobj.name;
                resolve(f);
            }).catch((e) => { reject(e); });
        });
    }

    /** load parameters from file 
     * @param {FileObject} fobj - the file object to save to
     * @returns {Promise} - when load is done (payload is guivars -- see save above)
     */
    loadParameters(fobj) {

        const self=this;
        return new Promise((resolve, reject) => {
            genericio.read(fobj, false).then((contents) => {

                let obj = null;
                try {
                    obj=JSON.parse(contents.data);
                } catch(e) {
                    reject(e);
                }

                if (obj.module !== self.name) {
                    reject('Module name does not match in '+contents.filename);
                }

                resolve( obj.params);
            }).catch((e) => { reject(e); });
        });
    }
}


module.exports = BaseModule;
