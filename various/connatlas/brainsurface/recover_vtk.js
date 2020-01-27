let path=require('path');
let fs=require('fs');

require('../../../config/bisweb_pathconfig.js');

const bis_genericio=require("bis_genericio");

const filenames = [ 'lobes_left.json','lobes_right.json' ];

const outputnames = [ 'lobes_left.vtk','lobes_right.vtk' ];

const fn=async () => { 

    for (let mesh=0;mesh<=1;mesh++) {
        const obj= await bis_genericio.read(filenames[mesh]);
        const data=JSON.parse(obj.data);


        //console.log('\n\t\t saving in ',outname);
        //await bis_genericio.write(outname,out_arr,true);

        let outstr='# vtk DataFile Version 3.0\nvtk output\nASCII\nDATASET POLYDATA\n'
        let pts=data['points'];
        let numpts=Math.floor(pts.length/3);
        outstr=outstr+`POINTS ${numpts} float\n`;

        let pnames = [ 'points', 'points1', 'points2','points3'];
        for (let j=0;j<pnames.length;j++) {
            console.log(pnames[j],' =', data[pnames[j]].length/3);
        }
        console.log('maxpoint=',data['maxpoint']);

        
        let count=0;
        for (let i=0;i<pts.length;i++) {
            count++;
            outstr=outstr+pts[i]+' ';
            if (count===9) {
                outstr+='\n';
                count=0;
            }
        }
        outstr+='\n';

        let polys=data['triangles'];
        let numtri=Math.floor(polys.length/3);
        outstr+=`\nPOLYGONS ${numtri} ${numtri*4}\n`;
        let index=0;
        for (let i=0;i<numtri;i++) {
            outstr+=`3 ${polys[index]} ${polys[index+1]} ${polys[index+2]}\n`
            index+=3;
        }

        console.log('Saving in ',outputnames[mesh],' numpoints=',numpts,' numtri=',numtri);
        await bis_genericio.write(outputnames[mesh],outstr);
    }
}

fn().then( () => { console.log('All done') }).catch( (e) => { console.log('Error',e); });
