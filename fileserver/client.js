require('../config/bisweb_pathconfig.js');
const BisFileServerClient=require('bis_fileserverclient');
const WebSocket = require('ws');
const bisasyncutil=require('bis_asyncutils');

bisasyncutil.setVerbose(true);



let p=async function() {
    

    let client=new BisFileServerClient(WebSocket);
    await client.authenticate();

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
    let d=await client.downloadFile('/Users/Xenios/Desktop/MNI_T1_2mm_stripped_ras.nii.gz',true);
    console.log('\nFile=',d.filename, ' size=',d.data.length);
    process.exit();
};

p();
