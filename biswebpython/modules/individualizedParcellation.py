# LICENSE
# 
# _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
# 
# BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
# 
# - you may not use this software except in compliance with the License.
# - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
# 
# __Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.__
# 
# ENDLICENSE

import sys
import numpy as np
import biswebpython.core.bis_basemodule as bis_basemodule
import biswebpython.core.bis_objects as bis_objects

class individualizedParcellation(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='individualizedParcellation';
   
    def createDescription(self):
        obj=self.getModuleDescriptionFromFile('individualizedParcellation');
        obj['params'].append(
            {
                "name": "usefloat",
                "description": "if true use float processing",
                "priority": 1000,
                "advanced": True,
                "gui": "check",
                "varname": "usefloat",
                "type": "boolean",
                "default": False
            }
        );
        return obj;

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: individualizedParcellation with vals', vals);

        debug=self.parseBoolean(vals['debug']);
        fmri = self.inputs['fmri'];
        group = self.inputs['parc'];

        if (fmri.hasSameOrientation(group,'fMRI Image','Group Parcellation',True)==False):
            return False;

        libbis=self.getDynamicLibraryWrapper();

        fmriDim = fmri.dimensions;
        groupDim = group.dimensions;
        
        # Reslice Group Parcellation if needed
        if (fmriDim[0] != groupDim[0] or fmriDim[1] != groupDim[1] or fmriDim[2] != groupDim[2]):
            print('++++ \t Group parcellation being resliced to match the fMRI image dimension...');
            resl_paramobj = {
                "interpolation": 0,
                "dimensions": [ fmri.dimensions[0],fmri.dimensions[1],fmri.dimensions[2] ],
                "spacing": fmri.spacing,
                "datatype": "short",
                "backgroundValue": 0.0,
            };
                
            matr=np.eye(4,dtype=np.float32);
            try:
                print('++++ Reslicing group parcellation to match dimensions of individual fmri image');
                group=libbis.resliceImageWASM(group,matr,resl_paramobj,debug);
            except:
                e = sys.exc_info()[0]
                print('---- Failed to invoke algorithm',e);
                return False
            print('++++ \t Group parcellation dims=', group.dimensions);

        # Smooth If needed
        smooth=vals['smooth'];
        if (smooth > 0.001 ):
            print('++++ \t Smoothing fMRI image...');
            c = smooth * 0.4247;
            smooth_paramobj = {
                "sigmas": [c, c, c],
                "inmm": True,
                "radiusfactor": 1.5,
                "vtkboundary" : True,
            };

            try:
                print('++++ Smoothing fmri Image');
                fmri = libbis.gaussianSmoothImageWASM(fmri, smooth_paramobj, debug);
            except:
                e = sys.exc_info()[0]
                print('---- Failed to invoke algorithm',e);
                return False


        # Actual Parcellation
        paramobj= {
            'numberofexemplars' : vals['numregions'],
            'usefloat' : self.parseBoolean(vals['usefloat']),
            'saveexemplars' : self.parseBoolean(vals['saveexemplars']),
        };
        try: 
            self.outputs['output']=libbis.individualizedParcellationWASM(fmri,group,paramobj,debug);
        except OSError as f:
            print(f)
            return False
        except:
            e = sys.exc_info()[0]
            print('---- Failed to invoke algorithm',e);
            return False

        return True




