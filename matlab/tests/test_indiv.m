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

    [testutil,filepath,lib]=bis_testutils();
    
    testutil.printheader('Test Indiv');



            %"command" : "individualizedParcellation --fmri testdata/indiv/prep.nii.gz --smooth 4.0 --parc testdata/indiv/group.nii.gz --debug true",
            %"test"    : "--test_target testdata/indiv/indivp.nii.gz",

   fname1= [ filepath filesep 'indiv' filesep 'prep.nii.gz' ];
   fname2= [ filepath filesep 'indiv' filesep 'group.nii.gz' ];
   fname3= [ filepath filesep 'indiv' filesep 'indivp.nii.gz' ];

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
   
   or=[mat2str(group.getOrientation()),' vs ',mat2str(fmri.getOrientation()) ];
   if (group.getOrientation() ~= fmri.getOrientation())
      disp(['Orientation mismatch, ERROR ',or]);
     return
   else
      disp(['Orientation match, GOOD ',or ]);
   end
  

   % Reslice Part

   dim=fmri.getDimensions();
   spa=fmri.getSpacing();


   disp('Reslicing group parcellation');
   resliceobj.interpolation=0;
   resliceobj.dimensions=dim(1:3);
   resliceobj.spacing=spa(1:3);
   resliceobj.datatype='short';
   resliceobj.backgroundValue=0.0;
   resliced_group=lib.resliceImageWASM(group,eye(4),resliceobj,debug);
   
   resliced_group.print('Resliced Group Parcellation',3);

   % Smoothing Part
   disp('Smoothing fmri data');
   sigma= sigma * 0.4247;
   smparamobj.sigmas=[sigma,sigma,sigma];
   smparamobj.inmm='true';
   smparamobj.radiusfactor=1.5;
   smparamobj.vtkboundary='true';
   fmri_smoothed = lib.gaussianSmoothImageWASM(fmri, smparamobj, debug);
   fmri_smoothed.print('Smooth fMRI',3);

   % Indiv Parcellation part
   disp('Running Individual Parcellation Code');
   paramobj.numexemplars=numexemplars;
   paramobj.usefloat='true';
   paramobj.saveexemplars='false';
   indiv_ptr=lib.individualizedParcellationWASM(fmri_smoothed,resliced_group, paramobj,debug);

   result=testutil.compare(gold.getImageData(),indiv_ptr.getImageData(),'Indiv Parcellation',0,0.1);


end
