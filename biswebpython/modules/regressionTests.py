# LICENSE
# 
# _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
# 
# BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
# 
# - you may not use this software except in compliance with the License.
# - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
# 
# __Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.__
# 

import sys
import os.path
import biswebpython.core.bis_basemodule as bis_basemodule;

class regressionTests(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='regressionTests';
   
    def createDescription(self):
        desc=self.getModuleDescriptionFromFile('regressionTest');
        p=desc['params'];
        newp=[];
        for i in range(0,len(p)):
            vname=p[i]['varname'];
            if ( not (vname == 'run' or vname=='debug' or vname=='logoutput')):
                newp.append(p[i]);

        desc['params']=newp;
        return desc;

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: smoothImage with vals', vals);


        dirname=os.path.dirname(os.path.realpath(__file__));
        if (len(vals['testdir'])>0):
            dirname=vals.testdir;

        cmd=os.path.abspath(dirname+'/../test_module.py');
        script2=os.path.abspath(dirname+'/../../test/test_module.py');

        if (not os.path.exists(cmd)):
            cmd=script2;
            if (not os.path.exists(cmd)):
                print('---- Can not find test_module.py');
                return False;

            #        os.chdir(os.path.dirname(cmd));
        
        command=sys.executable+' '+cmd;
        command=command+' --first '+str(vals['first'])+' --last '+str(vals['last']);
        if (len(vals['testname'])>0):
            command=command+' --testname '+vals['testname'];
        if (len(vals['testlist'])>0):
            command+=' --input '+vals['testlist'];

        print('\n++++\n++++ executing: '+command+'\n');
        exitcode=os.system(command);
        if (exitcode==0):
            return True;

        return False;




    
