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



    #   smoothInflationOperator.py
    #
    #   Created on: August 5, 2019
    #   Authors:   An Qu
    #             {an.qu} <at> yale.edu
    #


from biswebpython.utilities.plyFileTool import *
from biswebpython.utilities.meshAttributes import *
import os
import pathlib
import numpy as np
import math
import sys
from copy import deepcopy


def updateVertices(vertices, faces, vertexInFaces, lamda):

    '''
    This function can be used for inflating a mesh surface by using relaxation operator.
    The inflated mesh will patially flattened and preseve the correctly topology meanwhile.


    Parameters:
        @vertices: numpy.ndarray
                   vertices of the triangle mesh
        @faces: numpy.ndarray
                faces of the triangle mesh
        @lamda: int
                smooth speed parameter lamda, the default value is range from 0 to 1
                the smaller lamda is, the slower speed of smoothness is

    Returns:
        @new_vertices: numpy.ndarray
                       vertices of the updated trangule mesh

    '''


    N_vertices = vertices.shape[0]
    [faceCentroid, area] = triangleMeshAttributes(vertices, faces, [0,0,1,0,1,0,0,0,0,0])
    new_vertices = np.zeros([N_vertices, 3])

    for vertex_idx in range(N_vertices):

        sumArea = 0
        weightedCenter = 0

        faceSets = deepcopy(vertexInFaces[vertex_idx])

        while bool(faceSets):
            face_idx = faceSets.pop()
            sumArea += area[face_idx]
            weightedCenter += area[face_idx] * faceCentroid[face_idx]

        if not sumArea:
            new_vertices[vertex_idx] = vertices[vertex_idx]
            continue

        else:
            averageVertex = weightedCenter / sumArea
            new_vertices[vertex_idx] = (1 - lamda) * vertices[vertex_idx] + lamda * averageVertex

    return new_vertices





def meanCurvature(vertices, faces, vertexInFaces, facesShareEdge, boundaryVertices):

    '''
    This function can be used for evaluating the L2 norm mean curvature of a mesh surface.
    The evaluation is an approximation for the mean curvature by using finite element.


    Parameters:
        @vertices: numpy.ndarray
                   vertices of the triangle mesh
        @faces: numpy.ndarray
                faces of the triangle mesh

    Returns:
        @K: int
            L2 norm mean curvature of the mesh surface

    '''


    N_vertices = vertices.shape[0]
    [area, obtuseOrNot]= triangleMeshAttributes(vertices, faces, [0,0,0,0,1,0,0,0,1,0])
    K = 0
    K_i = 0

    for vertex_i in range(N_vertices):

        if vertex_i in boundaryVertices:
            continue

        area_mixed = 0
        K_i_normal = np.zeros(3)


        faceSet = deepcopy(vertexInFaces[vertex_i])

        while bool(faceSet):

            face_idx = faceSet.pop()
            face = list(faces[face_idx])

            v_i = vertices[vertex_i]
            face.remove(vertex_i)
            v_1 = vertices[face[0]]
            v_2 = vertices[face[1]]

            edge1 = v_i - v_1
            edge2 = v_i - v_2
            edge3 = v_2 - v_1

            segment1 = np.linalg.norm(edge1)
            segment2 = np.linalg.norm(edge2)
            segment3 = np.linalg.norm(edge3)


            if obtuseOrNot[face_idx]:

                [var1,var2,largest] = sorted([segment1, segment2, segment3])

                if largest == segment3:
                    area_mixed += area[face_idx] / 2
                else:
                    area_mixed += area[face_idx] / 4

            else:
                if not area[face_idx]:
                    continue

                cot_Q = np.dot(edge3, edge1) / float(area[face_idx]) / 2
                cot_R = np.dot(-edge3, edge2) / float(area[face_idx]) / 2
                area_voronoi = (segment2 ** 2 * cot_Q + segment1 ** 2 * cot_R) / 8
                area_mixed += area_voronoi

        if not area_mixed:
            continue


        edges = deepcopy(facesShareEdge[vertex_i])

        while bool(edges):

            vertex_jDict = edges.popitem()
            if len(vertex_jDict[1]) == 1:
                continue
            vertex_j = vertex_jDict[0]
            face1_idx = vertex_jDict[1][0]
            face2_idx = vertex_jDict[1][1]

            sharedEdge = vertices[vertex_i] - vertices[vertex_j]
            list1 = list(faces[face1_idx])
            list2 = list(faces[face2_idx])
            list1.remove(vertex_i)
            list1.remove(vertex_j)
            list2.remove(vertex_i)
            list2.remove(vertex_j)

            v_1 = vertices[list1[0]]
            v_2 = vertices[list2[0]]

            a1 = vertices[vertex_j] - v_1
            b1 = vertices[vertex_i] - v_1
            a2 = vertices[vertex_j] - v_2
            b2 = vertices[vertex_i] - v_2

            if not area[face1_idx]:
                cot_alpha = 0

            elif not area[face2_idx]:
                cot_beta = 0

            else:
                cot_alpha = np.dot(a1, b1) / float(area[face1_idx]) / 2
                cot_beta = np.dot(a2, b2) / float(area[face2_idx]) / 2

            K_i_normal += (cot_alpha + cot_beta) * sharedEdge


        K_i += np.linalg.norm(K_i_normal) / area_mixed / 2

    K = math.sqrt( K_i / 4 / math.pi)


    return K



