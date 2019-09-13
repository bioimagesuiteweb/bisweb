import os
import setuptools
import sys

print('-------------------------------------------------------');
my_path=os.path.dirname(os.path.realpath(__file__));
n=os.path.abspath(my_path+'/..')
sys.path.append(n);

with open("modules/PythonModuleList.txt", "r") as fh:
    mlist = list(fh.read().splitlines())
modulelist=[];
modulelistlower=[];
    
for l in mlist:
    if l.strip():
        l=l.strip();
        modulelist.append(l);
        modulelistlower.append(l.lower());

def initialError(extra):

    global modulelist
    print(extra+'\nUsage: biswebpy modulename [ options ]\n');
    print('Type "biswebpy [module name] --help" for more information');
    print('\tThe list of available modules is :\n\n'+'\n'.join(modulelist));


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

newargv=[];
for i in range(2,argc):
    newargv.append(sys.argv[i]);

cmd=sys.executable+' '+my_path+os.path.sep+'modules'+os.path.sep+modulelist[index]+'.py '+(' ').join(newargv);

print('Executing '+cmd);
print('-------------------------------------------------------');
sys.exit(os.system(cmd));
