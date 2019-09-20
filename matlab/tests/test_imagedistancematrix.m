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


function result=test_imagedistancematrix(debug)


    if nargin<1
        debug=1;
    end

    [testutil,filepath,lib]=bis_testutils('Test imagedistancematrix');


    fname1=testutil.getTestFilename([ 'distancematrix' filesep 'double.binmatr' ]);
    matmodule=bis_matrix()
    goldmat=matmodule.loadbinary(fname1);
    disp(goldmat);
    idat=zeros([5,5],'single');
    objdat=zeros([5,5],'int16');
    indexdat=zeros([5,5],'int16');

    disp('Creating data');
    index=1;
    for j=1:5
        for i=1:5
            idat(i,j)=(j-1)*5+(i-1);
            if (i>=2 && i<5 && j>=2 && j<5)
                objdat(i,j)=1;
                indexdat(i,j)=index;
                index=index+1;
            end
        end
    end

    if (debug>0)
        disp([' idat=',mat2str(idat')]);
        disp([' objdat=',mat2str(objdat')]);
        disp([' indexdat=',mat2str(indexdat')]);
    end
    
    img=bis_image(); img.create(idat,[2.0,2.0,2.0],'RAS');
    objectmap=bis_image(); objectmap.create(objdat,[2.0,2.0,2.0],'RAS');
    indexmap=bis_image(); indexmap.create(indexdat,[2.0,2.0,2.0],'RAS');
    
    param.storecentroids=0;

    % Test1
    out=lib.computeImageIndexMapWASM(objectmap,1);
    result1=testutil.compare(out.getImageData(),indexmap.getImageData(),'Compute IndexMap',0,0.1);

    % Test 2
    param.useradius='false';
    param.sparsity=0.1;
    param.numthreads=2;
    out2=bis_imagedistancematrix(img,objectmap,param,0);
    result2=testutil.compare(out2,goldmat,'Compute Sparse Threaded Distance Matrix',0,0.1);

    if (debug>0)
        disp(out2);
    end
    result=testutil.combineResults({ result1,result2});
    disp(['___ Done ',mat2str(result{1}),' ',mat2str(result{2}) ]);
    testutil.cleanup();


end
