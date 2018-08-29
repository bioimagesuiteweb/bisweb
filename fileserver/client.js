require('../config/bisweb_pathconfig.js');
const BisFileServerClient=require('bis_fileserverclient');
const WebSocket = require('ws');
const bisasyncutil=require('bis_asyncutils');
const genericio=require('bis_genericio');
const BisWebImage=require('bisweb_image');
bisasyncutil.setVerbose(true);



let p=async function() {
    

    let client=new BisFileServerClient(WebSocket);
    await client.authenticate();

    genericio.setFileServerObject(client);

    console.log('++++\n++++ File List\n++++');
    let p=await client.requestFileList('load');
    console.log('\n',JSON.stringify(p));

    console.log('++++\n++++ Base Dir\n++++');
    let q=await client.getServerBaseDirectory();
    console.log('\nBase =',q);

    console.log('++++\n++++ Temp Dir\n++++');
    let t=await client.getServerTempDirectory();
    console.log('\nTemp =',t);


    console.log('++++\n++++ Download File\n++++');
    let img=new BisWebImage();
    let d=await img.load('/Users/Xenios/Desktop/MNI_T1_2mm_stripped_ras.nii.gz','None');
    console.log('Done ', img.getDescription());


    let f=await img.save('/Users/xenios/Desktop/t.nii.gz');
    console.log('\n Saved =',f);

    console.log('Here We go');
    let img2=new BisWebImage();
    let d2=await img2.load('/Users/xenios/Desktop/t.nii.gz');

    console.log("Read",img2.getDescription());
    
    let out=img.compareWithOther(img2);
    console.log(JSON.stringify(out));

    process.exit();
};

try {
    p();
} catch(e) {
    console.log("Error",e);
}
