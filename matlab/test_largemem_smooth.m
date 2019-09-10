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

clear

bispath();
lib=biswrapper();
bw=lib.getbiswasm();

% Memory mode, 0 = None,1=Matlab only,2=C++ only,3 =both
bw.force_large_memory()


m=mfilename('fullpath');
[filepath,name,ext] = fileparts(m);
[filepath,name,ext] = fileparts(filepath);
fname1=[ filepath filesep  'test' filesep 'testdata' filesep 'indiv' filesep 'prep.nii.gz' ];
fname2=[ filepath filesep  'test' filesep 'testdata' filesep 'indiv' filesep 'prep_sm.nii.gz'];
disp(fname1);
disp(fname2);
format long;

param.sigmas=0.4247*[4.0,4.0,4.0 ];
param.radiusfactor=2.0;
param.inmm='true'
param.vtkboundary='true'
debug=1;

% Load Images
input = bis_loadimage(fname1);
gold = bis_loadimage(fname2);


disp('----------------------------------');
disp('Smoothing image');
disp('----------------------------------');
output = lib.gaussianSmoothImageWASM(input, param, debug);

disp('----------------------------------');
disp(['Testing fake difference=']);
max(max(max(max(abs(gold.img-single(input.img))))))


disp(['Testing real difference']);
max(max(max(max(abs(gold.img-single(output.img))))))
