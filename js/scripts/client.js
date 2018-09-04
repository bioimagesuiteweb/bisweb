require('../../config/bisweb_pathconfig.js');
const BisFileServerClient=require('bis_fileserverclient');
const WebSocket = require('ws');
const genericio=require('bis_genericio');
const BisWebImage=require('bisweb_image');
const path=require('path');
const util=require('bis_util');
let basedir=path.resolve(__dirname, '../../web/images/');
console.log('Base dir=',basedir);


let test_fn=async function() {
    

    let client=new BisFileServerClient(WebSocket);
    await client.authenticate('','ws://localhost:8081');

    genericio.setFileServerObject(client);

    console.log('++++\n++++ File List\n++++');
    let p=await client.requestFileList('load');
    console.log('\n',JSON.stringify(p));

    console.log('++++\n++++ Base Dir\n++++');
    let bd=await client.getServerBaseDirectory();
    bd=bd[0];
    console.log('\nBase =',bd);

    console.log('++++\n++++ Temp Dir\n++++');
    let t=await client.getServerTempDirectory();
    console.log('\nTemp =',t);

    let newdirname=bd+'/tmp_xenios';
    console.log('New dirname',newdirname);
    try {
        let f1=await genericio.getFileSize(`${basedir}/MNI_T1_2mm_stripped_ras.nii.gz`);
        console.log('File size=',f1);
        
        let f2=await genericio.isDirectory(basedir);
        console.log('Basedir is directory=',f2);
        
        let f3=await genericio.isDirectory(`${basedir}/MNI_T1_2mm_stripped_ras.nii.gz`);
        console.log('is File Directory=',f3);
        
        
        let f4=await genericio.makeDirectory(newdirname);
        console.log('made File Directory=',newdirname,f4);

        let f6=await genericio.isDirectory(newdirname);
        console.log(newdirname,' is directory=',f6);
        
    } catch(e) {
        console.log(e);
    }

    
    console.log('++++\n++++ Download File\n++++');
    let img=new BisWebImage();
    let f=`${basedir}/MNI_T1_2mm_stripped_ras.nii.gz`;
    if (path.sep==='\\')
        f=util.filenameWindowsToUnix(f);
    await img.load(f);
    console.log('Done ', img.getDescription());


    
    let maxk=20;

    for (let k=1;k<maxk;k+=5) {
        try {
            let fname=`${newdirname}/t${k}.nii.gz`;
            let f=await img.save(fname);
            console.log('\n Saved =',JSON.stringify(f));
            
            let img2=new BisWebImage();
            await img2.load(fname);
            
            console.log("Read",img2.getDescription());
            
            let out=img.compareWithOther(img2);
            console.log(JSON.stringify(out));
            if (out.testresult===false)
                process.exit(1);
        } catch(e) {
            console.log("Error =",e);
        }
    }

    console.log('++++\n++++ File List\n++++');
    let p0=await client.requestFileList('load',newdirname);
    console.log('\n',JSON.stringify(p0));

    let query=newdirname+'/*1*.nii.gz';
    console.log('---------------------------------------------',query);
    let p00=await genericio.getMatchingFiles(query);
    console.log('\n matched ',query,'=',JSON.stringify(p00));

    try {
        let f5=await genericio.deleteDirectory(newdirname);
        console.log('deleted Directory=',newdirname,f5);
    } catch(e) {
        console.log('Failed to delete Directory',newdirname,e);
    }

    
    process.exit();
};

try {
    test_fn();
} catch(e) {
    console.log("Error",e);
}

