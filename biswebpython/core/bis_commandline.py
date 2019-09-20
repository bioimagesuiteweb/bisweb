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

import sys
import numpy as np
import argparse
import biswebpython.core.bis_objects as bis_objects;
import biswebpython.core.bis_baseutils as bis_baseutils;
import tempfile

def initialError(extra=''):

    print(extra+'\nUsage: cmd-load.js modulename [ options ].\n');
    print("Type 'python cmd-load [function name] --help' for more information");



def attachFlags(module,parser):
    
    des = module.getDescription();
    lst = [ des['params'], des['inputs'], des['outputs'] ];
    for i in range(0,3):
        for j in range(0,len(lst[i])):
            param=lst[i][j];

            shortname="";
            if ('shortname' in param):
                shortname=param['shortname'];
            optdesc="";
            bstr='[';
            estr=']';

            required=None;
            if ('required' in param):
                required=param['required'];
            if (required==False):
                optdesc="(optional) ";
            if (required==True):
                bstr='<';
                estr='>';

            if (shortname == ""):	        
                if (param['type'] == "float"):
                    parser.add_argument('--'+param['varname'].lower(), help=optdesc+param['description'],type=float,default=None);
                elif (param['type'] == "int"):
                    parser.add_argument('--'+param['varname'].lower(), help=optdesc+param['description'],type=int,default=None);
                else:
                    parser.add_argument('--'+param['varname'].lower(), help=optdesc+param['description'],default=None);
            else:
                if (param['type'] == "float"):
                    parser.add_argument('-'+shortname,'--'+param['varname'].lower(), help=optdesc+param['description'],type=float,default=None);
                elif (param['type'] == "int"):
                    parser.add_argument('-'+shortname,'--'+param['varname'].lower(), help=optdesc+param['description'],type=int,default=None);
                else:
                    parser.add_argument('-'+shortname,'--'+param['varname'].lower(), help=optdesc+param['description'],default=None);


    # Magic test option
    if ('--test_base_directory' in sys.argv):
        parser.add_argument('--test_base_directory',help= 'Specifies the Base Directory for files',default='');
                    
    parser.add_argument('--paramfile',help= 'Specifies that parameters should be read from a file as opposed to parsed from the command line.',default='');
    
                    
def runModule(mod, vars,args):
	    
    print('oooo --------------------------------------------------------------');
    ok=mod.directInvokeAlgorithm(vars);
    if (ok == True):
        print('++++\noooo -------------------------------------------------------------');
        ok2=mod.saveOutputs(args);
        if (ok2 == True):
            return True;
            
    return False
    


def loadParse(mod,args,addModuleFlag=True):

    toolname=mod.name;
    maxarg=2;
    if (toolname=='regressionTests'):
        maxarg=1;

    if (len(args)<maxarg):
        print("---- Not enough arguments passed to run this tool. Type "+args[0]+" -h for more information");
        return False;


    parser = argparse.ArgumentParser(description='\nThis python module ('+toolname+')  is part of the BioImage Suite Web image analysis package. See https://github.com/bioimagesuiteweb/bisweb for more information.');
    attachFlags(mod,parser);

    args = vars(parser.parse_args());
    loadedArgs={};

    test_base_directory='';
    if ('test_base_directory' in args):
        test_base_directory=args['test_base_directory'];
        #    print('Test_base=',test_base_directory,'args=',args);
        
    with tempfile.TemporaryDirectory() as tempdname:
    
        if (len(args['paramfile'])>0):
            print('___ reading paramfile',args['paramfile']);
            try:
                file = open(bis_baseutils.downloadIfNeeded(args['paramfile'],test_base_directory,tempdname));
                text=file.read()
                import json
                d = json.loads(text)
                toolname=d['module'].lower();
                current=mod.name.lower();
                if (toolname!=current):
                    print('---- param file was for module '+d['module']+' not '+mod.name);
                    return 0;
                
                loadedArgs=d['params'];
                print('+++ loadedArgs=',loadedArgs);
            except:
                e = sys.exc_info()[0]
                print(e)
                print('---- Bad param file ('+args['paramfile']+')')
                return 0



    
        # Parse From Command Line
        #    modArguments=mod.parseValues(args);
        modArguments = mod.parseValuesAndAddDefaults(args, loadedArgs);
    

        #check provided parameters against input restrictions (input of 'type' for the parameter, parameter one of the values specified in 'restrict')
        if (mod.typeCheckParams(modArguments)):
            if (mod.loadInputs(args,test_base_directory,tempdname)):
                print('oooo');
                if (runModule(mod, modArguments,args)):
                    return 0
                else:
                    print('---- Failed to run module');
            else:
                print('---- Could not load inputs');
        else:
            print('---- Could not parse module parameters');
    
    return 1

# ------------------
# Metrics CC
# ------------------
def computeNorm2(data1,data2):
    A=data1.flatten();
    B=data2.flatten();
    return np.linalg.norm(A-B);


