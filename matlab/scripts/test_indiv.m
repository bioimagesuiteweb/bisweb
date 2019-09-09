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

m=mfilename('fullpath');
[filepath,name,ext] = fileparts(m);
addpath([ filepath filesep '..' ]);

bispath();
lib=biswrapper();

% Parameters

debug=1;
fname1='/localhome/xenios_local/indiv/pa0430_S004_bis_matrix_new_1_preprocessed_output.nii.gz';
fname2='/localhome/xenios_local/indiv/pa0430_S004_bis_matrix_new_1_voi.nii.gz';
sigma=4.0;
numexemplars=268;

% Load Images
group = bis_loadimage(fname2);
fmri =  bis_loadimage(fname1);

if (group.orcode ~= fmri.orcode)
   disp(['Orientation mismatch, ERROR ',group.orcode,' ',fmri.orcode]);
   return
else
   disp(['Orientation match, GOOD ',group.orcode,' ',fmri.orcode]);
end
  

% Reslice Part
disp('Reslicing group parcellation');
resliceobj.interpolation=0;
resliceobj.dimensions=group.hdr.dime.dim(2:4);
resliceobj.spacing=group.hdr.dime.pixdim(2:4);
resliceobj.datatype='short';
resliceobj.backgroundValue=0.0;
resliced_group=lib.resliceImageWASM(group,eye(4),resliceobj,debug);
disp(resliced_group)
disp(resliced_group.hdr.dime)


% Smoothing Part
disp('Smoothing fmri data');
sigma= sigma * 0.4247;
smparamobj.sigmas=[sigma,sigma,sigma];
smparamobj.inmm='true';
smparamobj.radiusfactor=1.5;
smparamobj.vtkboundary='true';
fmri_smoothed = lib.gaussianSmoothImageWASM(fmri, smparamobj, debug);
disp(fmri_smoothed)

% Indiv Parcellation part
disp('Running Individual Parcellation Code');
paramobj.numexemplars=numexemplars;
paramobj.usefloat='true';
paramobj.saveexemplars='false';
indiv_ptr=lib.individualizedParcellationWASM(fmri_smoothed,resliced_group, paramobj,debug);

