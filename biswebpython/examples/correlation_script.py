import os;
import sys;

my_path=os.path.dirname(os.path.realpath(__file__));
root=os.path.abspath(my_path+'/../..')
sys.path.insert(0,root);

from biswebpython.core.bis_objects import *
import biswebpython.core.bis_baseutils as bis_baseutils;


# change this
fname1= root +'/test/testdata/indiv/prep.nii.gz';
fname2= root +'/test/testdata/indiv/group.nii.gz';

input=bisImage(); input.load(fname1); print('Input=',input.getDescription());
roi=bisImage(); roi.load(fname2); print('ROI=',roi.getDescription());

# Needed because it is slightly different!
# Change C++ code to ignore tiny differences
roi.spacing=input.spacing;

lib=bis_baseutils.getDynamicLibraryWrapper();
timeseries=lib.computeROIWASM(input,roi,{},1);
print('Timeseries done',timeseries.shape);

cc=lib.computeCorrelationMatrixWASM(timeseries,0, { 'zscore' : True },1);
print('CC done',cc.shape);

mat=bisMatrix();
mat.create(cc);
mat.save('cc.csv');

sys.exit(0);