def computeCC(data1,data2):
    input1=data1.flatten();
    input2=data2.flatten();
    if (input1.shape[0] < 2 or input1.shape[0]!=input2.shape[0]):
        print('Bad arrays for CC'+input1.shape+','+input2.shape);
        return -1000;
    
    length=input1.shape[0];
    sum=np.zeros([2],dtype=np.float64);
    sum2=np.zeros([2],dtype=np.float64);
    mean=np.zeros([2],dtype=np.float64);
    variance=np.zeros([2],dtype=np.float64);
    sumprod=0.0;

    for i in range(0,length):
        v0=float(input1[i]);
        sum[0]+=v0;
        sum2[0]+=v0*v0;
	    
        v1=float(input2[i]);
        sum[1]+=v1;
        sum2[1]+=v1*v1;
        sumprod+=v0*v1;
  
    for j in range(0,2):
        mean[j]=sum[j]/length;
        variance[j] =sum2[j]/length-mean[j]*mean[j];
        if (variance[j]<0.00001):
            variance[j]=0.00001;

    cv=sumprod/length-mean[0]*mean[1]
    covar2=(cv*cv)/(variance[0]*variance[1]);
    return covar2;


#def computeCC(data1,data2):
#    return np.corrcoef(data1.flatten(),data2.flatten())[0,1];

def maxabsdiff(data1,data2):
    dl=data1.flatten()-data2.flatten();
    diff=max(np.amax(dl),-np.amin(dl));
    return diff;


def printResult(diff,threshold,toolname,dtype):

    
    if (diff < threshold):
        print('++++\n++++\n++++ Module '+toolname+ 'test pass.');
        print('++++\tdeviation from standard ',dtype,' : ',diff,' < ',threshold,' ');
        return True;

    print('----\n----\n---- Module ',toolname,' test failed. Module produced output significantly different from expected.');
    print('----\t deviation from standard ',dtype,': ',diff,' > ',threshold);
    return False;

def processTestResult(toolname,resultFile,test_target,test_type,test_threshold,test_comparison,basedir='',tempdir=''):

    test_type=test_type.strip();
    
    threshold =test_threshold;
    if (threshold==None):
        threshold=0.01;
    
    comparison = test_comparison
    if (comparison==None):
        comparison="maxabs";

    if (test_type=='image'):
        if (comparison != "maxabs" and comparison!= "ssd"):
            comparison="cc";

    if (test_type=='matrix' or test_type=="matrixtransform" or test_type=="gridtransform"):
        if (comparison != "maxabs"):
            comparison="ssd";

    
    print('====\n==================================================================\n====');
    print('==== comparing ('+test_type+') using ('+comparison+') and threshold='+str(threshold)+'.\n====');
    print('==== comparing files=',resultFile,' and ',test_target);

    test_target=bis_baseutils.downloadIfNeeded(test_target,basedir,tempdir);

    
    if (test_type=="image"):
        out = bis_objects.bisImage();
        if (out.load(resultFile)!=False):
            gold = bis_objects.bisImage();
            if (gold.load(test_target)!=False) :
                diff = 0;
                try:
                    if (comparison=='cc'):
                        diff=-computeCC(out.get_data(),gold.get_data());
                        threshold=-threshold;
                    elif comparison=='ssd':
                        diff=computeNorm2(out.get_data(),gold.get_data());
                    else:
                        diff=maxabsdiff(gold.get_data(),out.get_data());
                    return printResult(diff,threshold,toolname,test_type);
                except:
                    print('---- Failed to compare gold=',gold.dimensions,' vs out=', out.dimensions);
                    return False;
            else:
                print('---- Failed to load gold standard image');
                return False;
        else :
            print('---- Failed to load input image');
            return False;

    elif (test_type == "matrix"):

        out = bis_objects.bisMatrix();
        if (out.load(resultFile)!=False):
            gold = bis_objects.bisMatrix();
            if (gold.load(test_target)!=False):
                print('out ', resultFile,' dims=',out.data_array.shape);
                print('gold ', test_target,' dims=',gold.data_array.shape);
                if (comparison=='maxabs'):
                    diff=maxabsdiff(gold.data_array,out.data_array);
                else:
                    diff=computeNorm2(gold.data_array,out.data_array);
                return printResult(diff,threshold,toolname,test_type);
            else:
                return False;
        else:
            return False;

    elif (test_type == "matrixtransform"):

        out = bis_objects.bisLinearTransformation();
        if (out.load(resultFile)!=False):
            gold = bis_objects.bisLinearTransformation();
            if (gold.load(test_target)!=False):
                print('out ', resultFile,' dims=',out.data_array.shape);
                print('gold ', test_target,' dims=',gold.data_array.shape);
                if (comparison=='maxabs'):
                    diff=maxabsdiff(gold.data_array,out.data_array);
                else:
                    diff=computeNorm2(gold.data_array,out.data_array);
                return printResult(diff,threshold,toolname,test_type);
            else:
                return False;
        else:
            return False;

        
    elif (test_type == "gridtransform"):

        out = bis_objects.bisComboTransformation();
        if (out.load(resultFile)!=False):
            print('out ', resultFile,' dims=',out.grids[0].data_array.shape);
            gold = bis_objects.bisComboTransformation();
            if (gold.load(test_target)!=False):
                print('gold ', test_target,' dims=',gold.grids[0].data_array.shape);
                if (comparison=='maxabs'):
                    diff=maxabsdiff(gold.grids[0].data_array,out.grids[0].data_array);
                else:
                    diff=computeNorm2(gold.grids[0].data_array,out.grids[0].data_array);
                return printResult(diff,threshold,toolname,test_type);
            else:
                return False;
        else:
            return False;

    print('---- Cannot compare type :',test_type);
    return False;



if __name__ == '__main__':

    # This works for recon

    sys.exit(loadParse(sys.argv[1],sys.argv));

    
