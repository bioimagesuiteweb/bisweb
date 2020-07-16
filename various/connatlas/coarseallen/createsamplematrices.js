require('../../../config/bisweb_pathconfig.js');


const bis_genericio=require("bis_genericio");
const BisWebMatrix=require("bisweb_matrix");

const matr=new BisWebMatrix();
matr.allocate(28,28,0.0,'float');

const matr2=new BisWebMatrix();
matr2.allocate(28,28,0.0,'float');


matr.setElement(0,1,1);
matr.setElement(1,0,1);
matr.setElement(0,10,1);
matr.setElement(10,0,1);
matr.setElement(5,7,1);
matr.setElement(7,5,1);
matr.setElement(11,12,1);
matr.setElement(12,11,1);

for (let row=0;row<162;row++) {
    for (let col=0;col<162;col++) {
        let v=matr.getElement(row,col);
        if (v>0.0) {
            console.log('Elem (',row,col,')=',v);
        }
    }
}


matr2.setElement(0,2,1);
matr2.setElement(2,0,1);
matr2.setElement(0,13,1);
matr2.setElement(13,0,1);
matr2.setElement(5,4,1);
matr2.setElement(4,5,1);
matr2.setElement(9,8,1);
matr2.setElement(8,9,1);


Promise.all([ matr.save('pos_allen_14.csv'),
              matr2.save('neg_allen_14.csv') ]).then( () => { console.log('Done');});
