#!/usr/bin/env node

'use strict';

const fs=require('fs');
const path=require('path');
const zlib=require('zlib');

const filename=path.resolve(__dirname,'output/allen_fine_surface_atlas_gold.bin.gz');
const buffer=zlib.gunzipSync(fs.readFileSync(filename));

let cursor=0;
const readUint32=() => {
    const value=buffer.readUInt32LE(cursor);
    cursor+=4;
    return value;
};

const magic=readUint32();
if (magic!==1702)
    throw new Error(`Expected surface-atlas magic 1702, found ${magic}`);

const expectedRanges=[ [ 1,224 ],[ 225,448 ] ];
const hemisphereNames=[ 'right','left' ];
const summaries=[];

for (let hemisphere=0;hemisphere<2;hemisphere++) {
    const numelements=readUint32();
    const maxpoint=readUint32();
    const numpoints=readUint32();
    const numtriangles=readUint32();

    const pointBytes=numelements*numpoints*3*4;
    if (cursor+pointBytes>buffer.length)
        throw new Error(`Truncated ${hemisphereNames[hemisphere]} point data`);
    cursor+=pointBytes;

    let maximumTriangleIndex=0;
    for (let i=0;i<numtriangles*3;i++)
        maximumTriangleIndex=Math.max(maximumTriangleIndex,readUint32());

    if (maximumTriangleIndex>=numpoints)
        throw new Error(`${hemisphereNames[hemisphere]} triangle index ${maximumTriangleIndex} exceeds point count ${numpoints}`);

    let minimumParcel=Number.POSITIVE_INFINITY;
    let maximumParcel=Number.NEGATIVE_INFINITY;
    const parcels=new Set();
    for (let i=0;i<numpoints;i++) {
        const parcel=readUint32();
        minimumParcel=Math.min(minimumParcel,parcel);
        maximumParcel=Math.max(maximumParcel,parcel);
        parcels.add(parcel);
    }

    const expected=expectedRanges[hemisphere];
    if (minimumParcel<expected[0] || maximumParcel>expected[1])
        throw new Error(`${hemisphereNames[hemisphere]} parcels ${minimumParcel}..${maximumParcel} fall outside ${expected[0]}..${expected[1]}`);

    summaries.push({
        hemisphere : hemisphereNames[hemisphere],
        numelements,
        maxpoint,
        numpoints,
        numtriangles,
        maximumTriangleIndex,
        minimumParcel,
        maximumParcel,
        representedParcels : parcels.size,
    });
}

if (cursor!==buffer.length)
    throw new Error(`Parsed ${cursor} bytes but the uncompressed file contains ${buffer.length}`);

console.log(JSON.stringify({
    filename,
    compressedBytes : fs.statSync(filename).size,
    uncompressedBytes : buffer.length,
    magic,
    hemispheres : summaries,
},null,2));
