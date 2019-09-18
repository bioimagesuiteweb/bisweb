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


function result=test_matrix(debug)


    if nargin<1
        debug=1;
    end

    [testutil,filepath,lib]=bis_testutils('Test Matrix');

    m=zeros(4,'single');
    for c = 1:4
        for r = 1:4
        m(r,c)=(r)*10.0+(c-1)*(c-1)*5.0;
        end
    end

    if (debug>0)
        m
    end
    result=m;

    %lib.redirect_stdout('matlog.txt',1);
    v=single([1,2,3,5,7,11.0]');
    numfailed=lib.test_eigenUtils(m,v,debug);

    disp('------------------------- Done test_eigenutils --------------------------');
    disp(['=== Test Eigen Errors=',mat2str(numfailed)]);
            
    if (numfailed<1)
        disp('=== Test Eigen PASS')
    else 
        disp('=== Test Eigen FAILED')
    end
    disp('--------------------------------------------------------------------------')
    
    fname1=testutil.getTestFilename([ 'glm' filesep 'Test_bis_glm.matr' ]);

    lines=fileread(fname1);
    out=lib.parseMatrixTextFileWASM(lines,1);

    disp('------------------------- Done test_parse_matr ---------------------------');

    ORIG=[  1.000000 -1.000000 0.000000 ;
            1.000000 -0.989950 -0.226649 ;
            1.000000 -0.979900 -0.230126 ;
            1.000000 -0.969849 0.194615 ;
            1.000000 -0.959799 0.976699 ;
            1.000000 -0.949749 1.929179 ;
            1.000000 -0.939699 2.838068 ;
            1.000000 -0.929648 3.542129 ;
            1.000000 -0.919598 3.967927 ;
            1.000000 -0.909548 4.123461 ;
            1.000000 -0.899498 4.069378 ;
            1.000000 -0.889447 4.112454 ;
            1.000000 -0.879397 3.876820 ;
            1.000000 -0.869347 3.211632 ];
            
    out2=out(1:14,:);

    result=testutil.compare(out2,ORIG,'Matrix load (.matr)',0,0.1);
    testutil.cleanup();

end
