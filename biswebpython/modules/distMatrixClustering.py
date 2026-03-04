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

import numpy as np

import biswebpython.core.bis_basemodule as bis_basemodule
import biswebpython.core.bis_baseutils as bis_baseutils
import biswebpython.core.bis_objects as bis_objects

from biswebpython.utilities.spectral_clustering import build_similarity_matrix_from_sparse_distances
from biswebpython.utilities.spectral_clustering import discretize_eigenvectors
from biswebpython.utilities.spectral_clustering import labels_to_indexmap_image
from biswebpython.utilities.spectral_clustering import normalized_cut_eigenvectors


class distMatrixClustering(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__()
        self.name = 'distMatrixClustering'

    def createDescription(self):

        return {
            "name": "cluster distance matrix",
            "description": "Cluster a sparse distance matrix using normalized cuts",
            "author": "Xenios Papademetris and Xilin Shen",
            "version": "1.0",
            "inputs": [
                {
                    "type": "matrix",
                    "name": "Input Distance Matrix",
                    "description": "Sparse triplet or quadruplet distance matrix",
                    "varname": "input",
                    "shortname": "i",
                    "required": True
                },
                {
                    "type": "image",
                    "name": "IndexMap Image",
                    "description": "Optional indexmap to create a clustered image",
                    "varname": "indexmap",
                    "shortname": "m",
                    "required": False,
                },
            ],
            "outputs": [
                {
                    "type": "matrix",
                    "name": "Output Labels",
                    "description": "The output labels as an N x 1 matrix",
                    "varname": "output",
                    "shortname": "o",
                    "required": True,
                    "extension": ".binmatr"
                },
                {
                    "type": "image",
                    "name": "Output Label Image",
                    "description": "Optional clustered image generated from the indexmap",
                    "varname": "outputimage",
                    "shortname": "x",
                    "required": False,
                    "extension": ".nii.gz"
                },
            ],
            "params": [
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
                    "name": "Smoothness",
                    "description": "Weight applied to column 4 if present",
                    "type": "float",
                    "default": 0.0,
                    "lowbound": 0.0,
                    "highbound": 100.0,
                    "varname": "smoothness"
                },
                {
                    "name": "Sigma",
                    "description": "Kernel scale; <=0 computes the median distance",
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
        print('oooo invoking: distMatrixClustering with vals', vals)

        dist = self.inputs['input'].data_array
        indexmap = self.inputs['indexmap']
        debug = self.parseBoolean(vals['debug'])

        n_vertices = None
        if indexmap is not None:
            n_vertices = int(np.max(indexmap.data_array))

        w, sigma_used = build_similarity_matrix_from_sparse_distances(dist,
                                                                      smoothness=vals['smoothness'],
                                                                      sigma=vals['sigma'],
                                                                      n_vertices=n_vertices,
                                                                      debug=debug)

        eigvecs, eigvals = normalized_cut_eigenvectors(w,
                                                       vals['numclusters'],
                                                       offset=vals['offset'],
                                                       maxiter=vals['maxiter'],
                                                       tolerance=vals['tolerance'],
                                                       debug=debug)

        discrete, labels, objective = discretize_eigenvectors(eigvecs[:, 0:vals['numclusters']],
                                                              random_seed=vals['randomseed'],
                                                              debug=debug)

        if debug:
            print('++++ sigma_used=', sigma_used, ' objective=', objective, ' discrete_shape=', discrete.shape)
            print('++++ eigenvalues=', eigvals)

        labels = labels.astype(np.int32).reshape((labels.shape[0], 1))
        self.outputs['output'] = bis_objects.bisMatrix()
        self.outputs['output'].create(labels)

        if indexmap is not None:
            self.outputs['outputimage'] = labels_to_indexmap_image(labels[:, 0], indexmap)
            self.outputs['outputimage'].affine = indexmap.affine

        return True
