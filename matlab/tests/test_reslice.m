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


function result=test_reslice(debug)


    if nargin<1
        debug=1;
    end

    [testutil,filepath,lib]=bis_testutils('Test Reslice');


    imagenames= {};
    imagenames{1}='avg152T1_LR_nifti_resampled.nii.gz';
    imagenames{2}='avg152T1_LR_nifti.nii.gz';
    imagenames{3}='avg152T1_LR_nifti_resampled_resliced.nii.gz';
    images = { };

    for i = 1:3
        filename=testutil.getTestFilename( imagenames{i});
        images{i} = bis_image(filename,debug+1);
    end

    reslice_matr = [   0.866,  -0.525  , 0.000,  68.758 ;
		   0.500,   0.909 ,  0.000 ,  9.793 ;
		   0.000,   0.000 ,  1.000 ,  2.250 ;
           0.000,   0.000,   0.000 ,  1.000 ];
           
    if (debug>0)
        disp('----------------');
        disp(['reslice_matr=',mat2str(reslice_matr)]);
        d=reslice_matr*[ 90 48 26 1 ]';
        disp(['Mapping =',       mat2str(d)]);
        idata=images{1}.getImageData();
        disp(['Value at :',mat2str([44,33,11]),' = ', mat2str(idata(45,34,12)), ' and 46,44,27 ',mat2str(idata(47,45,28)) ]);
    end


    paramobj = { };
    paramobj.interpolation=1;


    spa=images{1}.getSpacing();
    paramobj.dimensions=size(images{1}.getImageData());
    paramobj.spacing= spa(1:3)';
    paramobj.datatype='float';
    paramobj.backgroundValue=0.0;

    if (debug>0)
        paramobj
    end

    out_img=lib.resliceImageWASM(images{2},reslice_matr,paramobj,debug);
    result=testutil.compare(images{3}.getImageData(),out_img.getImageData(),'Image Reslice',1,0.99);
    testutil.cleanup();

end
