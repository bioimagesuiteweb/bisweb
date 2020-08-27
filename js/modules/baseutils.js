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

const genericio = require('bis_genericio');
const platform = require('platform');
const os=genericio.getosmodule();
// This File has a collection of functions to simplify
// setting of parameters

module.exports = {

    getDebugParam() {
        return {
            "name": "Debug",
            "description": "Toggles debug logging",
            "priority": 1000,
            "advanced": true,
            "gui": "check",
            "varname": "debug",
            "type": 'boolean',
            "default": false,
        };
    },

    getRegressorInput() {
        return {
            'type': 'matrix',
            'name': ' Regressor',
            'description': 'The regressor matrix',
            'varname': 'regressor',
            'shortname': 'r',
        };
    },

    getImageToImageInputs: function (desc,viewer='viewer1',vtype='image') {
        return [
            {
                'type': 'image',
                'name': 'Input Image',
                'description': desc || 'The filename for the image to be processed',
                'varname': 'input',
                'shortname': 'i',
                'required': true,
                'guiviewertype' : vtype,
                'guiviewer'  : viewer,
            }
        ];
    },

    getImageToImageOutputs: function (desc = null, viewer='viewer1',vtype='image',addlog=false) {

        vtype=vtype || 'image';
        viewer=viewer || 'viewer1';
        
        let arr=[
            {
                'type': 'image',
                'name': 'Output Image',
                'description': desc || 'The output image filename',
                'varname': 'output',
                'shortname': 'o',
                'required': true,
                'extension': '.nii.gz',
                'guiviewertype' : vtype,
                'guiviewer'  : viewer,
            }
        ];

        if (addlog) 
            this.addLogOutput(arr);
        
        return arr;
    },

    addLogOutput(arr,required=false) {
        arr.push({
            'type' : 'text',
            'name' : 'Results',
            'description': 'log file',
            'varname': 'logoutput',
            'required': required,
            'extension': '.bistext'
        });
    },

    getMatrixToMatrixInputs: function (addweights = false, desc = null) {
        let arr = [
            {
                'type': 'matrix',
                'name': 'Matrix',
                'description': desc || 'The input data (matrix) to process. Rows=Frames, Columns=Series.',
                'varname': 'input',
                'shortname': 'i',
                'required': true,
            }
        ];
        if (addweights)
            arr.push({
                'type': 'vector',
                'name': 'Weights',
                'description': '(Optional). The framewise weight vector',
                'varname': 'weight',
                'shortname': 'w',
                'required': false,
            });
        return arr;
    },

    getMatrixToMatrixOutputs: function (desc = null) {
        return [
            {
                'type': 'matrix',
                'name': 'Output Matrix',
                'description': desc || 'The output matrix',
                'varname': 'output',
                'shortname': 'o',
                'required': true,
                'extension' : '.matr'
            }
        ];
    },

    getSurfaceToSurfaceInputs: function (desc=null) {
        return [
            {
                'type': 'surface',
                'name': 'Surface',
                'description': desc || 'The input data (surface) to process..',
                'varname': 'input',
                'shortname': 'i',
                'required': true,
            }
        ];
    },

    getSurfaceToSurfaceOutputs: function (desc = null) {
        return [
            {
                'type': 'surface',
                'name': 'Output Surface',
                'description': desc || 'The output surface',
                'varname': 'output',
                'shortname': 'o',
                'required': true,
                'extension' : '.surjson'
            }
        ];
    },


    getRegistrationInputs: function (includematrix=true) {
        let inp= [
            {
                'type': 'image',
                'name': 'Reference Image',
                'description': 'The reference image',
                'varname': 'reference',
                'shortname': 'r',
                'required': true,
                'guiviewerinput' : 'image',
                'guiviewer'  : 'viewer1',

            },
            {
                'type': 'image',
                'name': 'Target Image',
                'description': 'The image to register',
                'varname': 'target',
                'shortname': 't',
                'required': true,
                'guiviewerinput' : 'image',
                'guiviewer'  : 'viewer2',

            }
        ];
        if (includematrix)
            inp.push({
                'type': 'transformation',
                'name': 'Initial Xform',
                'description': 'The initial transformation (optional)',
                'varname': 'initial',
                'required': false,
                'guiviewer' : 'identity',
            });
        return inp;
    },

    getSurfaceRegistrationInputs: function (includematrix=true) {
        let inp= [
            {
                'type': 'surface',
                'name': 'Reference Surface',
                'description': 'The reference surface',
                'varname': 'reference',
                'shortname': 'r',
                'required': true
            },
            {
                'type': 'surface',
                'name': 'Target Surface',
                'description': 'The surface to register',
                'varname': 'target',
                'shortname': 't',
                'required': true,

            }
        ];
        if (includematrix)
            inp.push({
                'type': 'transformation',
                'name': 'Initial Xform',
                'description': 'The initial transformation (optional)',
                'varname': 'initial',
                'required': false,
                'guiviewer' : 'identity',
            });
        return inp;
    },

    getRegistrationOutputs: function () {
        return [
            {
                'type': 'transformation',
                'name': 'Output Transformation',
                'description': 'The output transformation',
                'varname': 'output',
                'shortname': 'o',
                'required': true,
                'extension' : '.json',
            },
            {
                'type': 'image',
                'name': 'Resliced Image',
                'description': 'The resliced image',
                'varname': 'resliced',
                'required': false,
                'extension' : '.nii.gz',
                'guiviewertype' : 'overlay',
                'guiviewer'  : 'viewer1',
                'colortype'  : 'Orange'
            }
        ];
    },

    getSurfaceRegistrationOutputs: function () {
        return [
            {
                'type': 'transformation',
                'name': 'Output Transformation',
                'description': 'The output transformation',
                'varname': 'output',
                'shortname': 'o',
                'required': true,
                'extension' : '.json',
            },
            {
                'type': 'surface',
                'name': 'Warped Surface',
                'description': 'The warped surface',
                'varname': 'warped',
                'required': false,
                'extension' : '.nii.gz',
                'guiviewertype' : 'overlay',
                'guiviewer'  : 'viewer1',
                'colortype'  : 'Orange'
            }
        ];
    },

    getOptParams: function (obj = null) {

        obj = obj || {};
        obj.stepsize = obj.stepsize || 1.0;
        obj.levels = obj.levels || 3;
        obj.iterations = obj.iterations || 10;
        obj.resolution = obj.resolution || 1.5;
        obj.steps = obj.steps || 1;


        return [
            {
                "name": "Optimization",
                "description": "Optimization Method",
                "priority": 5,
                "advanced": true,
                "type": "string",
                "gui": "dropdown",
                "fields": ["HillClimb", "GradientDescent", "ConjugateGradient"],
                "restrictAnswer": ["HillClimb", "GradientDescent", "ConjugateGradient"],
                "varname": "optimization",
                "default": "ConjugateGradient"
            },
            {
                "name": "Step Size",
                "description": "Step size for gradient computation",
                "priority": 6,
                "advanced": true,
                "type": "float",
                "gui": "slider",
                "varname": "stepsize",
                "default": obj.stepsize,
                "low": 0.125,
                "high": 4.0,
            },
            {
                "name": "Levels",
                "description": "Number of levels in multiresolution optimization",
                "priority": 3,
                "advanced": false,
                "default": obj.levels,
                "type": "int",
                "gui": "slider",
                "varname": "levels",
                "low": 1,
                "high": 4,
            },
            {
                "name": "Iterations",
                "description": "Number of iterations (per level and step)",
                "priority": 9,
                "advanced": false,
                "gui": "slider",
                "type": "int",
                "varname": "iterations",
                "low": 1,
                "high": 32,
                "default": obj.iterations
            },
            {
                "name": "Resolution",
                "description": "Factor to reduce the resolution prior to registration",
                "priority": 11,
                "advanced": false,
                "gui": "slider",
                "type": "float",
                "varname": "resolution",
                "default": obj.resolution,
                "low": 1.0,
                "high": 5.0,
                "step" : 0.25,
            },
            this.getDebugParam(),

            {
                "name": "Steps",
                "description": "Number of steps in multiresolution optimization",
                "priority": 8,
                "advanced": true,
                "gui": "slider",
                "type": "int",
                "varname": "steps",
                "default": obj.steps,
                "low": 1,
                "high": 4,
            }

        ];
    },

    getRegistrationParams: function () {
        let arr = [
            {
                "name": "Reslice",
                "description": "If true, also output a resliced targed image using the current transform",
                "priority": 100,
                "advanced": true,
                "gui": "check",
                "varname": "doreslice",
                "type": 'boolean',
                "default": false,
            },
            {
                "name": "Normalize",
                "description": "If true, normalize input intensities by saturating using cumulative histogram",
                "priority": 101,
                "advanced": true,
                "gui": "check",
                "varname": "norm",
                "type": 'boolean',
                "default": true,
            },
            {
                "name": "Int Scale",
                "description": "Determines the intensity scaling post image normalization",
                "priority": 1,
                "advanced": true,
                "type": "int",
                "gui": "slider",
                "varname": "intscale",
                "default": 1,
                "low": 1,
                "high": 4,
            },
            {
                "name": "Number of Bins",
                "description": "Number of bins in joint histogram",
                "priority": 2,
                "advanced": true,
                "gui": "slider",
                "type": "int",
                "default": 64,
                "varname": "numbins",
                "fields": [16, 32, 64, 128, 256, 512, 1024],
                "restrictAnswer": [16, 32, 64, 128, 256, 512, 1024],
            },
            {
                "name": "Smoothing",
                "description": "Amount of image smoothing to perform",
                "priority": 4,
                "advanced": true,
                "type": "float",
                "gui": "slider",
                "varname": "imagesmoothing",
                "default": 1.0,
                "low":  0.0,
                "high": 4.0,
                "step" : 0.5,
            },
            {
                "name": "Metric",
                "description": "Metric to compare registration",
                "priority": 7,
                "advanced": true,
                "gui": "dropdown",
                "type": "string",
                "fields": ["SSD", "CC", "MI", "NMI"],
                "restrictAnswer": ["SSD", "CC", "MI", "NMI"],
                "varname": "metric",
                "default": "NMI"
            }
        ];

        return arr.concat(this.getOptParams());
    },

    getLinearMode: function (name = "Mode", extra = "", defaultv = "Rigid") {

        let opt = ["Rigid", "Similarity", "Affine9", "Affine"];
        if (name === "linearmode")
            opt.push("None");

        return {
            "name": name,
            "description": extra + "registration mode, one of  " + opt.join(" "),
            "priority": 10,
            "advanced": false,
            "gui": "dropdown",
            "type": "string",
            "default": defaultv,
            "fields": opt,
            "restrictAnswer": opt,
            "varname": name.toLowerCase()
        };
    },



    getOptimizationCode: function (name) {
        name = (name || "ConjugateGradient").toLowerCase();
        if (name === "hillclimb")
            return 0;
        if (name === "gradientdescent")
            return 1;
        return 2;
    },

    getMetricCode: function (name) {
        name = (name || "NMI").toUpperCase();

        if (name === "SSD")
            return 0;

        if (name === "CC")
            return 1;

        if (name === "MI")
            return 2;

        return 3;
    },

    getLinearModeCode: function (name) {

        name = (name || "Rigid").toLowerCase();
        if (name === "similarity")
            return 1;
        if (name === "affine9")
            return 2;
        if (name === "affine")
            return 3;
        if (name === "none")
            return -1;
        return 0;
    },


    resliceRegistrationOutput: function (biswrap, reference, target, transform,interpolation=1,background=0.0) {

        let spa = reference.getSpacing();
        let dim = reference.getDimensions();
        let out=biswrap.resliceImageWASM(
            target, transform, {
                "spacing": [spa[0], spa[1], spa[2]],
                "dimensions": [dim[0], dim[1], dim[2]],
                "interpolation": interpolation,
                "backgroundValue" : background,
            });
        out.copyOrientationInfo(reference);
        return out;
    },

    findParam(paramarray,key) {

        let i=0;
        while (i<paramarray.length) {
            let vname=paramarray[i].varname || "";
            if (vname===key)
                return i;
            i=i+1;
        }
        return -1;
    },

    setParamDefaultValue(paramarray,key,value) {

        let i=this.findParam(paramarray,key);
        if (i>=0) 
            paramarray[i].default=value;
        else
            console.log('key ',key, 'not found');
    },


    getSystemInfo(biswrap) {

        let systeminfo = null;
        
        if (genericio.getmode()==='node') {
            systeminfo= {
                os:  os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                user: os.userInfo().username,
                date: new Date(),
                nodeversion: process.version,
                biswebversion : biswrap.get_date()
            };
        } else {
            systeminfo = {
                os: platform.os.family,
                arch: platform.os.architecture,
                browser: platform.name,
                date: new Date(),
                browserversion: platform.version,
                biswebversion : biswrap.get_date(),
            };
        }
        return systeminfo;
    },

    getExecutableArguments(name) {
        if (genericio.getmode()==='node') 
            return [ 'node'];
        if (typeof window === "undefined")
            return [ 'browser worker' ];
        let s=window.location.href+" "+name;
        return s;
    }

};
