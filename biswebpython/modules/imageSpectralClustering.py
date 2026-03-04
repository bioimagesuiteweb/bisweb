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
import numpy as np

from biswebpython.modules.distMatrixClustering import distMatrixClustering
from biswebpython.modules.extractImagePatches import extractImagePatches


class imageSpectralClustering(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__()
        self.name = 'imageSpectralClustering'

    def createDescription(self):

        return {
            "name": "compute spectral image clustering",
            "description": "Compute an image distance matrix and cluster it directly in Python",
            "author": "Xenios Papademetris and Xilin Shen",
            "version": "1.0",
            "inputs": [
                {
                    "type": "image",
                    "name": "Input Image",
                    "description": "The input (timeseries) image",
                    "varname": "input",
                    "shortname": "i",
                    "required": True
                },
                {
                    "type": "image",
                    "name": "Objectmap Image",
                    "description": "The objectmap/mask image",
                    "varname": "mask",
                    "shortname": "m",
                    "required": False
                },
            ],
            "outputs": [
                {
                    "type": "image",
                    "name": "Clustered Image",
                    "description": "The clustered output image",
                    "varname": "output",
                    "shortname": "o",
                    "required": True,
                    "extension": ".nii.gz"
                },
                {
                    "type": "matrix",
                    "name": "Output Labels",
                    "description": "Cluster labels as an N x 1 matrix",
                    "varname": "labels",
                    "shortname": "l",
                    "required": False,
                    "extension": ".binmatr"
                },
                {
                    "type": "matrix",
                    "name": "Output Distance Matrix",
                    "description": "The computed sparse distance matrix",
                    "varname": "distancematrix",
                    "shortname": "d",
                    "required": False,
                    "extension": ".binmatr"
                },
                {
                    "type": "image",
                    "name": "IndexMap Image",
                    "description": "The output indexmap image",
                    "varname": "indexmap",
                    "shortname": "x",
                    "required": False,
                    "extension": ".nii.gz"
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
                    "description": "Number of patches to extract (default=0 uses the whole image)",
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
                    "description": "Patch size (in voxels) if using patches",
                    "type": "int",
                    "default": 32,
                    "lowbound": 2,
                    "highbound": 256,
                    "varname": "patchsize"
                },
                {
                    "name": "3d",
                    "description": "If true use 3d patches",
                    "priority": 1000,
                    "advanced": False,
                    "gui": "check",
                    "varname": "threed",
                    "type": "boolean",
                    "default": False,
                },
                {
                    "name": "Sigma",
                    "description": "Kernel scale override for clustering; <=0 uses the median distance",
                    "type": "float",
                    "default": -1.0,
                    "lowbound": -1.0,
                    "highbound": 100000.0,
                    "varname": "sigma"
                },
                {
                    "name": "Offset",
                    "description": "Diagonal regularization for normalized cuts",
                    "type": "float",
                    "default": 0.5,
                    "lowbound": 0.0,
                    "highbound": 100.0,
                    "varname": "offset"
                },
                {
                    "name": "Max Iterations",
                    "description": "Maximum eigensolver iterations",
                    "type": "int",
                    "default": 100,
                    "lowbound": 1,
                    "highbound": 10000,
                    "varname": "maxiter"
                },
                {
                    "name": "Tolerance",
                    "description": "Eigensolver tolerance",
                    "type": "float",
                    "default": 1e-6,
                    "lowbound": 1e-12,
                    "highbound": 1.0,
                    "varname": "tolerance"
                },
                {
                    "name": "Random Seed",
                    "description": "Random seed for discretization initialization",
                    "type": "int",
                    "default": 0,
                    "lowbound": 0,
                    "highbound": 2147483647,
                    "varname": "randomseed"
                },
                bis_baseutils.getDebugParam()
            ],
        }

    def directInvokeAlgorithm(self, vals):
        print('oooo invoking: imageSpectralClustering with vals', vals)

        input_image = self.inputs['input']
        mask_image = self.inputs['mask']

        if vals['numpatches'] > 0:
            print('_____________________________________________')
            print('____ First extracting patches')

            patch_extractor = extractImagePatches()
            patch_extractor.execute({'input': input_image},
                                   {'numpatches': vals['numpatches'],
                                    'patchsize': vals['patchsize'],
                                    'threed': vals['threed'],
                                    'ordered': False})
            input_image = patch_extractor.getOutputObject('output')
            mask_image = None
            print('_____________________________________________')

        debug = self.parseBoolean(vals['debug'])
        if mask_image is None:
            dims = [int(input_image.dimensions[0]), int(input_image.dimensions[1]), int(input_image.dimensions[2])]
            if dims[2] < 1:
                dims[2] = 1
            mask_data = np.ones(tuple(dims), dtype=np.int32)
            mask_image = bis_objects.bisImage()
            mask_image.create(mask_data, input_image.spacing, input_image.affine)

        paramobj = {
            'numthreads': vals['numthreads'],
            'sparsity': vals['sparsity'],
            'radius': vals['radius'],
            'useradius': self.parseBoolean(vals['useradius'])
        }

        dist = bis_baseutils.getDynamicLibraryWrapper().computeImageDistanceMatrixWASM(input_image,
                                                                                       mask_image,
                                                                                       paramobj,
                                                                                       debug)
        dist_obj = bis_objects.bisMatrix()
        dist_obj.create(dist)

        indexmap = bis_baseutils.getDynamicLibraryWrapper().computeImageIndexMapWASM(mask_image, debug)
        indexmap.affine = mask_image.affine

        cluster_module = distMatrixClustering()
        cluster_module.execute({'input': dist_obj, 'indexmap': indexmap},
                               {'numclusters': vals['numclusters'],
                                'smoothness': vals['smoothness'],
                                'sigma': vals['sigma'],
                                'offset': vals['offset'],
                                'maxiter': vals['maxiter'],
                                'tolerance': vals['tolerance'],
                                'randomseed': vals['randomseed'],
                                'debug': vals['debug']})

        self.outputs['output'] = cluster_module.getOutputObject('outputimage')
        self.outputs['labels'] = cluster_module.getOutputObject('output')
        self.outputs['distancematrix'] = dist_obj
        self.outputs['indexmap'] = indexmap
        return True
