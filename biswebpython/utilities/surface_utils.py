# Add code to load and save surfaces

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

    # load data
    data = PlyData.read(fileName)

    # extract vertices
    vertex = data['vertex']

    # get coordinates of vertices
    (x, y, z) = (vertex[t] for t in ('x', 'y', 'z'))

    # put vertices into a ndarray with shape 3xN
    vertices = np.stack([x, y, z], axis = 1)

    # get triangular face data
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

    # create the necessary PlyElement instances
    v = [tuple(vertices[t]) for t in range(len(vertices))]
    f = [tuple([faces[t], 127, 127, 127]) for t in range(len(faces))]
    v = np.asarray(v, dtype = [('x', 'f4'), ('y', 'f4'), ('z', 'f4')])
    f = np.asarray(f, dtype = [('vertex_indices', 'i4', (3,)), ('red', 'u1'), ('green', 'u1'), ('blue', 'u1')])

    el1 = PlyElement.describe(v, 'vertex')
    el2 = PlyElement.describe(f, 'face')

    # instantiate PlyData and serialize
    PlyData([el1, el2]).write(fileName)

    # print '*******************************'
    # print 'writing the .ply file to', '\"', fileName, '\"'
    # print '*******************************'




