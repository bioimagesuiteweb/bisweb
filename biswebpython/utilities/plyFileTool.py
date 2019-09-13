
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



        #   plyFileTool.py
        #
        #   Created on: August 5, 2019
        #   Authors:   An Qu
        #             {anq} <at> kth.se
        #


from biswebpython.utilities.plyfile import PlyData, PlyElement
import numpy as np
import IPython


def readPlyFile(fileName):

    '''
    This function can be used for reading a ply format mesh file.


    Parameters:
        @fileName: string
                   input file path and name

    Returns:
        @vertices: numpy.ndarray
                   vertices of the input mesh
        @faces: numpy.ndarray
                   faces of the input mesh

    '''

    data = PlyData.read(fileName)

    vertex = data['vertex']

    (x, y, z) = (vertex[t] for t in ('x', 'y', 'z'))

    vertices = np.stack([x, y, z], axis = 1)

    try:
        tri_data = data['face'].data['vertex_index']
    except:
        tri_data = data['face'].data['vertex_indices']

    triangles = np.vstack(tri_data)

    return vertices, triangles






def writePlyFile(vertices, faces, fileName):

    '''
    This function can be used for writing a mesh to a ply file.


    Parameters:
        @vertices: numpy.ndarray
                   vertices of the input mesh
        @faces: numpy.ndarray
                   faces of the input mesh
        @fileName: string
                   output file path and name

    '''

    v = [tuple(vertices[t]) for t in range(len(vertices))]
    f = [tuple([faces[t], 127, 127, 127]) for t in range(len(faces))]
    v = np.asarray(v, dtype = [('x', 'f4'), ('y', 'f4'), ('z', 'f4')])
    f = np.asarray(f, dtype = [('vertex_indices', 'i4', (3,)), ('red', 'u1'), ('green', 'u1'), ('blue', 'u1')])

    el1 = PlyElement.describe(v, 'vertex')
    el2 = PlyElement.describe(f, 'face')

    PlyData([el1, el2]).write(fileName)





