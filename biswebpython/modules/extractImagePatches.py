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
import numpy as np;

class extractImagePatches(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='extractImagePatches';
   
    def createDescription(self):
        
        return {
            "name": "denoise image using an eigenspace",
            "description": "Given an image and an eigenvector image denoise the input",
            "author": "Xenios Papademetris and Xilin Shen",
            "version": "1.0",
            "inputs": [
                {
                    "type": "image",
                    "name": "Input image",
                    "description": "The inputimage",
                    "varname": "input",
                    "shortname" : "i",
                    "required": True
                },
                {
                    "type": "matrix",
                    "name": "Input Patch indices",
                    "description": "The indices used to extract the patches", 
                    "varname": "indices",
                    "shortname": "p",
                    "required": False,
                    "extension" : ".matr",
                }
            ],
            "outputs": [
                bis_baseutils.getImageToImageOutputs('The output eigenvector image')[0],
                {
                    "type": "matrix",
                    "name": "Output Patch indices",
                    "description": "The indices used to extract the patches", 
                    "varname": "outindices",
                    "shortname": "",
                    "required": False,
                    "extension" : ".matr",
                }

            ],
            "params": [
                {
                    "name": "Numpatches",
                    "description": "Number of patches to extract (default=16384)",
                    "type": "int",
                    "default": 16384,
                    "lowbound": 16,
                    "highbound": 65536,
                    "varname": "numpatches"
                },
                {
                    "name": "Patchsize",
                    "description": "Patch size (in voxels) (default=32)",
                    "type": "int",
                    "default": 32,
                    "lowbound": 2,
                    "highbound": 256,
                    "varname": "patchsize"
                },
                {
                    "name": "3d",
                    "description": "if true 3d patches (default=false)",
                    "priority": 1000,
                    "advanced": False,
                    "gui": "check",
                    "varname": "threed",
                    "type": 'boolean',
                    "default": False,
                },
                {
                    "name": "ordered",
                    "description": "if true ordered patches (else random)",
                    "priority": 1000,
                    "advanced": False,
                    "gui": "check",
                    "varname": "ordered",
                    "type": 'boolean',
                    "default": False,
                },
                {
                    "name": "Stride",
                    "description": "Stride size (in voxels) (default=16). Used when using ordered patches",
                    "type": "int",
                    "default": 16,
                    "lowbound": 2,
                    "highbound": 256,
                    "varname": "stride"
                },
                bis_baseutils.getDebugParam()
            ],
        }

    # John's patch code
    def getRandomPatchIndices(self,dimensions, patch_size, threed=True,num_patches=1, padding='VALID'):
        """Get data patch samples from a regularly sampled grid

        Create a list of indices to access patches from the tensor of data, where each 
        row of the index list is a list of array of indices.

        Returns:
        indices: the index of the data denoting the top-left corner of the patch
        """

        dims=2;
        if (threed):
            dims=3;
        
        indices = np.zeros((num_patches,4), dtype=np.int32)
        numframes=dimensions[3];

        data_limits = []
        for i in range(0,dims):
            data_limits += [dimensions[i] ];

        if padding is 'VALID':
            for i in range(0,dims):
                data_limits[i] -= patch_size[i]

        for j in range(0,num_patches):
            for i in range(0,dims):
                indices[j,i] = np.random.random_integers(0,data_limits[i])
            if (not threed):
                indices[j,2] = np.random.random_integers(0,dimensions[2]-1);
            if (numframes>0):
                indices[j,3]=np.random.random_integers(0,numframes-1);
        return indices



    def getOrderedPatchIndices(self,dimensions,threed,patch_size,stride):

        """Get image patches from specific positions in the image.

          Returns:
          patches: the image patches as a 4D numpy array
          indices: the indices of the image denoting the top-left corner of the patch in the image
             (just pass through really)

          """


        inc=[ stride[0],stride[1], stride[2],1 ];
        if (not threed):
            inc[2]=1;

        print('____ Checking ... old Increments=',inc);
        for i in range (0,2):
            if (inc[i]>1):
                s=int(dimensions[i]/inc[i])+1;
                l=int(dimensions[i]/patch_size[i]+1);
                maxd=dimensions[i]-patch_size[i];
                s2=int(maxd/l);
                inc[i]=s2;
        print('____ Fixed new Increments=',inc)
            
        num_patches=0;
        idx_all = [];
        for t in range(0,dimensions[3]):
            for k in range(0,dimensions[2],inc[2]):
                ka=k;
                if (ka+patch_size[2] >= dimensions[2]):
                    ka=dimensions[2]-patch_size[2]-1;
                
                for j in range(0,dimensions[1]-patch_size[1],inc[1]):
                    ja=j;
                    if (ja+patch_size[1] >= dimensions[1]):
                        ja=dimensions[1]-patch_size[1]-1;

                    for i in range(0,dimensions[0]-patch_size[0],inc[0]):
                        ia=i;
                        if (ia+patch_size[0] >= dimensions[0]):
                            ia=dimensions[0]-patch_size[0]-1;

                        elem=[  ia,ja,ka,t ];
                        if (elem not in idx_all):
                            idx_all += elem;
                            num_patches+=1;


        indices = np.zeros((num_patches,4), dtype=np.int32)
        print('____ num_patches=',num_patches)
        for row in range(0,num_patches):
            for col in range(0,4):
                indices[row][col]=idx_all[row*4+col];

        return indices;

    def getPatches(self,idata,indices,dimensions,threed,patch_size):

        """Get image patches from specific positions in the image.

          Returns:
          patches: the image patches as a 4D numpy array
          indices: the indices of the image denoting the top-left corner of the patch in the image
             (just pass through really)
          """
        dims =2;
        if (threed):
            dims=3;
        numframes=dimensions[3];

            
        num_patches = indices.shape[0]
        patches_shape = (num_patches,)
        for i in range(0,dims):
            patches_shape += (patch_size[i],)
        if (not threed):
            patches_shape += (1,)

        print('____ Initial patches Shape=',patches_shape);
            
        patches = np.zeros(patches_shape, idata.dtype);

        
        for i in range(0,num_patches):
            # Build the tuple of slicing indices
            idx = ()
            for j in range(0,dims):
                idx += (slice(indices[i,j],indices[i,j]+patch_size[j]),)
            
            if (not threed):
                idx += (slice(indices[i,2],indices[i,2]+1),);

            # Frame part
            if (numframes>1):
                idx += (slice(indices[i,3],indices[i,3]+1),);

            patches[i,...]=np.squeeze(idata[idx],axis=3);

            
        tmp=patches.astype(patches.dtype)
        shp=tmp.shape;
        out=np.transpose(tmp,(1,2,3,0));
        print('____ Reordered patches shape=',out.shape);
        return out;




    
    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);

        psize=vals['patchsize'];
        numpatches=vals['numpatches'];
        threed=self.parseBoolean(vals['threed']);
        stride=vals['stride'];
        ordered=self.parseBoolean(vals['ordered']);
        idata=self.inputs['input'].data_array;
        dimensions=self.inputs['input'].dimensions;
        patchsize=[ psize,psize,psize];
        
        if (self.inputs['indices'] is not None):
            indices=self.inputs['indices'].data_array.astype(np.int32);
            print('++++ Using precomputed patch indices');
        elif (not ordered):
            indices=self.getRandomPatchIndices(dimensions,patchsize,threed,numpatches);
            print('++++ created new random patch indices');
        else:
            indices=self.getOrderedPatchIndices(dimensions,threed,patchsize, [ stride,stride,stride  ]);
            print('++++ created new ordered patch indices');

        l=len(idata.shape);
        while l<4:
            idata=np.expand_dims(idata,axis=l);
            l=len(idata.shape);
            
        print('____ Last Patch= [',indices[indices.shape[0]-1][0],indices[indices.shape[0]-1][1],indices[indices.shape[0]-1][2],indices[indices.shape[0]-1][3],']');
        print('____ Dimensions=',dimensions,'Indices shape',indices.shape,' data.shape=',idata.shape);

        patches=self.getPatches(idata,indices,dimensions,threed,patchsize);

        self.outputs['output']=bis_objects.bisImage();
        self.outputs['output'].create(patches, self.inputs['input'].spacing, self.inputs['input'].affine);

        self.outputs['outindices']=bis_objects.bisMatrix();
        self.outputs['outindices'].create(indices);


        
        return True
    



