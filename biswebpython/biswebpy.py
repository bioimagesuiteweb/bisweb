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



try:
    import biswebpython.bisConfigure as bisConfigure
except ImportError:
    my_path=os.path.dirname(os.path.realpath(__file__));
    n=my_path+'/../build/native';
    l=sys.path;
    if (n not in l):
        sys.path.append(n);
        
    n=my_path+'/../build/native';
    l=sys.path;
    if (n not in l):
        sys.path.append(n);
        
    import bisConfigure
            




# ----------------------------------------------------------------------------------------
# Function to print error message
# -------------------------------
def initialError(extra):
    global modulelist
    print(extra+'\nUsage: biswebpy modulename [ options ]\n');
    print('Type "biswebpy [module name] --help" for more information');
    count=0
    a='';
    print('\tThe list of available modules is :\n')
    #+'\n'.join(modulelist));
    for p in modulelist:
        a=a+'  {:29s}'.format(p);
        count=count+1;
        if (count==3):
            count=0;
            a=a+('\n');
    print(a+'\n')



    
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
        
if bisConfigure.usesafni == "ON":
    with open(my_path+os.path.sep+"modules"+os.path.sep+"PythonModuleListAFNI.txt", "r") as fh2:
        mlist2 = list(fh2.read().splitlines())

    for l in mlist2:
        if l.strip():
            l=l.strip();
            modulelist.append(l);

modulelist.sort();
l=len(modulelist)
for i in range(0,l):
    modulelistlower.append(modulelist[i].lower());


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
