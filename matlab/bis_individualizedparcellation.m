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

function result = bis_individualizedparcellation(fmri,group,sigma,numexemplars,debug,usefloat)

  bispath();

  if nargin<6
    usefloat='false';
  end
  
  if nargin<5
    debug=1;
  end

  if nargin<4
    numexemplars=268;
  end

  if nargin<3
    sigma=4.0;
  end


  lib=biswrapper();
  or=[mat2str(group.getOrientation()),' vs ',mat2str(fmri.getOrientation()) ];
  if (group.getOrientation() ~= fmri.getOrientation())
    disp(['Orientation mismatch, ERROR ',or]);
    result=0;
    return;
  else
    disp(['Orientation match, GOOD ',or ]);
  end

   % Reslice Part

   dim=fmri.getDimensions();
   spa=fmri.getSpacing();


   disp('___ Reslicing group parcellation');
   resliceobj.interpolation=0;
   resliceobj.dimensions=dim(1:3);
   resliceobj.spacing=spa(1:3);
   resliceobj.datatype='short';
   resliceobj.backgroundValue=0.0;
   resliced_group=lib.resliceImageWASM(group,eye(4),resliceobj,debug);
   
   resliced_group.print('Resliced Group Parcellation',3);

   % Smoothing Part
   disp(['___ Smoothing fmri data',mat2str(sigma)]);
   sigma= sigma * 0.4247;
   smparamobj.sigmas=[sigma,sigma,sigma];
   smparamobj.inmm='true';
   smparamobj.radiusfactor=1.5;
   smparamobj.vtkboundary='true';
   fmri_smoothed = lib.gaussianSmoothImageWASM(fmri, smparamobj, debug);
   fmri_smoothed.print('Smooth fMRI',3);

   % Indiv Parcellation part
   paramobj.numexemplars=numexemplars;
   paramobj.usefloat=usefloat;
   paramobj.saveexemplars='false';
   disp(['___ Running Individual Parcellation Code']);
   result=lib.individualizedParcellationWASM(fmri_smoothed,resliced_group, paramobj,debug);
   
end
