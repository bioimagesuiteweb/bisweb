#!/usr/bin/env python3

# ----------------------------------------------------------------------------------------
# Imports and paths
import os
import sys
import importlib


my_path=os.path.dirname(os.path.realpath(__file__));

# Make sure biswebpython is in your path
n=os.path.abspath(my_path+'/..')
sys.path.insert(0,n);

# ----------------------------------------------------------------------------------------
# Function to print error message
# -------------------------------
def initialError(extra):
    global modulelist
    print(extra+'\nUsage: biswebpy modulename [ options ]\n');
    print('Type "biswebpy [module name] --help" for more information');
    print('\tThe list of available modules is :\n\n'+'\n'.join(modulelist));


# ----------------------------------------------------------------------------------------
# Read Modulelist file and clean it up
with open(my_path+os.path.sep+"modules"+os.path.sep+"PythonModuleList.txt", "r") as fh:
    mlist = list(fh.read().splitlines())
modulelist=[];
modulelistlower=[];
    
for l in mlist:
    if l.strip():
        l=l.strip();
        modulelist.append(l);
        modulelistlower.append(l.lower());


# ----------------------------------------------------------------------------------------
# Argument checking
#
argc=len(sys.argv);
if (argc<2):
    initialError('Specify the tool to load ...');
    sys.exit(0);

toolname=sys.argv[1];
tname=toolname.lower();

if tname not in modulelistlower:
    initialError('\n---- The module '+toolname+' does not exist');
    sys.exit(0)

index=modulelistlower.index(tname);
packagename='biswebpython.modules.'+modulelist[index];

print('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
print('++++ Executing biswebpython module: '+modulelist[index]);
print('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');

# Get the module
f=importlib.import_module(packagename);
mymodule=getattr(f,modulelist[index]);

# Rehash sys.argv
newargv=[sys.argv[0]+' '+modulelist[index]];
for i in range(0,argc):
    if i>1:
        newargv.append(sys.argv[i]);
sys.argv=newargv;

# Import command line and execute module
import biswebpython.core.bis_commandline as bis_commandline;
sys.exit(bis_commandline.loadParse(mymodule(),sys.argv,False));


