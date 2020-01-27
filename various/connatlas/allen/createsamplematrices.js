require('../../../config/bisweb_pathconfig.js');


const bis_genericio=require("bis_genericio");
const BisWebMatrix=require("bisweb_matrix");

const matr=new BisWebMatrix();
matr.allocate(160,160,0.0,'float');

const matr2=new BisWebMatrix();
matr2.allocate(160,160,0.0,'float');


matr.setElement(0,1,1);
matr.setElement(1,0,1);
matr.setElement(0,10,1);
matr.setElement(10,0,1);
matr.setElement(50,75,1);
matr.setElement(75,50,1);
matr.setElement(40,42,1);
matr.setElement(42,40,1);

for (let row=0;row<160;row++) {
    for (let col=0;col<160;col++) {
        let v=matr.getElement(row,col);
        if (v>0.0) {
            console.log('Elem (',row,col,')=',v);
        }
    }
}


matr2.setElement(0,2,1);
matr2.setElement(2,0,1);
matr2.setElement(0,121,1);
matr2.setElement(121,0,1);
matr2.setElement(50,154,1);
matr2.setElement(154,50,1);
matr2.setElement(130,132,1);
matr2.setElement(132,130,1);


Promise.all([ matr.save('pos_allen.csv'),
              matr2.save('neg_allen.csv') ]).then( () => { console.log('Done');});
