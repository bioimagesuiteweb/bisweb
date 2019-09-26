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

function result = test_indiv(debug)

    if nargin<1
        debug=1;
    end

    [testutil,filepath,lib]=bis_testutils('Test Indiv');



%"command" : "individualizedParcellation --fmri testdata/indiv/prep.nii.gz --smooth 4.0 --parc testdata/indiv/group.nii.gz --debug true",
%"test"    : "--test_target testdata/indiv/indivp.nii.gz",

   fname1= testutil.getTestFilename([ 'indiv' filesep 'prep.nii.gz' ]);
   fname2= testutil.getTestFilename([ 'indiv' filesep 'group.nii.gz' ]);
   fname3= testutil.getTestFilename([ 'indiv' filesep 'indivp.nii.gz' ]);

   sigma=4.0;
   numexemplars=268;

   % Load Images
   disp('-----')
   group = bis_image(fname2,debug+1);
   disp('-----')
   fmri =  bis_image(fname1,debug+1);
   disp('-----')
   gold =  bis_image(fname3,debug+1);
   disp('-----')
   
   indiv_ptr=bis_individualizedparcellation(fmri,group,sigma,numexemplars,debug,'true');
   result=testutil.compare(gold.getImageData(),indiv_ptr.getImageData(),'Indiv Parcellation Float',0,0.1);

   indiv_ptr=bis_individualizedparcellation(fmri,group,sigma,numexemplars,debug,'false');
   result2=testutil.compare(gold.getImageData(),indiv_ptr.getImageData(),'Indiv Parcellation Double',0,0.1);

    a=result2{2};
    b=result{2};
    d=min(a,b);
    result={ 'Test_indiv'; d };
    testutil.cleanup();

end
