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
        debug=1;
    end

    [testutil,filepath,lib]=bis_testutils('Test Smooth');

    fname1=testutil.getTestFilename(['MNI_2mm_resliced.nii.gz']);
    fname2=testutil.getTestFilename(['newtests' filesep 'goldsmooth2sigma.nii.gz']);
    format long;

    param.sigmas=[2.0,2.0,2.0 ];
    param.radiusfactor=2.0;
    param.inmm='true';

    % Load Images
    input = bis_image(fname1,debug+1);
    gold  = bis_image(fname2,debug+2);


    if (debug>0)
        disp('----------------------------------');
        disp('Smoothing image');
    end
    output = lib.gaussianSmoothImageWASM(input, param, debug);

    if (debug>0)
        disp(['Testing fake difference=']);
    end
    v1=max(max(max(abs(gold.getImageData()-single(input.getImageData())))));

    if (debug>0)
        disp(['v1=',mat2str(v1) ]);
        disp(['Testing real difference']);
    end
    v2=max(max(max(abs(gold.getImageData()-single(output.getImageData())))));

    if (debug>0)
        disp(['v2=',mat2str(v2) ]);
        disp('----------------------------------');
        disp('Smoothing image 2');
    end
    output2 = lib.gaussianSmoothImageWASM(input, param, debug);

    if (debug>0)
        disp(['Testing real difference v2']);
    end
    v3=max(max(max(abs(gold.getImageData()-single(output2.getImageData())))));

    if (debug>0)
        disp(['v3=',mat2str(v3) ]);
        disp('----------------------------------');
        disp('Smoothing image 2');
    end

    param.sigmas=[0.1,0.1,0.1];
    output3 = lib.gaussianSmoothImageWASM(input, param, debug);

    if (debug>0)
        disp(['Testing real difference 3']);
    end
    v4=max(max(max(abs(gold.getImageData()-single(output3.getImageData())))));

    if (debug>0)
        disp(['v4=',mat2str(v4) ]);
    end
    gold=[ 57.14,0,0,57.14];
    mat=[v1,v2,v3,v4];

    disp(['=== Smooth test completed',mat2str(mat)])
    result=testutil.compare(gold,mat,'Image Smooth (multiple tests)',0,0.1);
    %output3.print('Image Smooth',3);
    testutil.cleanup();

 return;



