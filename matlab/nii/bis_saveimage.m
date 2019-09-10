% LICENSE
% 
% _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
% 
% BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
% 
% - you may not use this software except in compliance with the License.
% - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
% 
% __Unless required by applicable law or agreed to in writing, software
% distributed under the License is distributed on an "AS IS" BASIS,
% WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
% See the License for the specific language governing permissions and
% limitations under the License.__
% 
% ENDLICENSE

% -----------------------------------------------------
%
% Main Function
% 
% -----------------------------------------------------
% bisimage needs four fileds
%    .img --> the raw voxels
%    .spacing -> the voxel sizes
%    .affine -> the 4x4 affine matrix specifying orientation


function nii = bis_saveimage(bisimage,f)

    if (nargin<2)
        nii=0;
        return;
    end

	% Make sure spacing is a 5-vector
	v=max(size(bisimage.spacing));
	spacing=[1.0,1.0,1.0,1.0,1.0];
	spacing(1:v)=bisimage.spacing;
	
	% Fix affine to agree with spacing in spacing
	affine=eye(4,4);
	affine(1:4,4:4)=bisimage.affine(1:4,4:4);
    oldsp=[ norm(bisimage.affine(1:3,1:1)),norm(bisimage.affine(1:3,2:2)),norm(bisimage.affine(1:3,3:3))]';
    for col=1:3
        for row=1:3,
            affine(row,col)=bisimage.affine(row,col)/oldsp(col)*spacing(col);
        end
    end

	% Create header structure
    nii=make_nii(bisimage.img,spacing(1:3));
  
	% Replace stuff in header structure to make this behave
    nii.hdr.dime.pixdim=[ 0 , spacing(1), spacing(2), spacing(3), spacing(4), spacing(5), 1,1];
    nii.hdr.hist.qform_code=0;
    nii.hdr.hist.sform_code=1;
    nii.hdr.hist.srow_x = affine(1:1,1:4);
    nii.hdr.hist.srow_y = affine(2:2,1:4);
    nii.hdr.hist.srow_z = affine(3:3,1:4);
    nii.hdr.hist.descrip='bisweb matlab';
  
	% Save
    save_nii(nii,f);
