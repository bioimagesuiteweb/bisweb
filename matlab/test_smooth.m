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

function result = test_smooth(debug)

    if nargin<1
        debug=1
    end

    bispath();
    lib=biswrapper();
   

    m=mfilename('fullpath');
    [filepath,name,ext] = fileparts(m);
    [filepath,name,ext] = fileparts(filepath);
    fname1=[ filepath filesep  'test' filesep 'testdata' filesep 'MNI_2mm_resliced.nii.gz'];
    fname2=[ filepath filesep  'test' filesep 'testdata' filesep 'newtests' filesep 'goldsmooth2sigma.nii.gz'];
    format long;

    param.sigmas=[2.0,2.0,2.0 ];
    param.radiusfactor=2.0;
    param.inmm='true';

    % Load Images
    input = bis_loadimage(fname1,debug+1);
    gold  = bis_loadimage(fname2,debug+1);

    if (debug>0)
        disp('----------------------------------');
        disp('Smoothing image');
    end
    output = lib.gaussianSmoothImageWASM(input, param, debug);

    if (debug>0)
        disp(['Testing fake difference=']);
    end
    v1=max(max(max(abs(gold.img-single(input.img)))));

    if (debug>0)
        v1
        disp(['Testing real difference']);
    end
    v2=max(max(max(abs(gold.img-single(output.img)))));

    if (debug>0)
        v2
        disp('----------------------------------');
        disp('Smoothing image 2');
    end
    output2 = lib.gaussianSmoothImageWASM(input, param, debug);

    if (debug>0)
        disp(['Testing real difference v2']);
    end
    v3=max(max(max(abs(gold.img-single(output2.img)))));

    if (debug>0)
        v3
        disp('----------------------------------');
        disp('Smoothing image 2');
    end

    param.sigmas=[0.1,0.1,0.1];
    output3 = lib.gaussianSmoothImageWASM(input, param, debug);

    if (debug>0)
        disp(['Testing real difference 3']);
    end
    v4=max(max(max(abs(gold.img-single(output3.img)))));

    if (debug>0)
        v4
    end
    gold=[ 57.14,0,0,57.14];
    mat=[v1,v2,v3,v4];

    disp('=== Smooth test completed')
    diff=max(abs(gold-mat));
    if (diff<0.1)
        result=1;
        disp(['=== Max error=',mat2str(diff),' result=',mat2str(result),'']);
        disp('=== Test Smooth PASS')
    else 
        result=0;
        disp(['=== Max error=',mat2str(diff),' result=',mat2str(result),'']);
        disp('=== Test Smooth FAILED')
    end


    return;



