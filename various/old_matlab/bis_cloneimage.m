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

function output = bis_cloneimage(input,dims,spacing,tp,debug)

    if (nargin<1)
        output=0;
        return;
    end

  
    if (nargin<2)
        dims=size(input);
    end

    if (nargin<3)
        spacing=input.spacing;
    end

    if (max(size(spacing))<1)
        spacing=input.spacing;
    end

    if (nargin<4)
        tp=class(input.img)
    end

    if (nargin<5)
        debug=0
    end

    % Make sure spacing is a 5-vector
    temp=spacing
    v=max(size(temp));
    spacing=[1.0,1.0,1.0,1.0,1.0];
    spacing(1:v)=temp;
	
	% Fix affine to agree with spacing in spacing
	affine=eye(4,4);
	affine(1:4,4:4)=bisimage.affine(1:4,4:4);
    oldsp=[ norm(bisimage.affine(1:3,1:1)),norm(bisimage.affine(1:3,2:2)),norm(bisimage.affine(1:3,3:3))]';
    for col=1:3
        for row=1:3,
            affine(row,col)=bisimage.affine(row,col)/oldsp(col)*spacing(col);
        end
    end

    output.desc='Bisweb matlab image';

    % Fix affine matrix to agree with spacing
    output.affine=input.affine;
    oldsp=[ norm(input.affine(1:3,1:1)),norm(input.affine(1:3,2:2)),norm(input.affine(1:3,3:3))]';
    
    for col=1:3
        for row=1:3,
            output.affine(row,col)=output.affine(row,col)/oldsp(col)*spacing(col);
        end
    end

    output.spacing=spacing;
    output.img=zeros(dims,tp);
    output.orcode=bis_getorientationcode(output.affine,output.spacing);

    if (debug>0)
        disp('__ Cloned image');
        disp(['      dimensions=',mat2str(dims),' spacing=',mat2str(output.spacing),' orientation=',output.orcode,' type=',class(output.img)]);
        if (debug>1)
            disp(['      matrix=',mat2str(output.affine)]);
        end
    end
