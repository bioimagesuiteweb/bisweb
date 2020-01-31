let path=require('path');
let fs=require('fs');

require('../../../config/bisweb_pathconfig.js');


const bis_genericio=require("bis_genericio");

const setupname = "setup.json"

const fn=async () => { 

    console.log("Reading ",setupname);

    const pieces=[null,null];
    
    const obj= await bis_genericio.read(setupname);
    let dat=obj.data;
    let filenames=JSON.parse(dat);
    console.log("Filenames=",JSON.stringify(filenames,null,2));
    
    for (let i=0;i<=1;i++) {

        let multiresobj = await bis_genericio.read(filenames.multires[i]);
        let atlasobj= await bis_genericio.read(filenames.atlas[i]);

        let multires=JSON.parse(multiresobj.data);
        multires.indices = multires.indices || [];

        
        let atlas=JSON.parse(atlasobj.data);
        atlas.indices = atlas.indices || [];
        console.log('\n-----------------------------\n');
        console.log('Parsed ',filenames.multires[i],filenames.atlas[i],Object.keys(atlas),Object.keys(multires),
                    '\n\t atlaspoints=',
                    atlas['points'].length,
                    'Multires=',multires['points'].length);

        console.log('Multires Lengths= triangles=',multires.triangles.length,' indices=',multires.indices.length,'points=',multires.points.length/3);
        console.log('Atlas Lengths= triangles=',atlas.triangles.length,' indices=',atlas.indices.length,'points=',atlas.points.length/3);
        
        multires.indices=atlas.indices;

        let outname=filenames.output[i];
        let out=JSON.stringify(multires);

        await bis_genericio.write(outname,out);
        console.log('Saved in',outname);

        pieces[i]=multires;
    }

    /*  
        Header = 1702 (4-byte) 
        Bin File
        Surface 1
        NumElements = something (4-byte)
        MaxPoint = something (4-byte)
        NumPoints = something (4-byte)
        NumTriangles = something (4-byte)
        Points[0] = floatarray
        ...
        Points[numelements-1]= floatarray
        Triangles = int32array
        indices=int16array
        Surface 2 repeat
    */

//    process.exit(0);
    
    let pnames = [ 'points', 'points1', 'points2','points3'];
    
    let length=4; // 5 int32s
    let out_arr=null,buffer=null;
    let cursor=0;
    let hasindices=true;
    
    for (let pass=0;pass<=1;pass++) {
        
        for (let mesh=0;mesh<=1;mesh++) {
            let numelements=pieces[mesh]['numelements'] || 1;
            let numpoints=Math.floor(pieces[mesh]['points'].length/3);
            let numtriangles=Math.floor(pieces[mesh]['triangles'].length/3);
            let maxpoint= pieces[mesh]['maxpoint'];

            if (pass===0) {
                // compute length
                length=length+16 + // header
                numpoints*3*4*numelements + // points
                numtriangles*3*4; // triangles //

                if (hasindices) {
                    if (pieces[mesh]['indices'].length>0)
                        length=length+numpoints*4; // indices;
                    else
                        hasindices=false;
                }
                console.log('Element mesh=',mesh,length, ' numelements=',numelements,' maxpoint=',maxpoint,' numpoints=',numpoints,' numtriangles=',numtriangles);
            } else {
                console.log('\n Working on Mesh',mesh);
                // header
                let header=new Uint32Array(buffer,cursor,4);
                cursor=cursor+header.byteLength;
                header[0]=numelements;
                header[1]=maxpoint;
                header[2]=numpoints;
                header[3]=numtriangles;

                // First Points
                for (let j=0;j<numelements;j++) {
                    let arr=new Float32Array(buffer,cursor,numpoints*3);
                    cursor=cursor+arr.byteLength;
                    console.log('Created points array',j,arr.length,arr.byteLength,'cursor=',cursor,'name=',pnames[j]);
                    
                    for (let i=0;i<arr.length;i++) {
                        arr[i]=pieces[mesh][pnames[j]][i];
                        if (j===0 && ( i<3 || i >=arr.length-3)) {
                            console.log('i=',i,arr[i]);
                        }
                    }
                }
                // Next Triangles
                let tarr=new Uint32Array(buffer,cursor,numtriangles*3);
                cursor=cursor+tarr.byteLength;
                console.log('Created triangles array ',tarr.length,tarr.byteLength,' cursor=',cursor);

                for (let i=0;i<numtriangles*3;i++) {
                    tarr[i]=pieces[mesh]['triangles'][i];
                }
                console.log('Triangles=',tarr[0],tarr[1],tarr[2],tarr[tarr.length-3],tarr[tarr.length-2],tarr[tarr.length-1]);

                if (hasindices) {
                    let iarr=new Uint32Array(buffer,cursor,numpoints);
                    cursor=cursor+iarr.byteLength;
                    console.log('Created Indices array ',iarr.length,iarr.byteLength,'cursor=',cursor);
                    
                    for (let i=0;i<numpoints;i++) {
                        iarr[i]=pieces[mesh]['indices'][i];
                    }
                    console.log('Indices=',iarr[0],iarr[1],iarr[2],iarr[25000],iarr[iarr.length-3],iarr[iarr.length-2],iarr[iarr.length-1]);
                }
                console.log('Done ' ,mesh,' cursor=',cursor,' total=',out_arr.length);
            }
        }

        if (pass===0) {
            out_arr=new Uint8Array(length);
            buffer=out_arr.buffer;
            let header1=new Uint32Array(buffer,0,1);
            if (hasindices)
                header1[0]=1702;
            else
                header1[0]=1703; // no indices
            cursor=4;
        }

        let outname=filenames.output[2];

        console.log('\n\t\t saving in ',outname);
        await bis_genericio.write(outname,out_arr,true);

    }
    
    
    
    
    
}

fn().then( () => { console.log('All done') }).catch( (e) => { console.log('Error',e); });
