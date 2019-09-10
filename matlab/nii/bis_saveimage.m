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

function res = bis_saveimage(bisimage,f,debug)

  
  if (nargin<2)
    res=0;
    return;
  end

  if (nargin<3)
    debug=2;
  end

  nii=make_nii(bisimage.img,bisimage.spacing(1:3));
  
  nii.hdr.dime.pixdim=[ 0 , bisimage.spacing(1), bisimage.spacing(2), bisimage.spacing(3), bisimage.spacing(4), bisimage.spacing(5), 1,1];
  nii.hdr.hist.qform_code=0;
  nii.hdr.hist.sform_code=1;
  nii.hdr.hist.srow_x = bisimage.affine(1:1,1:4);
  nii.hdr.hist.srow_y = bisimage.affine(2:2,1:4);
  nii.hdr.hist.srow_z = bisimage.affine(3:3,1:4);
  nii.hdr.hist.descrip='bisweb matlab';
  
  save_nii(nii,f);

  res=nii;
