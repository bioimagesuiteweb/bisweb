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

function result=test_combo(debug)

    if nargin<1
        debug=1;
    end

    [testutil,filepath,lib]=bis_testutils('Test Combo');
    
    lines=fileread(testutil.getTestFilename( 'complex.grd'));
    if (debug>0)
        lines(1:400)
    end
    combo=lib.parseComboTransformTextFileWASM(lines,debug);
    result1=compare_combo(combo,debug);
    lines2=lib.createComboTransformationTextFileWASM(combo,debug);
    if (debug>0)
        lines2(1:400)
    end
    combo2=lib.parseComboTransformTextFileWASM(lines2,debug);
    result2=compare_combo(combo2,debug);

    result=min(result1,result2);
    testutil.cleanup();
    result= {'Test Combo', result};
        

    % Internal
    function result=compare_combo(combo,debug)
        grd=combo.grids{1};

        if (debug>0)
            disp([' grid=',mat2str(grd.dimensions),' spa=',mat2str(grd.spacing),' ori=', mat2str(grd.origin)]);
        end


        data = [  20, 0.5250, 1.5128, 0.2732 ;
                47, -0.6805, 1.3356, 0.6628 ;
                9850, -0.3057, -1.4673, -0.1346 ];

        linear = [ 0.999, -0.044, -0.021,  2.691;
            0.045,  0.998,  0.035, -0.860;
            0.020, -0.036,  0.999,  0.552;
            0.000,  0.000,  0.000,  1.000 ];


        dl=combo.linear-linear;
        error0=max(max(dl));

        result=0;
        if (error0<0.01)
            result=1;
        end

        result=testutil.printresult('Test Combo (Linear)',result,error0,'maxabs');

        if (debug>0)
            disp(['=== Test 1: linear error=',mat2str(error0) ]);
        end

        g=grd.data;
        if (debug>0)
            disp(['size of grid data=',mat2str(size(g))]);
            disp('');
        end

        error1=0;
        for i = 1: 3        
            cp=int32(data(i,1));
            i_data = [ data(i,2),data(i,3),data(i,4) ];
            o_data = [ g(cp+1,1),g(cp+1,2),g(cp+1,3) ];
            error1=error1+max(abs(i_data-o_data));
            if (debug>0)
                disp([' i_data=',mat2str(i_data), ' o_data=',mat2str(o_data), '        error=',mat2str(error1) ]);
            end
        end

        disp(['=== Errors=',mat2str(error0),' ',mat2str(error1)]);

        diff=max(abs(error0),abs(error1));

        if (diff<0.1)
            result=1;
        else 
            result=0;
        end
        testutil.printresult('Test Combo (Both)',result,diff,'maxabs');
        
    end
end
