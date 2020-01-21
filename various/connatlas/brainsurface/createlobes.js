let path=require('path');
let fs=require('fs');

require('../../../config/bisweb_pathconfig.js');


const bis_genericio=require("bis_genericio");

const setupname = "setup.json"

const fn=async () => { 

    console.log("Reading ",setupname);

    const obj= await bis_genericio.read(setupname);
    let dat=obj.data;
    let filenames=JSON.parse(dat);
    console.log("Filenames=",JSON.stringify(filenames,null,2));
    
    for (let i=0;i<=1;i++) {

        let multiresobj = await bis_genericio.read(filenames.multires[i]);
        let atlasobj= await bis_genericio.read(filenames.atlas[i]);

        let multires=JSON.parse(multiresobj.data);
        let atlas=JSON.parse(atlasobj.data);
        
        console.log('Parsed ',filenames.multires[i],filenames.atlas[i],Object.keys(atlas),Object.keys(multires));
        
        multires.indices=atlas.indices;

        let outname=filenames.output[i];
        let out=JSON.stringify(multires);

        await bis_genericio.write(outname,out);
        console.log('Saved in',outname);
    }
}

fn().then( () => { console.log('All done') }).catch( (e) => { console.log('Error',e); });
