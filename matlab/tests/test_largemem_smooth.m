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

function result=test_largemem_smooth(debug)

    
    if nargin<1
        debug=1;
    end

    [testutil,filepath,lib]=bis_testutils('Test LargeMemory Smooth');
    

    bw=lib.getbiswasm();

    % Memory mode, 0 = None,1=Matlab only,2=C++ only,3 =both
    bw.force_large_memory();


    fname1=testutil.getTestFilename(['indiv' filesep 'prep.nii.gz' ]);
    fname2=testutil.getTestFilename(['indiv' filesep 'prep_sm.nii.gz']);
    format long;

    param.sigmas=0.4247*[4.0,4.0,4.0 ];
    param.radiusfactor=2.0;
    param.inmm='true';
    param.vtkboundary='true';

    % Load Images
    input = bis_image(fname1,debug+1);
    gold =  bis_image(fname2,debug+1);

    if (debug>0)
        disp('----------------------------------');
        disp('Smoothing image');
        disp('----------------------------------');
    end
    
    output = lib.gaussianSmoothImageWASM(input, param, debug);

    if (debug)
        disp(['Testing real difference']);
    end 

    result=testutil.compare(gold.getImageData(),output.getImageData(),'Image Smooth -- Large Memory',0,0.1);
    testutil.cleanup();

end


