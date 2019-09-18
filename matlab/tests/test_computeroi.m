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


function result=test_computeroi(debug)


    if nargin<1
        debug=1;
    end

    [testutil,filepath,lib]=bis_testutils('Test ComputeROI');


    fname0=testutil.getTestFilename([ 'newtests' filesep 'simpleroi_result.matr' ]);
    lines=fileread(fname0);
    gold=lib.parseMatrixTextFileWASM(lines,1);
    disp(['Result read: ',fname0,' ',mat2str(size(gold))]);


    %"command" : "computeROI -i testdata/simple4dtest.nii.gz -r testdata/simpleroi.nii.gz --debug true",
    %"test"    : "--test_target testdata/newtests/simpleroi_result.matr --test_type matrix --test_comparison ssd --test_threshold 0.01",
    
    fname1=testutil.getTestFilename( 'simple4dtest.nii.gz' );
    fname2=testutil.getTestFilename( 'simpleroi.nii.gz');
    format long;

    param.storecentroids=0;
    
    % Load Images
    input = bis_image(fname1,debug+2);
    roi =  bis_image(fname2,debug+2);

    output = lib.computeROIWASM(input,roi,param,debug);

    result=testutil.compare(gold,output,'Compute ROI',0,0.1);

    testutil.cleanup();

end
