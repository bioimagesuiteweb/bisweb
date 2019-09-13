
    #   meshAttributes.py
    #
    #   Created on: August 1, 2019
    #   Authors:   An Qu
    #             {an.qu} <at> yale.edu
    #


import numpy as np
from sklearn.preprocessing import normalize


def triangleMeshAttributes(vertices, faces, returnList):

    '''
    This function can be used for calculating the vertice and face attributes of a triangle mesh.


    Parameters:

        @vertices: numpy.ndarray
                   vertices of the triangle mesh
        @faces: numpy.ndarray
                faces of the triangle mesh
        @returnList is a bollean list: boolean list, the requested attributes are set to 1, otherwise 0
                                       the default order of mesh attributs in the returnList are:
                                       neighborList: list of the neighboring vertices of each vertex
                                       normalList: array of weighted vertex normal of each vertex
                                       faceCentroid: array of the face centroids
                                       faceNormal: array of the face normals
                                       area: array of the face areas
                                       vertexInFaces: dictionary of the vertices, containing the set of all faces that contain this vertex
                                       edgeDict: dictionary contains all edges in each face
                                       facesShareEdge: list of the dictionary
                                                       where key indicates another vertex index that can form an edge with the vertex whose index is the list index
                                                       value is the list of two faces indices sharing this edge
                                       obtuseOrNot: boolean list of mesh faces where obtuse triangle is true otherwise false
                                       boundaryVertices: set of vertices index that located on the boundary

    Returns:
        @resList: list
                  a list of requested face attributes, which also follows the order in retrunList

    Example:
        [faceCentroid, area, edgeDict] = triangleMeshAttributes(vertices, faces, [0,0,1,0,1,0,1,0,0,1])
        requested attributes: faceCentroid, area and edgeDict
        input: (vertices, faces, [0,0,1,0,1,0,1,0,0,1])
        output: [faceCentroid, area, edgeDict]
    '''


    N_total = vertices.shape[0]
    N_face = faces.shape[0]

    neighborList = [set() for _ in range(N_total)]
    normalList = np.zeros([N_total, 3])
    faceNormalW = np.zeros([N_face, 3])
    faceCentroid = np.zeros([N_face, 3])
    faceNormal = np.zeros([N_face, 3])
    area = np.zeros([N_face, 1])
    vertexInFaces = [set() for _ in range(N_total)]
    edgeDict = {}
    facesShareEdge = [{} for i in range(N_total)]
    obtuseOrNot = [False for i in range(N_face)]
    boundaryVertices = set()


    for face_idx in range(N_face):

        face = faces[face_idx]

        a_i = vertices[face[1]] - vertices[face[0]]
        b_i = vertices[face[2]] - vertices[face[0]]

        if returnList[0]:
            neighborList[face[0]].update({face[1], face[2]})
            neighborList[face[1]].update({face[0], face[2]})
            neighborList[face[2]].update({face[1], face[0]})


        faceNormalW[face_idx] = np.cross(a_i, b_i)


        if returnList[1]:
            normalList[face[0]] += faceNormalW[face_idx]
            normalList[face[1]] += faceNormalW[face_idx]
            normalList[face[2]] += faceNormalW[face_idx]


        if returnList[2]:
            faceCentroid[face_idx] = (vertices[face[0]] + vertices[face[1]] + vertices[face[2]]) / 3


        if returnList[6]:
            edgeDict[face_idx] = (a_i, b_i)


        if returnList[5]:
            vertexInFaces[face[0]].update({face_idx})
            vertexInFaces[face[1]].update({face_idx})
            vertexInFaces[face[2]].update({face_idx})


        if returnList[7] or returnList[9]:
            if face[1] in facesShareEdge[face[0]]:
                temp = facesShareEdge[face[0]][face[1]]
                temp.append(face_idx)
                facesShareEdge[face[0]][face[1]] = temp
            else:
                facesShareEdge[face[0]][face[1]] = [face_idx]

            if face[2] in facesShareEdge[face[0]]:
                temp = facesShareEdge[face[0]][face[2]]
                temp.append(face_idx)
                facesShareEdge[face[0]][face[2]] = temp
            else:
                facesShareEdge[face[0]][face[2]] = [face_idx]



            if face[0] in facesShareEdge[face[1]]:
                temp = facesShareEdge[face[1]][face[0]]
                temp.append(face_idx)
                facesShareEdge[face[1]][face[0]] = temp
            else:
                facesShareEdge[face[1]][face[0]] = [face_idx]

            if face[2] in facesShareEdge[face[1]]:
                temp = facesShareEdge[face[1]][face[2]]
                temp.append(face_idx)
                facesShareEdge[face[1]][face[2]] = temp
            else:
                facesShareEdge[face[1]][face[2]] = [face_idx]



            if face[1] in facesShareEdge[face[2]]:
                temp = facesShareEdge[face[2]][face[1]]
                temp.append(face_idx)
                facesShareEdge[face[2]][face[1]] = temp
            else:
                facesShareEdge[face[2]][face[1]] = [face_idx]

            if face[0] in facesShareEdge[face[2]]:
                temp = facesShareEdge[face[2]][face[0]]
                temp.append(face_idx)
                facesShareEdge[face[2]][face[0]] = temp
            else:
                facesShareEdge[face[2]][face[0]] = [face_idx]


            if returnList[8]:
                if typeObtuse(vertices[face[0]], vertices[face[1]], vertices[face[2]]):
                    obtuseOrNot[face_idx] = True


    if returnList[1]:
        normalList = normalize(normalList, axis=1)

    if returnList[3] or returnList[4]:
        faceNormal = normalize(faceNormalW, axis=1)

    if returnList[4]:
        area = np.vstack(np.multiply(faceNormalW, faceNormal).sum(axis=1) / 2)

    if returnList[9]:
        for idx in range(N_total):
            fsev = facesShareEdge[idx].values()
            for v in fsev:
                if len(v) == 1:
                    boundaryVertices.update([idx])
                    break


    attributes = [neighborList, normalList, faceCentroid, faceNormal, area, vertexInFaces, edgeDict, facesShareEdge, obtuseOrNot, boundaryVertices]

    resList = [attributes[idx] for idx, value in enumerate(returnList) if value == 1]

    return resList




def typeObtuse(v1, v2, v3):

    # Using Pythagoras theorem
    edge1 = np.linalg.norm(v1 - v3)
    edge2 = np.linalg.norm(v2 - v3)
    edge3 = np.linalg.norm(v1 - v2)

    [var1,var2,largest] = sorted([edge1, edge2, edge3])

    if (largest) ** 2 > ((var1 ** 2 + (var2) ** 2)):
        return True
    else:
        return False





