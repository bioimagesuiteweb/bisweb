import os;
import sys;

my_path=os.path.dirname(os.path.realpath(__file__));
root=os.path.abspath(my_path+'/../..')
sys.path.insert(0,root);

from biswebpython.core.bis_objects import *
from biswebpython.modules.smoothImage import *

# change this
fname1= root +'/test/testdata/indiv/prep.nii.gz';

input=bisImage();
input.load(fname1);
print('Input=',input.getDescription());
smooth=smoothImage();
print('-----------------------------------------');
smooth.execute( { 'input' : input }, { 'sigma' : 4.0, 'debug' : True });
output=smooth.getOutputObject('output');
print('-----------------------------------------');
print('Output=',output.getDescription());
#out.save('/tmp/a.nii.gz');
