#!/usr/bin/env python3

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
# ENDLICENSE



import math
import os
import sys


my_path=os.path.dirname(os.path.realpath(__file__));
# Needed for installed version
sys.path.append(os.path.abspath(my_path+'/../lib'));
# Needed for source version
sys.path.append(os.path.abspath(my_path+'/../build/native'));
sys.path.append(os.path.abspath(my_path+'/../python'));
sys.path.append(os.path.abspath(my_path+'/../python/modules'));
sys.path.append(os.path.abspath(my_path+'/../python/utilities'));
import biswrapper as libbis;
import bis_objects as bis
import bis_commandline
import argparse
import json
import tempfile


parser = argparse.ArgumentParser(description='bisweb test python_module tool')
parser.add_argument('--input',help='filename of the tests to run',default=None)
parser.add_argument('--first',help='first test to run',default=0,type=int)
parser.add_argument('--last',help='last test to run',default=-1,type=int)
parser.add_argument('--testname',help='comma separated list of names of tests to run. If not specified all are run (subject to first:last)',default=None)
args = vars(parser.parse_args());

testscript_base=os.path.abspath(my_path+"/../python/modules/");

testlistfilename= args['input'];
if (args['input'] == None):
    testlistfilename = os.path.abspath(my_path+"/module_tests.json");



first_test=args['first'];
last_test=args['last'];
test_name=args['testname'];
test_namelist=None;
if (test_name != None):
    test_namelist=test_name.lower().split(",")

try:
    json_data=open(testlistfilename).read()
    obj = json.loads(json_data)
except:
    e = sys.exc_info()[0]
    print('---- Failed to read ',testfilename,e);
    sys.exit(1);

testlist=obj['testlist'];

begin_test=0;
if (first_test<0):
    begin_test=len(testlist)+first_test;
elif (first_test>0):
    begin_test=first_test;

end_test=len(testlist)-1;
if (last_test>=0):
    end_test=last_test;
elif (last_test<0):
    end_test=len(testlist)+last_test;

print('Running tests:',begin_test,':',end_test,' from l=',len(testlist),' name=', test_namelist);

numgood=0;
numbad=0;
badtests=""
numskip=0;
skiptests="";
doskip=True;


for i in range(begin_test,end_test+1):

    tname=testlist[i]['command'].split(" ")[0].lower();
    rawcommand=testlist[i]['command'];
    index=rawcommand.find(' ');
    command= [ rawcommand[0:index] , rawcommand[index+1:] ]
    expected_result=testlist[i]['result'];
    dopython=testlist[i]['dopython'];
    
    runtest= dopython;        
    if (test_name != None) :
        doskip=False;
        if ((tname.lower() in test_namelist)==False):
            runtest= False



            
    if (runtest==True):
        newargs=testlist[i]['test'].split(" ");
        testopts= {
            "test_threshold" : 0.01,
            "test_type" : 'image',
            "test_comparison" : 'maxabs'
        };

        for k in range(0,len(newargs)-1):
            key=newargs[k];
            val=newargs[k+1];
            testopts[key[2:]]=val;
            k=k+1;

        with tempfile.TemporaryDirectory() as dname:

            tempName="";
            testtype=testopts['test_type'];
            if (testtype=="image"):
                tempName= dname+ '/out.nii.gz';
            elif (testtype=="matrix" or testtype=="matrixtransform"):
                tempName= dname+ '/out.matr';
            elif (testtype=="gridtransform"):
                tempName=dname+'/out.grd';
            elif (testtype=="registration"):
                tempName=dname+'/out.json';
            command[1]=command[1]+" --output "+tempName;
                
            if (testtype=="registration"):
                tempName=dname+"/out_resl.nii.gz";
                command[1]=command[1]+" --doreslice true";
                command[1]=command[1]+" --resliced "+tempName;
                testtype="image";

            print('====\n-------------------- test',i,'---------------------------------------');
            
            
            cmd="python3 "+testscript_base+'/'+command[0]+".py"+" "+command[1];
            print('====\n==== executing:',cmd,'\n====');
            exitcode=os.system(cmd);
            testpass=False;
            if (exitcode==0):
                testpass=bis_commandline.processTestResult(tname.lower(),tempName,
                                                           testopts['test_target'].strip(),
                                                           testtype.strip(),
                                                           float(testopts['test_threshold']),
                                                           testopts['test_comparison']);
            else:
                print('____ test returned failed to execute code');

            if (exitcode==0 and testpass==expected_result):
                print('++++ returning testpass=',testpass,' expected=', expected_result,' exitcode=',exitcode);
                numgood=numgood+1;
                print('++++\n++++ Test ',i,'  p a s s e d\n++++');
                testpass=True;
            elif (exitcode!=0 and expected_result==False):
                print('++++\n++++ Test ',i,'  i n t e n i o n a l  f a i l  --> p a s s e d\n++++');
                numgood=numgood+1;
                testpass=True;
            else:
                print('----\t returning testpass=',testpass,' expected=', expected_result,' exitcode=',exitcode);
                print('----\n----- Test ',i,'  f a i l e d\n----');
                numbad=numbad+1;
                badtests=badtests+"\t"+str(i)+". "+command[0]+" "+command[1]+"\n";
                testpass=False;
    elif (doskip):
        print('-------------------- test',i,'----------------------------------------------');
        print('====\n==== Test ',i,' ' ,rawcommand,'  s k i p p e d\n====');
        numskip=numskip+1;
        skiptests=skiptests+"\t"+str(i)+". "+command[0]+" "+command[1]+"\n";

print('------------------------------------------------------------------');
print('++++\n++++ Number of  p a s s e d   = '+str(numgood));
print('---- Number of  f a i l e d   = '+str(numbad));
if (numbad>0):
    print(badtests,'\n');

if (doskip):
    print('==== Number of  s k i p p e d = '+str(numskip)+'\n');
    if (numskip>0):
        print(skiptests,'\n');

    
if (numbad==0):
    print('++++');
    sys.exit(0);


print('----');
sys.exit(1);



