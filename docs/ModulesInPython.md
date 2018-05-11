This document contains [developer documentation](README.md) for
[BioImage Suite Web](https://bioimagesuiteweb.github.io/webapp/). 

---
# Creating New BisWeb Modules in Python

Please read the [JavaScript version of this document](ModulesInJS.md) before reading this one. The JS description is more detailed and the description here simply focuses on the differences between the JS and the Python versions. Please also look at the core document [BisWebPython.md](BisWebPython.md) for an introduction to the use of Python in the BioImage Suite Web environment.

## The SmoothImage Module in Python

This module, which can be found in `python/modules/smoothImage.py`, directly mimics and in part __depends on__ the JS modules from `js/modules/smoothImage.js`

### Descriptions

The JS document describes the creation of Module descriptions. The inital Python Modules are simply adaptations of the JS modules to allow use of the C++ code from Python, and hence use the same descriptions as the paired JS modules. The only change is the mapping of `true` and `false`  to `True` and `False` (Python uses uppercase boolean names). The Python file `buildcpp/modules_desc.py` is created by `compiletools/bis_createmoduledescriptions.js`. This contains "Pythonized" versions of all the module descriptions in a giant dictionary object. For the `smoothImage` module this has the form:


        "smoothImage": {
            "name": "Smooth",
            "description": "This algorithm performes image smoothing using a 2D/3D Gaussian kernel",
            "author": "Zach Saltzman",
            "version": "1.0",
            "inputs": [
                {
                    "type": "image",
                    "name": "Input Image",
                    "description": "Load the image to be smoothed",
                    "varname": "input",
                    "shortname": "i",
                    "required": True,
                    "guiviewertype": "image",
                    "guiviewer": "viewer1"
                }
            ],
            "outputs": [
                {
                    "type": "image",
                    "name": "Output Image",
                    "description": "Save the output image",
                    "varname": "output",
                    "shortname": "o",
                    "required": True,
                    "extension": ".nii.gz",
                    "guiviewertype": "image",
                    "guiviewer": "viewer1"
                }
            ],
            "buttonName": "Smooth",
            "shortname": "sm",
            "params": [
                {
                    "name": "Sigma",
                    "description": "The gaussian kernel standard deviation (either in voxels or mm)",
                    "priority": 1,
                    "advanced": False,
                    "gui": "slider",
                    "varname": "sigma",
                    "default": 1,
                    "type": "float",
                    "low": 0,
                    "high": 8
                },
                {
                    "name": "In mm?",
                    "description": "Determines whether kernel standard deviation (sigma) will be measured in millimeters or voxels",
                    "priority": 7,
                    "advanced": False,
                    "gui": "check",
                    "varname": "inmm",
                    "type": "boolean",
                    "default": True
                },
                {
                    "name": "Radius Factor",
                    "description": "This affects the size of the convolution kernel which is computed as sigma*radius+1",
                    "priority": 2,
                    "advanced": True,
                    "gui": "slider",
                    "type": "float",
                    "default": 2,
                    "lowbound": 1,
                    "highbound": 4,
                    "varname": "radiusfactor"
                },
                {
                    "name": "Debug",
                    "description": "Toggles debug logging",
                    "priority": 1000,
                    "advanced": True,
                    "gui": "check",
                    "varname": "debug",
                    "type": "boolean",
                    "default": False
                }
            ]
        }



First comes the header 

    #!/usr/bin/env python3

    import sys
    import bis_path;
    import math
    import numpy as np
    import argparse
    import bis_basemodule
    import bis_objects

This is a critical import. This module is automatically generated from JS code (using the script `compiletools/bis_createmoduledescriptions.js`)

    import modules_desc;

This is the C++ code wrapper.

    import biswrapper as libbis;

Here is the actual class:

    class smoothImage(bis_basemodule.baseModule):

The constructor is practically identical to the JS version.

        def __init__(self):
            super().__init__();
            self.name='smoothImage';
    
The description is simply extracted from the `modules_desc` module.

        def createDescription(self):
            return modules_desc.descriptions['smoothImage'];

The only interesting function is `directInvokeAlgorithm`.

        def directInvokeAlgorithm(self,vals):
            print('oooo invoking: smoothImage with vals', vals);

            input = self.inputs['input'];
            s = (vals['sigma']);

The actual C++ call is contained in a `try ... except` block.

            try:
                self.outputs['output'] = libbis.gaussianSmoothImageWASM(input,
                                                                        paramobj={
                                                                            "sigmas": [s, s, s],
                                                                            "inmm": self.parseBoolean(vals['inmm']),
                                                                            "radiusfactor": vals['radiusfactor'],
                                                                        }, debug=self.parseBoolean(vals['debug']))
            except:

If this fails, print a detailed log and return `False`

                e = sys.exc_info()[0]
                print('---- Failed to invoke algorithm',e);
                return False

If success, return `True`;

            return True

    if __name__ == '__main__':
        import bis_commandline;
        import bis_commandline; sys.exit(bis_commandline.loadParse(smoothImage(),sys.argv,False));



    
