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

function result = test_xcluster(debug)

    if nargin<1
        debug=1;
    end

    [testutil,filepath,lib]=bis_testutils('Test Shen Parcellation');
    
    fname1= testutil.getTestFilename([ 'indiv' filesep 'prep.nii.gz' ]);
    fname2= testutil.getTestFilename([ 'indiv' filesep 'group.nii.gz' ]);
    fname3= testutil.getTestFilename([ 'indiv' filesep 'singleparcradius.nii.gz' ]);

    % Gold standard result
    gold =  bis_image(fname3,debug+1);
    
    % Load Images
    disp('-----')
    parc = bis_image(fname2,debug+1);
    fmri =  bis_image(fname1,debug+1);
    
    
    % Create binary mask from group parcellation
    imgdata=uint16(parc.getImageData()>0);
    newmask=bis_image();
    newmask.create(imgdata,parc.getSpacing(),parc.getAffine());
    newmask.print('created binary mask');

    disp('-------------------------------------------------')
    % Compute distance matrix
    param.useradius='true';
    param.radius=4.0;
    param.sparsity=0.1;
    param.numthreads=2;
    distmatrix=bis_imagedistancematrix(fmri,newmask,param,1);
    

    disp('-------------------------------------------------')
    
    indexmap=lib.computeImageIndexMapWASM(newmask,0);
    indexmap.print('Indexmap');

    disp('-------------------------------------------------')
    
    parcellation=bis_distmatrixparcellation(distmatrix,indexmap,20,1.0);
    parcellation.print('Parcellation');
    
    % Compare histograms of parcellation as there is a random element to this code
    gdata=single(gold.getImageData());
    nbins=max(max(max(gdata)));
    gH=sort(hist(gdata(:),[0:nbins]));
    gH=gH(1:end-1)

    pdata=single(parcellation.getImageData());
    pH=sort(hist(pdata(:),[0:nbins])); 
    pH=pH(1:end-1)
    
    result=testutil.compare(gH,pH,'Single Subject Parcellation',1,0.95);
    testutil.cleanup();
   

end
