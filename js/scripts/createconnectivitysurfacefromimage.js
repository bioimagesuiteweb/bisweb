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
const BisWebImage=require('bisweb_image');
const surface=require('bis_connectivitysurface');
const extract=require('bis_connectivitysurfaceextract');
const surfaceMap=require('bis_connectivitysurfacemap');

function number(value) {
    const output=parseFloat(value);
    if (!Number.isFinite(output))
        throw new Error(`Expected a number, found ${value}`);
    return output;
}

function range(value) {
    const fields=value.split(/[:,]/).map((item) => parseInt(item));
    if (fields.length!==2 || !Number.isFinite(fields[0]) || !Number.isFinite(fields[1]) || fields[1]<fields[0])
        throw new Error(`Expected a range such as 1:224, found ${value}`);
    return fields;
}

function reportSurface(item) {
    const represented=new Set(item.indices);
    return {
        points : item.points.length/3,
        triangles : item.triangles.length/3,
        minimumParcel : Math.min(...represented),
        maximumParcel : Math.max(...represented),
        representedParcels : represented.size,
    };
}

program.version('1.0.0')
    .option('-i, --input <filename>','input labeled NIfTI image')
    .option('-o, --output <filename>','output connectivity surface .bin.gz')
    .option('--right-range <first:last>','right source-label range',range,[ 1,224 ])
    .option('--left-range <first:last>','left source-label range',range,[ 225,448 ])
    .option('--right-offset <integer>','dense label offset for the right surface',parseInt,1)
    .option('--left-offset <integer>','dense label offset for the left surface',parseInt,225)
    .option('--sigma <voxels>','Gaussian standard deviation in voxels',number,1.0)
    .option('--resample <factor>','output spacing relative to input spacing',number,2.0)
    .option('--adaptive','reduce smoothing and resampling only for labels that would otherwise disappear')
    .option('--skip-nearest','keep each extracted component label without legacy smoothing/nearest mapping')
    .option('--native-orientation','use the stored voxel order instead of forcing the input to RAS')
    .option('--vtk-prefix <filename>','also write <filename>_right.vtk and <filename>_left.vtk')
    .option('--reference <filename>','existing .bin.gz surface to compare structurally')
    .parse(process.argv);

async function main() {
    if (!program.input || !program.output)
        throw new Error('--input and --output are required');
    const image=new BisWebImage();
    await image.load(program.input,program.nativeOrientation ? false : 'RAS');
    const dimensions=image.getDimensions();
    const spacing=image.getSpacing();
    const data=image.getImageData();
    const extractionOptions={
        sigma : [ program.sigma,program.sigma,program.sigma ],
        resampleFactor : program.resample,
        adaptive : program.adaptive || false,
        progress(label,item,usedOptions) {
            const fallback=usedOptions.resampleFactor!==program.resample || usedOptions.sigma[0]!==program.sigma;
            if ((label%25)===0 || fallback)
                console.log(`label ${label}: ${item.points.length/3} points, ${item.triangles.length/3} triangles`+
                            (fallback ? ` (fallback sigma=${usedOptions.sigma[0]}, resample=${usedOptions.resampleFactor})` : ''));
        },
    };
    const sourceSurfaces=[
        extract.extractLabelRange(data,dimensions,spacing,program.rightRange[0],program.rightRange[1],extractionOptions),
        extract.extractLabelRange(data,dimensions,spacing,program.leftRange[0],program.leftRange[1],extractionOptions),
    ];
    const offsets=[ program.rightOffset,program.leftOffset ];
    const outputSurfaces=sourceSurfaces.map((item,index) => {
        if (program.skipNearest)
            return surface.offsetParcelIndices(item,offsets[index]);
        return surfaceMap.mapParcelsUsingSmoothedNearest(item,{ offset : offsets[index] });
    });
    const packed=surface.packConnectivitySurfaces(outputSurfaces);
    fs.writeFileSync(program.output,zlib.gzipSync(packed));
    if (program.vtkPrefix) {
        fs.writeFileSync(`${program.vtkPrefix}_right.vtk`,surface.serializeLegacyVTKASCII(outputSurfaces[0],'JavaScript right atlas surface'));
        fs.writeFileSync(`${program.vtkPrefix}_left.vtk`,surface.serializeLegacyVTKASCII(outputSurfaces[1],'JavaScript left atlas surface'));
    }
    const report={
        input : program.input,
        output : program.output,
        dimensions : dimensions.slice(0,3),
        spacing : spacing.slice(0,3),
        orientation : image.getOrientationName(),
        sigma : program.sigma,
        resampleFactor : program.resample,
        adaptive : program.adaptive || false,
        legacyNearestMapping : !program.skipNearest,
        right : reportSurface(outputSurfaces[0]),
        left : reportSurface(outputSurfaces[1]),
        compressedBytes : fs.statSync(program.output).size,
    };
    if (program.reference) {
        report.reference=program.reference;
        report.comparison=surface.compareConnectivitySurfaces(
            packed,zlib.gunzipSync(fs.readFileSync(program.reference)));
    }
    console.log(JSON.stringify(report,null,2));
}

main().catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
});
