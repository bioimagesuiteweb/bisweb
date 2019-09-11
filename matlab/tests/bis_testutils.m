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

function [ moduleOutput,filepath,lib] = bis_testutils()

    internal={};
    internal.initialized=0;
    internal.filepath='';
    internal.lib=0;

    moduleOutput.gettestdatapath=@gettestdatapath;
    moduleOutput.printresult=@printresult;
    moduleOutput.printheader=@printheader;
    moduleOutput.compare=@compare;
    moduleOutput.getlib=@getlib;
    
    if (internal.initialized>0)
      result=1;
      return;
    end

    m=mfilename('fullpath');
    [filepath,name,ext] = fileparts(m);
    [filepath,name,ext] = fileparts(filepath);
    addpath(filepath);
    bispath();

    [filepath,name,ext] = fileparts(filepath);
  
    result=[ filepath filesep 'test' filesep 'testdata' ];
    internal.filepath=result;
    internal.lib=biswrapper();   
    
    lib=internal.lib;
    filepath=result;



    function result=gettestdatapath()
       result=internal.filepath;
    end

    function result=getlib()
        result=internal.lib;
    end

    function result=printheader(name)
        
        disp('   ')
        disp('============================================================')
        disp(['    Runnning ',name]);
        disp('   ')
        disp('   ')
        pause(2);
        result=0;
    end

    function result=printresult(testname,pass,value,metricname)

        disp(['=== ',metricname,' = ', mat2str(value) ]);
        if (pass>0)
              result=1;
              disp(['=== Test ',testname,' P A S S E D']);
          else 
              result=0;
              disp(['=== Test ',testname,' F A I L E D']);          
          end
    end

    function result=compare(data1,data2,testname,usecc,threshold)

        if nargin<3
           usecc=0;
        end

        if nargin<4
            threshold=0.01;
        end;

        s1=size(data1);
        data1=single(reshape(data1,[prod(s1),1]));
    
        s1=size(data2);
        data2=single(reshape(data2,[prod(s1),1]));
    
        success=0;

        if usecc>0
            metricname='cc';
            v=corrcoef(data1,data2);
            metric=v(1,2);
            if metric >= threshold
                success=1;
            end
        else
            metricname='maxabs';
            metric=max(abs(data1-data2));
            if metric <= threshold 
                success=1;
            end
        end

        result=printresult(testname,success,metric,metricname);
    end
end