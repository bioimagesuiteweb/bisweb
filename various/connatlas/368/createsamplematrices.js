require('../../../config/bisweb_pathconfig.js');


const bis_genericio=require("bis_genericio");
const BisWebMatrix=require("bisweb_matrix");

const matr=new BisWebMatrix();
matr.allocate(368,368,0.0,'float');

const matr2=new BisWebMatrix();
matr2.allocate(368,368,0.0,'float');


matr.setElement(0,1,1);
matr.setElement(1,0,1);
matr.setElement(0,10,1);
matr.setElement(10,0,1);
matr.setElement(50,75,1);
matr.setElement(75,50,1);
matr.setElement(40,42,1);
matr.setElement(42,40,1);

for (let row=0;row<368;row++) {
    for (let col=0;col<368;col++) {
        let v=matr.getElement(row,col);
        if (v>0.0) {
            console.log('Elem (',row,col,')=',v);
        }
    }
}


matr2.setElement(0,2,1);
matr2.setElement(2,0,1);
matr2.setElement(0,311,1);
matr2.setElement(311,0,1);
matr2.setElement(50,274,1);
matr2.setElement(274,50,1);
matr2.setElement(180,282,1);
matr2.setElement(182,280,1);


Promise.all([ matr.save('pos_368.csv'),
              matr2.save('neg_368.csv') ]).then( () => { console.log('Done');});
