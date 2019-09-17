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

import os
import sys
import biswebpython.core.bis_objects as bis_objects;
import biswebpython.core.bis_baseutils as bis_baseutils;

class baseModule:

    def __init__(self):
        self.name='baseModule'
        self.inputs= {};
        self.outputs={};
        self.description=None;


    def createNullPointers(self):
        desc = self.getDescription();
        for i in range(0,len(desc['inputs'])):
            param=desc['inputs'][i];
            vname = param['varname'];
            self.inputs[vname]=None;

        for i in range(0,len(desc['outputs'])):
            param=desc['outputs'][i];
            vname = param['varname'];
            self.outputs[vname]=None;

    def getDescription(self):
        if (self.description == None):
            self.description=self.createDescription();
            self.createNullPointers();
        return self.description;


    def execute(self,inputs={},values={}):

        params=self.parseValues(values);
        for p in inputs:
            #print('Setting input p=',p,inputs[p]);
            self.setInputObject(inputs[p],p);
        #print(self.inputs);

        return self.directInvokeAlgorithm(params);

    def directInvokeAlgorithm(self,vals):
        return False;

    def setInputObject(self,obj,name='input'):
        self.inputs[name]=obj;

    def getOutputObject(self,name='output'):
        return self.outputs[name];

    def parseValues(self,args):
        des = self.getDescription();
        out = {};
        for j in range(0,len(des['params'])):
            param=des['params'][j];
            vname = param['varname'];
            name = vname.lower();

            found=False
            if (name in args):
                found=True;

            if (found==True and args[name] is not None):
                found=True;
            else:
                found=False;

            if (found==False):
                defaultv = param['default'];
                out[vname] = defaultv;
            else:
                out[vname] = args[name];

        return out;


    def parseValuesAndAddDefaults(self,args,extra):
        des = self.getDescription();
        out = {};
        for j in range(0,len(des['params'])):
            param=des['params'][j];
            vname = param['varname'];
            name = vname.lower();

            found=False
            if (name in args):
                found=True;

            if (found==True and args[name] is not None):
                found=True;
            else:
                found=False;

            if (found==False):
                
                if (name in extra):
                    out[vname]=extra[name];
                else:
                    defaultv = param['default'];
                    out[vname] = defaultv;
            else:
                out[vname] = args[name];

        return out;

    
    def typeCheckParam(self,param, val):

        try:
            tp=param['type'];
        except:
            tp="string";

        try:
            a=param['default'];
        except:
            print('Parameter', param['name'], 'does not have a default value');
            return False;


        if (tp=="bool" or tp=="boolean") :
            return (val in ['0', '1', True, False, 'true', 'false', 'True','False','on', 'off' ]);

        restrict=None;
        if ('restrict' in param):
            restrict=param['restrict']
        elif ('restrictAnswer' in param):
            restrict=param['restrictAnswer']

        lowval=None;
        if ('lowwval' in param):
            lowval=param['lowval']
        elif ('low' in param):
            lowval=param['low']

        highval=None;
        if ('highwval' in param):
            highval=param['highval']
        elif ('high' in param):
            highval=param['high']

        if (restrict!=None):
            if (not val in restrict):
                print('----\n---- Parameter', param['name'] , ' val=',val, 'is not in ', restrict);
                return False;


        if (lowval!=None):
            if (val < lowval):
                print('----\n---- Parameter', param['name'] , ' val=',val, 'is < bound=',lowval);
                return False;

        if (highval!=None):
            if (val > highval):
                print('----\n---- Parameter', param['name'] , ' val=',val, 'is > bound=',highval);
                return False;

            return True;

    def typeCheckParams(self,vals):
        desc = self.getDescription();

        for i in range (0,len(desc['params'])):
            param = desc['params'][i];
            if (self.typeCheckParam(param, vals[param['varname']])==False):
                print('Error: parameter with name=', param['varname'], ', and  value=', vals[param['varname']], ' does not match expected.');
                return False;


        return True;


    def loadSingleInput(self,key,filename,objecttype):

        if (objecttype=='image'):
            self.inputs[key]=bis_objects.bisImage();
        elif (objecttype=='surface'):
            self.inputs[key]=bis_objects.bisSurface();
        elif (objecttype=='matrix' or objecttype=='vector'):
            self.inputs[key]=bis_objects.bisMatrix();
        elif (objecttype == 'transformation' or objecttype == 'transform'):
            self.inputs[key]= bis_objects.loadTransformation(filename);
            if (self.inputs[key]==None):
                return False;
            return True

        try:
            ok=self.inputs[key].load(filename);
            if (ok!=False and objecttype != 'surface'):
                sz=self.inputs[key].data_array.shape;
                if (sz[1]==1 and objecttype=='vector'):
                    tmp=self.inputs[key];
                    self.inputs[key]=bis_objects.bisVector();
                    self.inputs[key].create(tmp.data_array.flatten());
                    ok=self.inputs[key];
            elif (ok==False):
                return False;
        except:
            return False;

        print('++++ \t loaded '+objecttype+' '+key+' from '+filename);
        if (ok!=False):
            return True;
        return ok;


    def loadInputs(self,inputparameters={},basedir='',tempdir=''):

        desc = self.getDescription();
        for i in range(0,len(desc['inputs'])):
            param=desc['inputs'][i];
            vname = param['varname'];
            name = vname.lower();
            inpname=None;
            if (name in inputparameters):
                inpname=inputparameters[name]
            else:
                print('No',name,' in inputparameters',inputparameters);

            required=False;
            if ('required' in param):
                required =param['required'];

            objtype=param['type'];

            if (required and inpname==None):
                print('.... Can not load '+name+' '+objtype+', no filename specified');
                return False;

            if (required or inpname != None):
                inpname=bis_baseutils.downloadIfNeeded(inpname,basedir,tempdir);
                ok=self.loadSingleInput(name,inpname,objtype);
                if (ok==False):
                    return False;

        return True;

    def saveOutputs(self,inputparameters={}):

        desc = self.getDescription();
        for i in range(0,len(desc['outputs'])):
            param=desc['outputs'][i];
            vname = param['varname'];
            name = vname.lower();

            try:
                outname=inputparameters[name]
            except:
                outname=None;
                print('No',name,' in inputparameters',inputparameters);

            try:
                required =param['required'];
            except:
                required=False;

            objtype=param['type'];


            if (required and outname==None):
                print('.... Can not save '+name+' '+objtype+', no filename specified');
                return False;

            if (required==True or outname != None):
                print('.... Initializing writing of ',name,outname,objtype);
                try:
                    ok=self.outputs[name].save(outname);
                except:
                    e = sys.exc_info()[0]
                    print('---- Failed ',e);
                    return False;
        return True;

    def parseBoolean(self,val):

        if (val in [ '1', 'true' , True,'True','on']):
            return True;
        return False;

    def getModuleDescriptionFromFile(self,classname):
        return bis_baseutils.getModuleDescriptionFromFile(classname)

    def getDynamicLibraryWrapper(self):
        return bis_baseutils.getDynamicLibraryWrapper();
