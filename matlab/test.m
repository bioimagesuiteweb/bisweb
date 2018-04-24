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


biswasm=bis_wasmutils();
if ~exist('loaded')
  loaded=biswasm.loadlib();
  disp('loaded ok=');
end

disp('--------------------------- Done loading ------------------');

m=zeros(4,'single');
for c = 1:4
    for r = 1:4
      m(r,c)=(r)*10.0+(c-1)*(c-1)*5.0;
    end
end


m



biswasm.redirect_stdout('matlog.txt');


ptr=biswasm.serialize_dataobject(m);
v=single([1,2,3,5,7,11.0]');

ptr_v=biswasm.serialize_dataobject(v);
v_back=biswasm.deserialize_pointer(ptr_v)

disp('difference=')
sum(sum((v-v_back)))



numfailed=calllib(biswasm.Module,'test_eigenUtils',ptr,ptr_v,1)

lines=fileread('..\test\testdata\glm\Test_bis_glm.matr');


ptr=calllib(biswasm.Module,'parseMatrixTextFileWASM',lines,1);

out=biswasm.deserialize_pointer(ptr);

size(out)


imagenames= {};
imagenames{1}='avg152T1_LR_nifti_resampled.nii.gz';
imagenames{2}='avg152T1_LR_nifti.nii.gz';
imagenames{3}='avg152T1_LR_nifti_resampled_resliced.nii.gz'


images = { };

for i = 1:3

%  a=strcat('imagenames_',int2str(i))
% filename=strcat('..\test\testdata\',eval(a));
  filename=strcat('..\test\testdata\',imagenames{i});
  images{i} = load_untouch_nii(filename,[],[],[],[],[],[]); 
  disp([' loaded from ', filename ]);
  disp(size(images{i}.img));
  disp(images{i}.hdr.dime.pixdim(2:4));

end

reslice_matr = [   0.866,  -0.525  , 0.000,  68.758 ;
		   0.500,   0.909 ,  0.000 ,  9.793 ;
		   0.000,   0.000 ,  1.000 ,  2.250 ;
		   0.000,   0.000,   0.000 ,  1.000 ];


xform_ptr=biswasm.serialize_dataobject(reslice_matr);
paramobj = '{ "interpolation" : 1, "dimensions" : [ 73,49,28 ], "spacing" : [ 2.5,4.5,6.5 ], "datatype" : "float", "backgroundValue" : 0.0}'

disp('image dimensions');
size(images{2}.img)
image_ptr=biswasm.serialize_dataobject(images{2}.img,images{2}.hdr.dime.pixdim(2:4),1);

resl_image_ptr=calllib(biswasm.Module,'resliceImageWASM',image_ptr,xform_ptr,paramobj,2);

out_img=biswasm.deserialize_pointer(resl_image_ptr);
size(out_img.data)
out_img.data(37,25,14)
out_img.data(41,25,14)

        


%biswasm.unload();       

