
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
        #             {an.qu} <at> yale.edu
        #


from biswebpython.utilities.plyfile import PlyData, PlyElement
import numpy as np



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

    labels = np.zeros([1, vertices.shape[0]])


    return vertices.astype('float64'), triangles, labels






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
    v = np.asarray(v, dtype = [('x', 'float64'), ('y', 'float64'), ('z', 'float64')])
    f = np.asarray(f, dtype = [('vertex_indices', 'i4', (3,)), ('red', 'u1'), ('green', 'u1'), ('blue', 'u1')])

    el1 = PlyElement.describe(v, 'vertex')
    el2 = PlyElement.describe(f, 'face')

    PlyData([el1, el2]).write(fileName)





def writePlyFileWithLabels(vertices, faces, labels, fileName, n = 280, map = 'gist_ncar'):

    '''
    This function can be used for writing a labeled mesh to a ply file.


    Parameters:
        @vertices: numpy.ndarray
                   vertices of the input mesh
        @faces: numpy.ndarray
                faces of the input mesh
        @labels: numpy.ndarray
                 labels for each vertex
        @fileName: string
                   output file path and name
        @n: int
            total number of the functional regions

    '''

    # create the necessary PlyElement instances
    v = [tuple(vertices[t]) for t in range(len(vertices))]
    f = [tuple() for t in range(len(faces))]

    import matplotlib as mpl
    norm  = mpl.colors.Normalize(vmin = 1, vmax = n)
    import matplotlib.pyplot as plt
    cmap = plt.cm.get_cmap(map)

    for idx in range(len(faces)):
        face = faces[idx]
        c = list(labels[face])
        if c.count(c[0]) > 1:
            rgba = cmap(norm(c[0]))
        else:
            rgba = cmap(norm(c[1]))
        f[idx] = tuple([face, int(rgba[0]*255), int(rgba[1]*255), int(rgba[2]*255)])

    v = np.asarray(v, dtype = [('x', 'float64'), ('y', 'float64'), ('z', 'float64')])
    f = np.asarray(f, dtype = [('vertex_indices', 'i4', (3,)), ('red', 'u1'), ('green', 'u1'), ('blue', 'u1')])

    el1 = PlyElement.describe(v, 'vertex')
    el2 = PlyElement.describe(f, 'face')

    # instantiate PlyData and serialize
    PlyData([el1, el2]).write(fileName)