def relaxationOperator(vertices, faces, labels, debug, lamda = 0.5, itr_min = 51, itr_max = 301):

    '''
    This function can be used for implementing suface smooth inflation.


    Parameters:
        @vertices: numpy.ndarray
                   vertices of the triangle mesh
        @faces: numpy.ndarray
                faces of the triangle mesh
        @labels: numpy.ndarray
                 vertices labels that present the functional region for each vertex
        @debug: boolean
                in the debug mode, all inflated surfaces during smooth inflation
                will be saved in the same directory.
        @lamda: int
                smooth speed parameter lamda, default value is from 0 to 1
        @itr_min: int
                  the minimum iterations for finishing the smooth iteration
                  this parameter should be tuned with the value of lamda
        @itr_min: int
                  the maximum iterations for finishing the smooth iteration
                  this parameter should be tuned with the value of lamda

    Returns:
        @vertices: numpy.ndarray
                   vertices of the triangle mesh

    '''
    # labels = np.zeros([1, labels.shape[0]])

    stop = 100000
    fileN = 1

    [vertexInFaces, facesShareEdge, boundaryVertices] = triangleMeshAttributes(vertices, faces, [0,0,0,0,0,1,0,1,0,1])

    if debug:

        outputInflationFilesPath = sys.argv[sys.argv.index('-o')+1].split('.ply')[0] + '/'
        if not os.path.exists(outputInflationFilesPath):
            pathlib.Path(outputInflationFilesPath).mkdir(parents = True)
        print ("start surface inflation using relaxation operator")


    while fileN < itr_min:

        if debug:
            if fileN > 1:
                print ('*******************************', fileN - 1, '*******************************')
                outputFileName = outputInflationFilesPath + 'inflated_' + str(fileN-1) + '.ply'
                if bool(labels.any()):
                    writePlyFileWithLabels(vertices, faces, labels, outputFileName)
                else:
                    writePlyFile(vertices, faces, outputFileName)

        fileN += 1

        # smooth inflation
        vertices = updateVertices(vertices, faces, vertexInFaces, lamda)



    beta = meanCurvature(vertices, faces, vertexInFaces, facesShareEdge, boundaryVertices)

    while fileN < itr_max and beta < stop:

        if debug:
            print ('*******************************', fileN - 1, '*******************************')
            print ("The mean curvature of the smooth inflated cortical surface is: ", beta)
            outputFileName = outputInflationFilesPath + 'inflated_' + str(fileN-1) + '.ply'
            if bool(labels.any()):
                writePlyFileWithLabels(vertices, faces, labels, outputFileName)
            else:
                writePlyFile(vertices, faces, outputFileName)

        fileN += 1

        stop = beta

        # smooth inflation
        vertices = updateVertices(vertices, faces, vertexInFaces, lamda)

        # evaluate the mean curvature of the inflated surface
        beta = meanCurvature(vertices, faces, vertexInFaces, facesShareEdge, boundaryVertices)

    return vertices


