#!/usr/bin/env python3


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


        #   jsonFileTool.py
        #
        #   Created on: Sep 15, 2019
        #   Authors:   An Qu
        #             {an.qu} <at> yale.edu
        #


import numpy as np
import json



def readJsonFile(fileName):

    '''
    This function can be used for reading a json format mesh file.


    Parameters:
        @fileName: string
                   input file path and name

    Returns:
        @vertices: numpy.ndarray
                   vertices of the input mesh
        @faces: numpy.ndarray
                faces of the input mesh
        @label: numpy.ndarray

   '''

    json_data = open(fileName).read()
    obj = json.loads(json_data)

    vertices = np.reshape(obj['points'], (-1, 3))
    faces = np.reshape(obj['triangles'], (-1, 3))
    labels = np.asarray(obj['indices'])

    return vertices, faces, labels


