import sys;
import os;
import json

my_path=os.path.dirname(os.path.realpath(__file__));
sys.path.append(os.path.abspath(my_path+'/../..'));

import biswebpython.core.bis_objects as bis;


sur0 = bis.bisSurface();
sur0.load('index_left_2.json');
print('Size=',sur0.vertices.shape,sur0.faces.shape,sur0.labels.shape);

sur = bis.bisSurface();
sur.load('inflated_1.ply');
print('Size=',sur.vertices.shape,sur.faces.shape,sur.labels.shape);
print('Saving');
sur.save('lobes_left.json');




