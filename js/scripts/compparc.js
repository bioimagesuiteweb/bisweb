require('../../config/bisweb_pathconfig.js');

const bis_genericio=require('bis_genericio');

const fn=async function() {

    let f1=await bis_genericio.readJSON(process.argv[2],'Parcellation');
    let f2=await bis_genericio.readJSON(process.argv[3],'Parcellation');

    
    let dat1=f1.data;
    let dat2=f2.data;
    
    console.log('f1=',f1.filename);
    console.log('f2=',f2.filename);

    let r1=dat1.rois;
    let r2=dat2.rois;
    
    for (let j=0;j<r1.length;j++) {
        let e= [ r1[j], r2[j] ];
        let c=[ e[0].x, e[0].y,e[0].z, e[1].x,e[1].y,e[1].z ];
        let s1=e[0].attr;
        let s2=e[1].attr;
        console.log(c.join(',')+','+s1.join(',')+','+s2.join(','));
    }
    
    
    return 'done';
};


fn().then( (f) => { console.log(f); process.exit(0); }).catch( (e) => { console.log(e); process.exit(1); });
