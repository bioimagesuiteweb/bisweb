require('../../config/bisweb_pathconfig.js');

const fs=require('fs');
const BisWebImage=require('bisweb_image');

let img=new BisWebImage();
let img2=new BisWebImage();
let p= [ img.load('command_crop_thr.nii'),
         img2.load('manual_crop_thr.nii'),
       ];

Promise.all(p).then( () => {


    let header=img.getHeader();
    header.extensions='';

    let header2=img2.getHeader();
    header2.extensions='';

    fs.writeFileSync('header1.txt',JSON.stringify(header,null,2));
    fs.writeFileSync('header2.txt',JSON.stringify(header2,null,2));


    img.commentlist = [];
    img2.commentlist = [];

    img.save('command_noext.nii').then( () => {
        img2.save('manual_noext.nii').then( () => {
            console.log('done');
        });
    });
                                             

});
