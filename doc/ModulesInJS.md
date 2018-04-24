# Creating New BisWeb Modules in JS

## Introduction

Algorithmic functionality in BioImage Suite Web is packaged in Modules. These are implemented as classes derived from BaseModule (`js/modules/basemodule.js`).

The module architecture essentially requires that each module implements at least two functions:

* createDescription -- this returns a Dictionary object containing a description of the module's inputs, outputs, parameters and other metadata.

* directInvokeAlgorithm(vals) -- this is the internal execution function of a module that is, in turn, invoked from module.execute() defined in BaseModule.execute().

A key aspect of the module architecture is the adaptor framework that enables modules to become command line applications and components of web/desktop applications with automatically generated user interfaces. A variation of the command line adaptor runs the module in regression testing mode. The adaptors can be found at:

* Commandline -- `js/node/commandline.js` -- see also the driver main script in `js/bin/bisweb.js`

    - Regression Testing variant -- the main driver script for this is `js/bin/bisweb-test.js`

* Web/Desktop Applications -- `js/coreweb/bisweb_custommodule.js` with much functionality in the web parser module `js/coreweb/bisweb_webparser.js`.


## The Module Architecture

Consider the case of the `smoothImage` module (`js/modules/smoothImage.js`). We will review an annotated version of the source code (simplifying in parts for readability.)

First we set JS `strict-mode` and import the key libraries. The module biswrap imports the Web-Assembly code.

    'use strict';

    const biswrap = require('libbiswasm_wrapper');
    const BaseModule = require('basemodule.js');

