let path=require('path');
let fs=require('fs');

require('../../../config/bisweb_pathconfig.js');


const bis_genericio=require("bis_genericio");

const setupname = "setup.json"


/*let idata = [ [ 'index_big_combo_right_2.vtk.json', 'lobes_right.json' ],
              [ 'index_big_combo_left_2.vtk.json' , 'lobes_left.json' ] ];
              let odata= [ 'lobes_368_right.json' ,  'lobes_368_left.json' ];*/

const fn=async () => { 

    console.log("Reading ",setupname);

    const obj= await bis_genericio.read(setupname);
    let dat=obj.data;
    let filenames=JSON.parse(dat);
    console.log("Filenames=",JSON.stringify(filenames,null,2));
    
    for (let i=0;i<=1;i++) {

        let ppp = await bis_genericio.read(filenames.multires[i]);
        let orig= await bis_genericio.read(filenames.atlas[i]);
        let parcels=JSON.parse(ppp.data);
        let input=JSON.parse(orig.data);
        console.log('Parsed ',filenames.multires[i],filenames.atlas[i],Object.keys(parcels),Object.keys(input));
        
        input.indices=parcels.indices;

        let outname=filenames.output[i];
        let out=JSON.stringify(input);

        await bis_genericio.write(outname,out);
        console.log('Saved in',outname);
    }
}

fn().then( () => { console.log('All done') }).catch( (e) => { console.log('Error',e); });
