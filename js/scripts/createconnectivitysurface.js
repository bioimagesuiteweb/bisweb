#!/usr/bin/env node

/*  LICENSE

    _This file is Copyright 2026 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._

    BioImage Suite Web is licensed under the Apache License, Version 2.0.
*/

'use strict';

require('../../config/bisweb_pathconfig.js');
const fs=require('fs');
const zlib=require('zlib');
const program=require('commander');
const connectivitySurface=require('bis_connectivitysurface');

function integer(value) {
    const output=parseInt(value);
    if (!Number.isFinite(output))
        throw new Error(`Expected an integer, found ${value}`);
    return output;
}

function summarize(surface) {
    let minimumParcel=Number.POSITIVE_INFINITY;
    let maximumParcel=Number.NEGATIVE_INFINITY;
    const represented=new Set();
    for (const value of surface.indices) {
        minimumParcel=Math.min(minimumParcel,value);
        maximumParcel=Math.max(maximumParcel,value);
        represented.add(value);
    }
    return {
        points : surface.points.length/3,
        triangles : surface.triangles.length/3,
        minimumParcel,
        maximumParcel,
        representedParcels : represented.size,
    };
}

program.version('1.0.0')
    .option('--right <filename>','right-hemisphere legacy VTK surface')
    .option('--left <filename>','left-hemisphere legacy VTK surface')
    .option('-o, --output <filename>','output connectivity surface .bin.gz')
    .option('--right-offset <integer>','offset added to right VTK point scalars',integer,0)
    .option('--left-offset <integer>','offset added to left VTK point scalars',integer,0)
    .option('--reference <filename>','existing .bin.gz surface to compare against')
    .parse(process.argv);

try {
    if (!program.right || !program.left || !program.output)
        throw new Error('--right, --left, and --output are required');
    const right=connectivitySurface.offsetParcelIndices(
        connectivitySurface.parseLegacyVTK(fs.readFileSync(program.right)),
        program.rightOffset);
    const left=connectivitySurface.offsetParcelIndices(
        connectivitySurface.parseLegacyVTK(fs.readFileSync(program.left)),
        program.leftOffset);
    const packed=connectivitySurface.packConnectivitySurfaces([ right,left ]);
    fs.writeFileSync(program.output,zlib.gzipSync(packed));

    const report={
        output : program.output,
        packedBytes : packed.length,
        compressedBytes : fs.statSync(program.output).size,
        right : summarize(right),
        left : summarize(left),
    };
    if (program.reference) {
        const reference=zlib.gunzipSync(fs.readFileSync(program.reference));
        report.reference=program.reference;
        report.comparison=connectivitySurface.compareConnectivitySurfaces(packed,reference);
    }
    console.log(JSON.stringify(report,null,2));
} catch(e) {
    console.error(e.stack || e);
    process.exit(1);
}
