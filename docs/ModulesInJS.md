This document contains [developer documentation](README.md) for
[BioImage Suite Web](https://bioimagesuiteweb.github.io/webapp/). 

---
# Creating New BisWeb Modules in JS

## Introduction

Algorithmic functionality in BioImage Suite Web is packaged in Modules, which are implemented as classes derived from `BaseModule` (`js/modules/basemodule.js`).

The module architecture requires that each module implements at least two functions:

* `createDescription` — Returns an `Object` containing a description of the module's inputs, outputs, parameters, and other metadata.

* `directInvokeAlgorithm` — The internal execution function of a module that is, in turn, invoked from `module.execute()` defined in `BaseModule.execute()`.

A key aspect of the module architecture is the adaptor framework that enables modules to become command line applications and components of web/desktop applications with automatically generated user interfaces. A variant of the command line adaptor runs the modules for regression testing. The adaptors can be found at:

* Command line -- `js/node/commandline.js` — see also the driver main script in `js/bin/bisweb.js`
    * Regression Testing variant — the main driver script for this is `js/bin/bisweb-test.js`

* Web/Desktop Applications — `js/coreweb/bisweb_custommodule.js` with the UI integration in `js/coreweb/bisweb_webparser.js` and viewer integration in `js/webcomponents/bisweb_simplealgorithmcontroller`.


## The Module Architecture

Consider the case of the `smoothImage` module (`js/modules/smoothImage.js`). 

First set JS `strict-mode` and import the key libraries. The module `biswrap` imports the WebAssembly code.

    'use strict';

    const biswrap = require('libbiswasm_wrapper');
    const BaseModule = require('basemodule.js');

We define a new class `SmoothImageModule` that extends `BaseModule`

    class SmoothImageModule extends BaseModule {

The constructor calls the super class constructor and and then defines the name of the module.

        constructor() {
            super();
            this.name = 'smoothImage';
        }

### createDescription

The `createDescription` function returns a dictionary object specifying the module. This has some core elements 

* `name` — The name of the element in the GUI
* `description` — A short description of the module.
* `author` — The author of the module.
* `version` — The current version of the software.
* `buttonName` — The text displayed on the button that will run the module, e.g. the `buttonName` for `smoothImage` might be 'Smooth', for `nonLinearRegistration` might be 'Run Non-Linear Registration', etc.
* `shortname` — The tag to append to the input filename when creating default output names. For the example below, if the input is `image.nii.gz` the output will be `image_sm.nii.gz`.

        createDescription() {
            return {
                "name": "Smooth",
                "description": "This algorithm performes image smoothing using a 2D/3D Gaussian kernel",
                "author": "Zach Saltzman",
                "version": "1.0",
                "buttonName": "Smooth",
                "shortname" : "sm",

Next comes two arrays of input and output objects respectively. Each element has the following members:

* `type` — One of `image`, `matrix`, `vector`, `transform` or `transformation`. This is used to load the object using the  `BisWebDataObjectCollection.loadObject` (see `js/dataobjects/bisweb_dataobject.js`).
* `name` — The name of the object.
* `description` — A longer version of the name.
* `varname` — The name with which the module should reference an input loaded at runtime. Inputs will be passed into a module as a key value dictionary. `varname` sets the key for this input. This is also used to create the command line flag, `--input` in this case.
* `shortname` — The short name of the object. This is used to create the commandline flag, in this case `-i`.
* `required` — If true this input is required to run the module and if it is not set an error will be returned at runtime.
* `guiviewer` and `guiviewertype` — Bisweb viewers can display two images, `image` and `overlay`, the former which loads into the viewer as expected and the latter which loads as an mask over it. These values specify how the module should display its outputs. This could be `viewer1` or `viewer2` in dual viewer apps, etc.

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

`outputs` is identical to `inputs`. 

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
        
Next comes the parameters object array. Each parameter has some of the following elements:

* `name` — The name of the parameter.
* `description` — A longer version of the name.
* `priority` — Elements of higher priority are displayed first in the GUI or the commandline help message. An element with priority `i` is considered higher priority than an element with priority `i + 1`.
* `advanced` — If true, this parameter will be considered more advanced than the typical user will require and will be placed in a different menu by default.
* `gui` — The type of GUI element to use — one of `slider`, `dropdown`, `checkbox`, `text`.
* `varname` — The values of the parameters will be passed into the module as a dictionary similar to `inputs`. `varname` is the key for this parameter in the dictionary. It also sets the flag for the parameter if the module is being run from the command line, e.g. the param below would have its value assigned by entering `--sigma=1.0` on the command line. 
* `default` — The default value for the parameter.
* `type` — One of `string`,`boolean`, `float` or `int`.
* `low` and `high`/`lowbound` and `highbound` — In the case of `float` or `int` this sets the bounds of the allowed values
* `step` — Sets the gradation of values between `low` and `high`.

Dropdown guis may have two more elements

    "fields": ["HillClimb", "GradientDescent", "ConjugateGradient"],
    "restrictAnswer": ["HillClimb", "GradientDescent", "ConjugateGradient"],

These show the value of the list to select from and the allowed values,which are for the most part the same.


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

The last required function is `directInvokeAlgorithm`, which is called from `BaseModule.execute` (see next section for details).

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

The function is run through a Promise as the operation is potentially asynchronous. 

            return new Promise( (resolve, reject) => {
              
Get the input objects and parameters and check/sanitize them.

                let input = this.inputs['input'];
                let s = parseFloat(vals.sigma);
                
Next call `biswrap.initialize` to initalize the WebAssembly code. This also returns a Promise.

                biswrap.initialize().then(() => {

Once the initialize function is complete, invoke the WASM code and store the output in the `this.outputs` dictionary.

                    this.outputs['output'] = biswrap.gaussianSmoothImageWASM(input, {
                        "sigmas": [s, s, s],
                        "inmm": super.parseBoolean(vals.inmm),
                        "radiusfactor": parseFloat(vals.radiusfactor)
                    }, super.parseBoolean(vals.debug));

`resolve` if the the module returns without error, otherwise catch the error and `reject` with an error message.

                    resolve();

                }).catch( (e) => {

                    reject(e.stack);
                });
            });
        }
    }

Finally, export the class.

    module.exports = SmoothImageModule;


### BaseModule.execute

The external interface to the modules is `execute`. This can take the form:

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

Consider `execute` itself:

        /** Runs the module programmatically 
        * @param {Object} inputs — input objects
        * @param {Object} parameters — input parameters
        * @returns {Promise}
        */
        execute(inputs, params = {}) {

First, parse the `params` key/value dictionary and add default values for any parameters whose values are not specified.

            let fullparams = this.parseValuesAndAddDefaults(params);
 
Next get the module's description, which calls `createDescription` if needed, and check that the required inputs are set:

            let des = this.getDescription();

            let error = [];
            des.inputs.forEach( (param) => {
                let name = param['varname'];
                this.inputs[name] = inputs[name] || null;
                if (this.inputs[name] === null && param.required === true) {
                    console.log("No/empty " + param.name + " specified.");
                    error.push("No/empty " + param.name + " specified.");
                }
            });

            if (error.length > 0)
                return Promise.reject(error.join("\n"));

Create a new promise and call `directInvokeAlgorithm`. The constant `self` holds the value of `this` (see "this, that, etc." in [AspectsOfJS.md](AspectsofJS.md))

            const self = this;
            let name = this.name;
            
            return new Promise( (resolve, reject) => { 
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

Some modules have parameters whose ranges depend on the actual inputs. For example `thresholdImage` has thresholds that should be restricted in range to the intensity range of the input image. This is done using:

    updateOnChangedInput(inputs, controllers = null, guiVars = null)

See `js/modules/thresholdImage.js` for an example.

One module requires updates of the value of the crosshairs of the current image viewer. An example of this is the `MorphologyFilterModule`. First in the constructor, set the flag `mouseobserver` to true

    class MorphologyFilterModule extends BaseModule {
        constructor() {
            ...
            this.mouseobserver=true;
        }

Next implement the function `setViewerCoordinates` to handle viewer crosshairs updates.

    setViewerCoordinates(controllers,guivars,coords=null)


## Implementing a new Module

This consists of the following steps:

1. Implement the module itself and place it in the `js/modules` directory.
2. Register the module in `js/modules/moduleindex.js`. This needs to be added to both the `exports` structure and in the `exports.modulesNamesArray`. In the latter the key should be specified in lower case.

From here the module can be invoked on the command line using

    node js/bin/bisweb.js modulename -h

It can also be added to GUI applications. See examples in `js/webcomponents/bisweb_modulemanagerelement.js`


