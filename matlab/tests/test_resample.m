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

function result=test_resample(debug)


    if nargin<1
        debug=1;
    end

    [testutil,filepath,lib]=bis_testutils('Test Resample');

    fname1=testutil.getTestFilename('MNI_2mm_resliced.nii.gz');

    % Load Images
    input = bis_image(fname1,debug+1);

    if (debug>0)
        disp('Reslicing image');
    end

    resliceobj.interpolation=0;
    resliceobj.dimensions=[ 45,45,45 ];
    resliceobj.spacing=[ 4.0,4.4,4.8];
    resliceobj.datatype='short';
    resliceobj.backgroundValue=0.0;

    output=lib.resliceImageWASM(input,eye(4),resliceobj,debug);

    testaff=eye(4);
    testaff(1,1)=-4.0;
    testaff(2,2)=-4.4;
    testaff(3,3)=4.8;

    if (debug>0)
        testaff 
        output.getAffine()
    end

    result=testutil.compare(testaff,output.getAffine(),'Image Resample (affine matrix)',0,0.1);
    testutil.cleanup();

end
