require('../config/bisweb_pathconfig.js');
const BisFileServerClient=require('bis_fileserverclient');
const WebSocket = require('ws');
const genericio=require('bis_genericio');
const BisWebImage=require('bisweb_image');

//const bisasyncutil=require('bis_asyncutils');
//bisasyncutil.setVerbose(true);

const path=require('path');

let basedir=path.resolve(__dirname, '../web/images/');
console.log('Base dir=',basedir);


let p=async function() {
    

    let client=new BisFileServerClient(WebSocket);
    await client.authenticate();

    genericio.setFileServerObject(client);

    console.log('++++\n++++ File List\n++++');
    let p=await client.requestFileList('load');
    console.log('\n',JSON.stringify(p));

    console.log('++++\n++++ Base Dir\n++++');
    let bd=await client.getServerBaseDirectory();
    console.log('\nBase =',bd);

    console.log('++++\n++++ Temp Dir\n++++');
    let t=await client.getServerTempDirectory();
    console.log('\nTemp =',t);


    console.log('++++\n++++ Download File\n++++');
    let img=new BisWebImage();
    await img.load(`${basedir}/MNI_T1_2mm_stripped_ras.nii.gz`,'None');
    console.log('Done ', img.getDescription());

    

    for (let k=0;k<20;k++) {
        try {
            let f=await img.save(`${bd}/t.nii.gz`);
            console.log('\n Saved =',JSON.stringify(f));
            
            
            let img2=new BisWebImage();
            await img2.load(`${bd}/t.nii.gz`);
            
            console.log("Read",img2.getDescription());
            
            let out=img.compareWithOther(img2);
            console.log(JSON.stringify(out));
            if (out.testresult===false)
                process.exit(1);
        } catch(e) {
            console.log("Error =",e);
        }
    }

    process.exit();
};

try {
    p();
} catch(e) {
    console.log("Error",e);
}
