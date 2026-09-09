/*  LICENSE

    _This file is Copyright 2026 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._

    BioImage Suite Web is licensed under the Apache License, Version 2.0.
*/

/* global describe, it */

'use strict';

require('../config/bisweb_pathconfig.js');
const assert=require('assert');
const connectivitySurface=require('bis_connectivitysurface');
const extract=require('bis_connectivitysurfaceextract');

function createAsciiVTK() {
    return Buffer.from([
        '# vtk DataFile Version 3.0',
        'test surface',
        'ASCII',
        'DATASET POLYDATA',
        'POINTS 4 float',
        '0 0 0  1 0 0  0 1 0',
        '0 0 1',
        'POLYGONS 2 8',
        '3 0 1 2',
        '3 0 2 3',
        'POINT_DATA 4',
        'SCALARS scalars short',
        'LOOKUP_TABLE default',
        '0 1 1 2',
        '',
    ].join('\n'));
}

function createBinaryVTK() {
    const header=Buffer.from([
        '# vtk DataFile Version 3.0',
        'test surface',
        'BINARY',
        'DATASET POLYDATA',
        'POINTS 4 float',
        '',
    ].join('\n'));
    const points=Buffer.alloc(4*3*4);
    [ 0,0,0,1,0,0,0,1,0,0,0,1 ].forEach((value,index) => points.writeFloatBE(value,index*4));
    const polygonHeader=Buffer.from('\nPOLYGONS 2 8\n');
    const polygons=Buffer.alloc(8*4);
    [ 3,0,1,2,3,0,2,3 ].forEach((value,index) => polygons.writeInt32BE(value,index*4));
    const scalarHeader=Buffer.from('\nPOINT_DATA 4\nSCALARS scalars short\nLOOKUP_TABLE default\n');
    const scalars=Buffer.alloc(4*2);
    [ 0,1,1,2 ].forEach((value,index) => scalars.writeInt16BE(value,index*2));
    return Buffer.concat([ header,points,polygonHeader,polygons,scalarHeader,scalars ]);
}

describe('Connectivity surface VTK conversion and packing',function() {
    it('parses equivalent ASCII and binary legacy VTK surfaces',function() {
        const ascii=connectivitySurface.parseLegacyVTK(createAsciiVTK());
        const binary=connectivitySurface.parseLegacyVTK(createBinaryVTK());
        assert.deepEqual(Array.from(ascii.points),Array.from(binary.points));
        assert.deepEqual(Array.from(ascii.triangles),Array.from(binary.triangles));
        assert.deepEqual(Array.from(ascii.indices),Array.from(binary.indices));
    });

    it('packs and unpacks two labeled hemispheres',function() {
        const parsed=connectivitySurface.parseLegacyVTK(createAsciiVTK());
        const right=connectivitySurface.offsetParcelIndices(parsed,1);
        const left=connectivitySurface.offsetParcelIndices(parsed,10);
        const packed=connectivitySurface.packConnectivitySurfaces([ right,left ]);
        const unpacked=connectivitySurface.unpackConnectivitySurfaces(packed);
        assert.equal(unpacked.magic,1702);
        assert.deepEqual(Array.from(unpacked.surfaces[0].indices),[ 1,2,2,3 ]);
        assert.deepEqual(Array.from(unpacked.surfaces[1].indices),[ 10,11,11,12 ]);
        assert.deepEqual(Array.from(unpacked.surfaces[0].triangles),[ 0,1,2,0,2,3 ]);
    });

    it('uses VTK marching-cubes cases and round-trips ASCII output',function() {
        const generated=extract.marchingCubes({
            data : Float32Array.from([ 100,0,0,0,0,0,0,0 ]),
            dimensions : [ 2,2,2 ],
            gridOrigin : [ 0,0,0 ],
            factor : 1,
        },[ 1,1,1 ],50);
        generated.indices=Int32Array.from([ 7,7,7 ]);
        assert.equal(generated.points.length/3,3);
        assert.equal(generated.triangles.length/3,1);
        const text=connectivitySurface.serializeLegacyVTKASCII(generated);
        const reparsed=connectivitySurface.parseLegacyVTK(Buffer.from(text));
        assert.deepEqual(Array.from(reparsed.points),Array.from(generated.points));
        assert.deepEqual(Array.from(reparsed.triangles),Array.from(generated.triangles));
        assert.deepEqual(Array.from(reparsed.indices),Array.from(generated.indices));
    });
});