We define a new class SmoothImageModule that extends Base Module

    class SmoothImageModule extends BaseModule {

The constructor calls `super()` and then defines the name of the module.

        constructor() {
            super();
            this.name = 'smoothImage';
        }

### createDescription

The `createDescription` function returns a dictionary object specifying the module. This has some core elements 

* name -- the name of the GUI dialog
* description -- a short description for help documentation
* author,version -- this should be obvious
* buttonName -- the name of the button on the GUI to execute this module (when created using bisweb_custommodule)
* shortname -- this is the tag to append to the input filename when creating default output names. If the input is `image.nii.gz` the output, in this case, will be `image_sm.nii.gz`.

        createDescription() {
            return {
                "name": "Smooth",
                "description": "This algorithm performes image smoothing using a 2D/3D Gaussian kernel",
                "author": "Zach Saltzman",
                "version": "1.0",
                "buttonName": "Smooth",
                "shortname" : "sm",

Next comes two arrays of input and output objects respectively. Each element has the following members:

* type -- one of `image`, `matrix`, `vector`, `transform` or `transformation`. This is used, in part, to load the object using the function BisWebDataObjectCollection.loadObject (see `js/dataobjects/bisweb_dataobject.js`).
* name -- the name of the object
* description -- a longer version of the name
* varname -- the name of the variable. Inputs will be passed into a module as a key value dictionary. `varname` sets the key for this input. This is also used to create the command line flag (`--input`` in this case)
* shortname -- the short name of the object. This is used to create the commandline flag (in this case `-i`.)
* required -- if true this input is required and if it is not set an error will be returned if the module is executed.
* guiviewer and guiviewertype -- Bisweb viewers can display two images `image` and `overlay`. The default input for this module will be taken from image (`guiviewertype`) of image `guiviewer` (this could be `viewer1` or `viewer2` in dual viewer apps etc.)

                "inputs": [
                    {
                        'type': 'image',
                        'name': 'Input Image',
                        'description': 'The image to be processed',
                        'varname': 'input',
                        'shortname': 'i',
                        'required': true,
                        'guiviewertype' : 'image',
                        'guiviewer'  : 'viewer1',
                    }
                ],

The outputs dictionary is identical to the inputs dictionary. 

                "outputs": [
                    {
                        'type': 'image',
                        'name': 'Output Image',
                        'description': 'The output image',
                        'varname': 'output',
                        'shortname': 'o',
                        'required': true,
                        'guiviewertype' : vtype,
                        'guiviewer'  : viewer,
                    }
                ],
        
Next comes the parameters object array. Each parameter has some of the following elements

* name -- the name of the parameter
* description -- a longer version of the name
* priority -- elements with shorter priority are displayed first in the GUI or the commandline help message
* advanced -- if true this parameter may be hidden or displayed differently
* gui -- the type of gui to use. This is one of `slider`, `dropdown`, `checkbox`, `text`.
* varname -- the values of the parameters will be passed (just like the inputs) into the module as a dictionary. `varname` is the key for this parameter in the dictionary. It also sets the commandline flag for setting this parameter in the case of command line apps (`--signa`)
* default -- this is the default value for the parameter.
* type -- one of `string`,`boolean`, `float` or `int`.
* low and high (or lowbound and highbound) -- in the case of floats or ints this sets the bounds of the allowed values
* step -- this sets the gradation of values between low and high.

For dropdown guis we set two more elements

    "fields": ["HillClimb", "GradientDescent", "ConjugateGradient"],
    "restrictAnswer": ["HillClimb", "GradientDescent", "ConjugateGradient"],

These show the value of the list to select from the the allowed values (which are for the most part the same)


                "params": [
                    {
                        "name": "Sigma",
                        "description": "The gaussian kernel standard deviation (either in voxels or mm)",
                        "priority": 1,
                        "advanced": false,
                        "gui": "slider",
                        "varname": "sigma",
                        "default": 1.0,
                        "type": 'float',
                        "low":  0.0,
                        "high": 8.0
                    },
                    {
                        "name": "In mm?",
                        "description": "Determines whether kernel standard deviation (sigma) will be measured in millimeters or voxels",
                        "priority": 7,
                        "advanced": false,
                        "gui": "check",
                        "varname": "inmm",
                        "type": 'boolean',
                        "default": true,
                    },
                    {
                        "name": "Radius Factor",
                        "description": "This affects the size of the convolution kernel which is computed as sigma*radius+1",
                        "priority": 2,
                        "advanced": true,
                        "gui": "slider",
                        "type": 'float',
                        "default": 2.0,
                        "lowbound": 1.0,
                        "highbound": 4.0,
                        "varname": "radiusfactor"
                    },
                    {
                        "name": "Debug",
                        "description": "Toggles debug logging",
                        "priority": 1000,
                        "advanced": true,
                        "gui": "check",
                        "varname": "debug",
                        "type": 'boolean',
                        "default": false,
                    }
                ],

            };
        }


### directInvokeAlgorithm

The last required function is the directInvokeAlgorithm function. This is called from BaseModule.execute (we will describe this next.)

The argument `vals` is a key-value object dictionary e.g.

    { 
        sigma : 2.0,
        radiusfactor : 2,
        inmm : true,
        debug  true
    }

The function prints a debug message first:

        directInvokeAlgorithm(vals) {
            console.log('oooo invoking: smoothImage with vals', JSON.stringify(vals));

We always return a Promise as the operation is potentially asynchronous. 

            return new Promise( (resolve, reject) => {
              
We get the input objects and parameters and check/sanitize them.

                let input = this.inputs['input'];
                let s = parseFloat(vals.sigma);
                
Next we call biswrap.initialize to initalize the Web Assembly Code. This also returns a Promise.

                biswrap.initialize().then(() => {

Once the initialize function is completed we invoke the WASM code and store the output in the this.outputs dictionary as shown below

                    this.outputs['output'] = biswrap.gaussianSmoothImageWASM(input, {
                        "sigmas": [s, s, s],
                        "inmm": super.parseBoolean(vals.inmm),
                        "radiusfactor": parseFloat(vals.radiusfactor)
                    }, super.parseBoolean(vals.debug));

Once this is done we call `resolve` to signal that the Promise is completed and return.

                    resolve();

If this fails we invoke `reject` to through an error message.

                }).catch( (e) => {

                    reject(e.stack);
                });
            });
        }
    }

Finally we export the class as module.exports in the module.

    module.exports = SmoothImageModule;


### BaseModule.execute

The external interface to the modules is the execute function. This can take the form

    let smoothModule = new SmoothImageModule();
    let inputimage = ...; // some way of getting this

    smoothModule.execute( {
        'input' : inputimage
    }, {
        sigma : 2.0
    }).then( () => { 
        let output=smoothModule.getOutputObject('output');
        // do something with this
    })

Let us now review the `execute` function itself.

        /** Runs the module programmatically 
        * @param {dictionary} inputs -- input objects
        * @param {dictionary} parameters -- input parameters
        * @returns {Promise}
        */
        execute(inputs, params = {}) {

First we parse the `params` key/value dictionary and add default values for any parameters whose values are not specified.

            let fullparams = this.parseValuesAndAddDefaults(params);
 
Next get the module's description (which calls createDescription if needed) and check that the required inputs are set:

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

Create a new promise and call `directInvokeAlgorithm`. The constant `self` holds the value of `this` (see this, that etc. in [AspectsOfJS.md](AspectsofJS.md))

            const self=this;
            let name=this.name;
            
            return new Promise( (resolve,reject) => { 
                self.directInvokeAlgorithm(fullparams).then( () => {

Store information about the execution environment etc. in the comments metadata field of each output.

                    self.storeCommentsInOutputs(baseutils.getExecutableArguments(name), params, 
                    baseutils.getSystemInfo(biswrap));

Call `resolve` to mark the Promise as fuilfilled.

                    resolve();

Alternatively, trap any errors and call `reject`.

                }).catch( (e) => {
                    reject(e);
                });
            });
        }

### GUI Updates

Some modules have parameters whose ranges depend on the actual inputs. For example `thresholdImage`'s thresholds should be restricted in range to the actual intensity range of the input image. This is accomplished using the function

    updateOnChangedInput(inputs,controllers=null,guiVars=null)

See `js/modules/thresholdImage.js` for an example.

One module requires updates of the value of the cross-hairs of the current image viewer. An example of this is the `MorphologyFilterModule`. First in the constructor we set the flag `mouseobserver` to true

    class MorphologyFilterModule extends BaseModule {
        constructor() {
            ...
            this.mouseobserver=true;
        }

Next we implement the function setViewerCoordinates to handle viewer cross-hairs updates.

    setViewerCoordinates(controllers,guivars,coords=null)


## Implementing a new Module

This consists of the following steps:

1. Implement the module itself and place it in the `js/modules` directory.
2. Register the module in `js/modules/moduleindex.js`. This needs to be added to both the `exports` structure and in the `exports.modulesNamesArray`. In the latter the key should be specified in lower case.

From here the module can be invoked on the commandline using

    node js/bin/bisweb.js modulename -h

It can also be added to GUI applications. See examples in `js/webcomponents/bisweb_modulemanagerelement.js`


