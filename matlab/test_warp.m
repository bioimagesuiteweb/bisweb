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

bispath();
lib=biswrapper();

disp('--------------------------- Done loading ------------------');

m=zeros(4,'single');
for c = 1:4
    for r = 1:4
      m(r,c)=(r)*10.0+(c-1)*(c-1)*5.0;
    end
end


m

lib.redirect_stdout('matlog.txt',1);
v=single([1,2,3,5,7,11.0]');
numfailed=lib.test_eigenUtils(m,v,1);

disp('------------------------- Done test_eigenutils --------------------------');

m=mfilename('fullpath');
[filepath,name,ext] = fileparts(m);
[filepath,name,ext] = fileparts(filepath);
fname1=[ filepath filesep 'test' filesep 'testdata' filesep 'glm' filesep 'Test_bis_glm.matr' ]

lines=fileread(fname1);
out=lib.parseMatrixTextFileWASM(lines,1);

size(out)



disp('------------------------- Done parse .matr file --------------------------');

imagenames= {};
imagenames{1}='avg152T1_LR_nifti_resampled.nii.gz';
imagenames{2}='avg152T1_LR_nifti.nii.gz';
imagenames{3}='avg152T1_LR_nifti_resampled_resliced.nii.gz'


images = { };

for i = 1:3
  filename=strcat('..\test\testdata\',imagenames{i});
  images{i} = load_untouch_nii(filename,[],[],[],[],[],[]); 
end

reslice_matr = [   0.866,  -0.525  , 0.000,  68.758 ;
		   0.500,   0.909 ,  0.000 ,  9.793 ;
		   0.000,   0.000 ,  1.000 ,  2.250 ;
		   0.000,   0.000,   0.000 ,  1.000 ];


paramobj = { };
paramobj.interpolation=1;
paramobj.dimensions=[ 73,49,28 ];
paramobj.spacing=[ 2.5,4.5,6.5 ];
paramobj.datatype='float';
paramobj.backgroundValue=0.0;

out_img=lib.resliceImageWASM(images{2},reslice_matr,paramobj,2);

disp('-------------- back now ----------')
size(out_img.data)
out_img.data(37,25,14)
out_img.data(41,25,14)

        


%biswasm.unload();       

