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


function result=test_computeglm(debug)


    if nargin<1
        debug=1;
    end

    [testutil,filepath,lib]=bis_testutils('Test ComputeGLM');

    fname1=testutil.getTestFilename([ 'glm' filesep 'Test_bis_glm.matr' ]);
    lines=fileread(fname1);
    glmmatrix=lib.parseMatrixTextFileWASM(lines,1);

    %"command" : "computeGLM -i testdata/glm/Test_allruns.nii.gz --regressor testdata/glm/Test_bis_glm.matr --debug true --numtasks 3",
    %"test"    : "--test_target testdata/glm/test_beta.nii.gz",

    fname1=testutil.getTestFilename([ 'glm' filesep 'Test_allruns.nii.gz' ]);
    fname2=testutil.getTestFilename([ 'glm' filesep 'test_beta.nii.gz']);
    format long;

    param.numtasks=3;
    param.usemask=0;
    
    % Load Images
    input = bis_image(fname1,debug+2);
    gold =  bis_image(fname2,debug+2);

    betas = lib.computeGLMWASM(input,0,glmmatrix,param,debug);

    betas.print('Betas',3);
    result=testutil.compare(gold.getImageData(),betas.getImageData(),'Compute GLM',0,0.1);
    testutil.cleanup();


end
