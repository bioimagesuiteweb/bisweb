import sys;
import os;
import json
import numpy;
my_path=os.path.dirname(os.path.realpath(__file__));
sys.path.append(os.path.abspath(my_path+'/../..'));
import biswebpython.core.bis_objects as bis;

# -------------

names = [
    [ 'index_big_combo_left_2.vtk.json' , 'left_small' , 'lobes_left.json' , 5494 , 2985 ],
    [ 'index_big_combo_right_2.vtk.json', 'right_small', 'lobes_right.json', 5610 , 3156 ],

];

steps = [ 1] ; # [ 50,250,550 ]
begin=0;
end=2;

print('\n _________________________________________________');

for row in range (begin,end):

    print('\n Row ',row,'/2');
    fname=names[row][0];
    print('___ loading from',fname);    
    orig = bis.bisSurface();
    orig.load(fname);
    print(orig.vertices[0],orig.vertices[1],orig.vertices[2]);
    print(orig.faces[0],orig.faces[1],orig.faces[2]);
    
    data=orig.toDictionary();

    first=0;
    
    print('\n                     _________________________');
    for elem in range (0,len(steps)):

        fname2=names[row][1]+'/inflated_'+str(steps[elem])+'.ply';
        print('___ loading from',fname2);
        sur = bis.bisSurface();
        sur.load(fname2);

        origvert=orig.vertices;
        

        np=sur.vertices.shape[0];
        np2=origvert.shape[0];

        numrep=int(names[row][3]+names[row][4]);
        first=0
        data['maxbrain']=first;
        

        print('First point');
        print(orig.vertices[0],sur.vertices[0]);
        dist=0.0;
        index=0;
        while dist < 5.0 and index < np:
            dist=abs(orig.vertices[index][2]-sur.vertices[index][2]);
            print(index,dist);
            if (dist<5.0):
                index=index+1;

        first=index;
        print('Replacing points ',0,':',first,' of',np,np2, ' dist=',dist);
        print('Last good');
        print(sur.vertices[first-1],orig.vertices[first-1]);
        print('First bad');
        print(sur.vertices[first],orig.vertices[first]);
        
        for pt in range (0,first):
            for i in range (0,3):
                origvert[pt][i]=sur.vertices[pt][i];

        sh=origvert.shape;
        n='points'+str(elem+1);
        data[n]=numpy.reshape(origvert,[ sh[0]*sh[1]]).tolist();
    

    data['numelements']=len(steps)+1;

    
    filename=names[row][2];
    outdata=json.dumps(data);
    with open(filename, 'w') as fp:
        fp.write(outdata);
        print('++++\t saved in ',filename,len(outdata));


sys.exit(0);




