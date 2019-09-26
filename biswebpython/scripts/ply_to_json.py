import sys;
import os;
import json
my_path=os.path.dirname(os.path.realpath(__file__));
sys.path.append(os.path.abspath(my_path+'/../..'));
import biswebpython.core.bis_objects as bis;

# -------------

names = [
    [ 'index_left_2.vtk.json' , 'left2' , 'lobes_left.json'  ],
    [ 'index_right_2.vtk.json', 'right2', 'lobes_right.json' ],
    [ 'index_left_3.vtk.json' , 'left3' , 'lobes3_left.json'  ],
    [ 'index_right_3.vtk.json', 'right3', 'lobes3_right.json' ]
];

steps = [ 5,15,45 ];
begin=2;

print('\n _________________________________________________');

for row in range (begin,len(names)):

    print('\n Row ',row,'/2');
    fname=names[row][0];
    print('___ loading from',fname);    
    orig = bis.bisSurface();
    orig.load(fname);
    
    data=orig.toDictionary();

    print('\n                     _________________________');
    for elem in range (0,len(steps)):

        fname2=names[row][1]+'/inflated_'+str(steps[elem])+'.ply';
        print('___ loading from',fname2);
        sur = bis.bisSurface();
        sur.load(fname2);
        data1=sur.toDictionary();

        n='points'+str(elem+1);
        data[n]=data1['points'];
    

    data['numelements']=len(steps)+1;
        
    filename=names[row][2];
    outdata=json.dumps(data);
    with open(filename, 'w') as fp:
        fp.write(outdata);
        print('++++\t saved in ',filename,len(outdata));


sys.exit(0);




