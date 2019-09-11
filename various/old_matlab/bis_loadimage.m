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

function bisimage = bis_loadimage(f,debug)

  if ~exist('niftiinfo')
     disp('BISWEB ERROR -- You need a newer version of Matlab -- 2017b or later to use this function');
     bisimage=0;
     return;
  end
  
  if (nargin<1)
    bisimage=0;
    return;
  end

  if (nargin<2)
    debug=2;
  end

  h=niftiinfo(f);
  bisimage=load_untouch_nii(f,[],[],[],[],[],[]);
  bisimage.desc='Bisweb matlab image';
  bisimage.header=h;
  bisimage.affine=h.Transform.T;
  bisimage.spacing=h.PixelDimensions';
  bisimage.orcode=bis_getorientationcode(bisimage.affine,bisimage.spacing);

  if (debug>0)
    disp([ '___ Loaded image from ',h.Filename])
    if (debug>1)
        disp(['      dimensions=',mat2str(h.ImageSize),' spacing=',mat2str(h.PixelDimensions),' orientation=',bisimage.orcode,' type=',class(bisimage.img)]);
        if (debug>2)
            disp(['      matrix=',mat2str(bisimage.affine)]);
        end
    end
  end