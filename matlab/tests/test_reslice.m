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
        debug=1
    end

    [testutil,filepath,lib]=bis_testutils();


    imagenames= {};
    imagenames{1}='avg152T1_LR_nifti_resampled.nii.gz';
    imagenames{2}='avg152T1_LR_nifti.nii.gz';
    imagenames{3}='avg152T1_LR_nifti_resampled_resliced.nii.gz';
    images = { };

    for i = 1:3
        filename=[ filepath filesep imagenames{i} ];
        images{i} = bis_loadimage(filename,debug+1);
    end

    reslice_matr = [   0.866,  -0.525  , 0.000,  68.758 ;
		   0.500,   0.909 ,  0.000 ,  9.793 ;
		   0.000,   0.000 ,  1.000 ,  2.250 ;
		   0.000,   0.000,   0.000 ,  1.000 ];


    paramobj = { };
    paramobj.interpolation=1;
    paramobj.dimensions=size(images{1}.img);
    paramobj.spacing= images{1}.spacing(1:3)';
    paramobj.datatype='float';
    paramobj.backgroundValue=0.0;

    if (debug>0)
        imagenames
        paramobj
    end

    out_img=lib.resliceImageWASM(images{2},reslice_matr,paramobj,debug);
    result=testutil.compare(images{3}.img,out_img.img,'Image Reslice',1,0.99);

end