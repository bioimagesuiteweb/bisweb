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

import biswebpython.core.bis_basemodule as bis_basemodule
import biswebpython.core.bis_baseutils as bis_baseutils
import biswebpython.core.bis_objects as bis_objects
from biswebpython.modules.extractImagePatches import *
import os

class imageSpectralClustering(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='imageDistanceMatrix';
   
    def createDescription(self):
        
        return {
            "name": "compute spectral Imaging CLustering (Calls matlab code)",
            "description": "Given an image and a mask compute the image distance matrix, the index map and a matlab script to run the clustering code",
            "author": "Xenios Papademetris and Xilin Shen",
            "version": "1.0",
            "inputs": [
                {
                    "type": "image",
                    "name": "Input Image",
                    "description": "The input (timeseries) image",
                    "varname": "input",
                    "shortname" : "i",
                    "required": True
                },
                {
                    "type": "image",
                    "name": "Objectmap Image",
                    "description": "The objectmap/mask image",
                    "varname": "mask",
                    "shortname" : "m",
                    "required": False
                },
            ],
            "outputs": [
                 {
                    'type': 'matrix',
                    'name': 'Output Matrix',
                    'description': 'the output distance matrix', 
                    'varname': 'output',
                    'shortname': 'o',
                    'required': True,
                    'extension' : ".binmatr"
                },
                {
                    'type': 'image',
                    'name': 'IndexMap Image',
                    'description': 'the output indexmap image', 
                    'varname': 'indexmap',
                    'shortname': 'x',
                    'required': False,
                    'extension' : ".nii.gz"
                }
            ],
            "params": [
                {
                    "name": "useradius",
                    "description": "If true use radius else sparsity",
                    "varname": "useradius",
                    "type": "boolean",
                    "default": True
                },
                {
                    "name": "NumThreads",
                    "description": "The number of threads to use",
                    "type": "int",
                    "default": 1,
                    "lowbound": 1,
                    "highbound": 10,
                    "varname": "numthreads"
                },
                {
                    "name": "Radius",
                    "description": "The radius constraint (if useradius=true)",
                    "type": "float",
                    "default": 4.0,
                    "lowbound": 0.1,
                    "highbound": 10.0,
                    "varname": "radius"
                },
                {
                    "name": "Sparsity",
                    "description": "The sparsity constraint (if useradius=false)",
                    "type": "float",
                    "default": 0.01,
                    "lowbound": 0.01,
                    "highbound": 0.2,
                    "varname": "sparsity"
                },
                {
                    "name": "Numpatches",
                    "description": "Number of patches to extract (default=0 i.e. use whole image as opposed to patches)",
                    "type": "int",
                    "default": 0,
                    "lowbound": 0,
                    "highbound": 65536,
                    "varname": "numpatches"
                },
                {
                    "name": "Smoothness",
                    "description": "The weight of the euclidean smoothness constraint for clustering",
                    "type": "float",
                    "default": 0.01,
                    "lowbound": 0.0,
                    "highbound": 10.0,
                    "varname": "smoothness"
                },
                {
                    "name": "Numclusters",
                    "description": "Number of clusters",
                    "type": "int",
                    "default": 3,
                    "lowbound": 2,
                    "highbound": 500,
                    "varname": "numclusters"
                },
                {
                    "name": "Patchsize",
                    "description": "Patch size (in voxels) (default=32) if using patches",
                    "type": "int",
                    "default": 32,
                    "lowbound": 2,
                    "highbound": 256,
                    "varname": "patchsize"
                },
                {
                    "name": "3d",
                    "description": "if true 3d patches (default=false) if using patches",
                    "priority": 1000,
                    "advanced": False,
                    "gui": "check",
                    "varname": "threed",
                    "type": 'boolean',
                    "default": False,
                },
                {
                    "name": "Matlab script",
                    "description": "name of output matlab script",
                    "type": "string",
                    "default": None,
                    "varname": "script"
                },
                {
                    "name": "Matlab cluster output image",
                    "description": "name of matlab output cluster image. If None then script+.nii.gz",
                    "type": "string",
                    "default": None,
                    "varname": "clusteroutput"
                },
                {
                    "name": "Matlab path",
                    "description": "path to bisweb matlab library",
                    "type": "string",
                    "default": None,
                    "varname": "matlabpath"
                },      

                {
                    "name": "runmatlab",
                    "description": "If true try to execute matlab",
                    "varname": "runmatlab",
                    "type": "boolean",
                    "default": True
                },
                bis_baseutils.getDebugParam()
            ],
        }


    def saveOutputs(self,inputparameters={}):
        f=super().saveOutputs(inputparameters);
        if f==False:
            return False;
    

        vals=self.innervalues;
        if vals['script'] is None:
            return true;
            
        
        matlabpath=vals['matlabpath'];
        clusteroutput=vals['clusteroutput'];

        if matlabpath is None:
            matlabpath=os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))+'/matlab';
            print('++++\t auto setting matlabpath to',matlabpath)
        
        if clusteroutput is None:
            clusteroutput=vals['script']+".nii.gz";
            print('++++\t auto setting clusteroutput to',clusteroutput)
        else:
            print('++++\t using clusteroutput as',clusteroutput);

        out="addpath('"+matlabpath+"');\n";
        out=out+"bispath();\n";
        out=out+"dist=bis_matrix();\n"
        out=out+"w=dist.loadbinary('"+self.outputs['output'].filename+"');\n";
        out=out+"indexmap=bis_image('"+self.outputs['indexmap'].filename+"');\n";
        out=out+"indexmap.print();";
        out=out+"output=bis_distmatrixparcellation(w,indexmap,"+str(vals['numclusters'])+","+str(vals['smoothness'])+");\n"
        out=out+"output.save('"+clusteroutput+"');\nexit\n";
        try:
        
            with open(vals['script'], 'w') as fp:
                fp.write(out);
            print('++++\t Saved matlab script in',vals['script']);
        except:
            print("Failed to open",vals['script']);
            return False;
        
        
        cmd="matlab -nodisplay -nosplash -nodesktop -r \"run('"+vals['script']+"');exit;\"";
        print('++++ to run matlab type:',cmd)
        if vals['runmatlab']:
            print(out);
            os.system(cmd);

        return True;       
        


    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: imageDistanceMatrix with vals', vals);


        if (vals['numpatches']>0):
            print('_____________________________________________');
            print('____ First extracting patches')

            patchExtractor=extractImagePatches();
            patchExtractor.execute({ 'input' : self.inputs['input'] },
                            { 'numpatches' : vals['numpatches'],
                              'patchsize'  : vals['patchsize'],
                              'threed' : vals['threed'],
                              'ordered' : False
                              });
            self.inputs['input']=patchExtractor.getOutputObject('output');
            self.inputs['mask']=0;
            print('_____________________________________________');
        
        
        paramobj= {
            'numthreads' : vals['numthreads'],
            'sparsity' : vals['sparsity'],
            'radius' : vals['radius'],
            'useradius' : self.parseBoolean(vals['useradius'])
            
        };

        out=bis_baseutils.getDynamicLibraryWrapper().computeImageDistanceMatrixWASM(self.inputs['input'],
                                                                                    self.inputs['mask'],
                                                                                    paramobj,
                                                                                    self.parseBoolean(vals['debug']));
        self.outputs['output']=bis_objects.bisMatrix();
        self.outputs['output'].create(out);      

        self.outputs['indexmap']=bis_baseutils.getDynamicLibraryWrapper().computeImageIndexMapWASM(self.inputs['mask'],
                                                                                                    self.parseBoolean(vals['debug']));

        # Propagate Orientation in this weird matrix to image thing
        self.outputs['indexmap'].affine=self.inputs['mask'].affine;
        
        self.innervalues=vals;


        return True
    



