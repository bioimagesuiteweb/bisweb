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


function result=test_regressout(debug)


    if nargin<1
        debug=1;
    end

    [testutil,filepath,lib]=bis_testutils('Test Regress Out');

        
    %"command" : "regressOut -i testdata/newtests/drift_input.csv -r testdata/newtests/drift.csv",
    %"test"    : "--test_target testdata/simpleregress.csv --test_type matrix --test_comparison ssd --test_threshold 0.1",
    
    fname1=testutil.getTestFilename([ 'newtests' filesep 'drift_input.csv' ]);
    fname2=testutil.getTestFilename([ 'newtests' filesep 'drift.csv']);
    fname3=testutil.getTestFilename('simpleregress.csv');
    format long;

    inp=csvread(fname1);
    disp(['Input read: ',fname1,' ',mat2str(size(inp))]);
    
    reg=csvread(fname2);
    disp(['Regressor read: ',fname2,' ',mat2str(size(reg))]);
    
    gold=csvread(fname3);
    disp(['Gold-standard result read: ',fname3,' ',mat2str(size(gold))]);
    disp('  ')

    
    
  % - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  % JS: {'weightedRegressOutWASM', 'Matrix', [ 'Matrix', 'Matrix', 'Vector_opt',  'debug' ]}
  %      returns a Matrix
  % - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  %function output = weightedRegressOutWASM(matrix1,matrix2,vector3,debug)

    output=lib.weightedRegressOutWASM(inp,reg,0,debug);

    if (debug)
        output
        gold
    end

    result=testutil.compare(gold,output,'Regress Out',0,0.1);

    testutil.cleanup();

end
