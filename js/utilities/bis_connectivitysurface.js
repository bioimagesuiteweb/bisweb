/*  LICENSE

    _This file is Copyright 2026 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._

    BioImage Suite Web is licensed under the Apache License, Version 2.0.
*/

'use strict';

const MAGIC_WITH_PARCELS=1702;
const MAGIC_WITHOUT_PARCELS=1703;

const vtkScalarReaders={
    'char' : [ 1,'readInt8' ],
    'unsigned_char' : [ 1,'readUInt8' ],
    'short' : [ 2,'readInt16BE' ],
    'unsigned_short' : [ 2,'readUInt16BE' ],
    'int' : [ 4,'readInt32BE' ],
    'unsigned_int' : [ 4,'readUInt32BE' ],
    'float' : [ 4,'readFloatBE' ],
    'double' : [ 8,'readDoubleBE' ],
};

function asBuffer(input) {
    if (Buffer.isBuffer(input))
        return input;
    if (input instanceof Uint8Array)
        return Buffer.from(input.buffer,input.byteOffset,input.byteLength);
    if (input instanceof ArrayBuffer)
        return Buffer.from(input);
    throw new Error('Surface input must be a Buffer, Uint8Array, or ArrayBuffer');
}

function readLine(buffer,state) {
    let end=buffer.indexOf(10,state.cursor);
    if (end<0)
        throw new Error('Unexpected end of VTK header');
    let line=buffer.toString('ascii',state.cursor,end).replace(/\r$/,'').trim();
    state.cursor=end+1;
    return line;
}

function skipLineBreak(buffer,state) {
    if (buffer[state.cursor]===13)
        state.cursor++;
    if (buffer[state.cursor]===10)
        state.cursor++;
}

function parseCountLine(line,keyword) {
    const fields=line.split(/\s+/);
    if (fields[0]!==keyword || fields.length<3)
        throw new Error(`Expected ${keyword} line, found "${line}"`);
    return fields;
}

function readBinaryValues(buffer,state,count,type) {
    const spec=vtkScalarReaders[type];
    if (!spec)
        throw new Error(`Unsupported binary VTK scalar type ${type}`);
    const bytes=spec[0];
    const method=spec[1];
    const output=new Array(count);
    if (state.cursor+count*bytes>buffer.length)
        throw new Error('Truncated binary VTK data');
    for (let i=0;i<count;i++)
        output[i]=buffer[method](state.cursor+i*bytes);
    state.cursor+=count*bytes;
    return output;
}

function parseBinaryVTK(buffer,header,state) {
    const pointFields=parseCountLine(readLine(buffer,state),'POINTS');
    const numpoints=parseInt(pointFields[1]);
    const pointType=pointFields[2].toLowerCase();
    const rawPoints=readBinaryValues(buffer,state,numpoints*3,pointType);
    const points=Float32Array.from(rawPoints);
    skipLineBreak(buffer,state);

    const polygonFields=parseCountLine(readLine(buffer,state),'POLYGONS');
    const numpolygons=parseInt(polygonFields[1]);
    const polygonValues=parseInt(polygonFields[2]);
    const rawPolygons=readBinaryValues(buffer,state,polygonValues,'int');
    skipLineBreak(buffer,state);

    const triangles=new Uint32Array(numpolygons*3);
    let polygonCursor=0;
    for (let triangle=0;triangle<numpolygons;triangle++) {
        const vertices=rawPolygons[polygonCursor++];
        if (vertices!==3)
            throw new Error(`Only triangular VTK POLYGONS are supported; polygon ${triangle} has ${vertices} vertices`);
        for (let component=0;component<3;component++)
            triangles[triangle*3+component]=rawPolygons[polygonCursor++];
    }
    if (polygonCursor!==rawPolygons.length)
        throw new Error('VTK POLYGONS size does not match its contents');

    let indices=null;
    if (state.cursor<buffer.length) {
        const pointDataLine=readLine(buffer,state);
        if (pointDataLine.startsWith('POINT_DATA')) {
            const pointDataCount=parseInt(pointDataLine.split(/\s+/)[1]);
            if (pointDataCount!==numpoints)
                throw new Error(`POINT_DATA count ${pointDataCount} does not match POINTS count ${numpoints}`);
            const scalarFields=readLine(buffer,state).split(/\s+/);
            if (scalarFields[0]!=='SCALARS')
                throw new Error('Only VTK point SCALARS are supported');
            const scalarType=scalarFields[2].toLowerCase();
            const components=scalarFields[3] ? parseInt(scalarFields[3]) : 1;
            if (components!==1)
                throw new Error('Only one-component VTK point SCALARS are supported');
            const lookupLine=readLine(buffer,state);
            if (!lookupLine.startsWith('LOOKUP_TABLE'))
                throw new Error('Missing VTK scalar LOOKUP_TABLE declaration');
            indices=Int32Array.from(readBinaryValues(buffer,state,numpoints,scalarType));
        }
    }

    return {
        format : header.format,
        points,
        triangles,
        indices,
    };
}

function findToken(tokens,state,keyword) {
    while (state.cursor<tokens.length && tokens[state.cursor]!==keyword)
        state.cursor++;
    if (state.cursor>=tokens.length)
        throw new Error(`Missing VTK ${keyword} section`);
    state.cursor++;
}

function parseAsciiVTK(buffer,header) {
    const tokens=buffer.toString('utf8').trim().split(/\s+/);
    const state={ cursor : 0 };

    findToken(tokens,state,'POINTS');
    const numpoints=parseInt(tokens[state.cursor++]);
    state.cursor++;
    const points=new Float32Array(numpoints*3);
    for (let i=0;i<points.length;i++)
        points[i]=parseFloat(tokens[state.cursor++]);

    findToken(tokens,state,'POLYGONS');
    const numpolygons=parseInt(tokens[state.cursor++]);
    state.cursor++;
    const triangles=new Uint32Array(numpolygons*3);
    for (let triangle=0;triangle<numpolygons;triangle++) {
        const vertices=parseInt(tokens[state.cursor++]);
        if (vertices!==3)
            throw new Error(`Only triangular VTK POLYGONS are supported; polygon ${triangle} has ${vertices} vertices`);
        for (let component=0;component<3;component++)
            triangles[triangle*3+component]=parseInt(tokens[state.cursor++]);
    }

    let indices=null;
    while (state.cursor<tokens.length && tokens[state.cursor]!=='POINT_DATA')
        state.cursor++;
    if (state.cursor<tokens.length) {
        state.cursor++;
        const pointDataCount=parseInt(tokens[state.cursor++]);
        if (pointDataCount!==numpoints)
            throw new Error(`POINT_DATA count ${pointDataCount} does not match POINTS count ${numpoints}`);
        findToken(tokens,state,'SCALARS');
        state.cursor+=2;
        let components=1;
        if (tokens[state.cursor] && /^\d+$/.test(tokens[state.cursor]))
            components=parseInt(tokens[state.cursor++]);
        if (components!==1)
            throw new Error('Only one-component VTK point SCALARS are supported');
        findToken(tokens,state,'LOOKUP_TABLE');
        state.cursor++;
        indices=new Int32Array(numpoints);
        for (let i=0;i<numpoints;i++)
            indices[i]=parseInt(tokens[state.cursor++]);
    }

    return {
        format : header.format,
        points,
        triangles,
        indices,
    };
}

function parseLegacyVTK(input) {
    const buffer=asBuffer(input);
    const state={ cursor : 0 };
    const version=readLine(buffer,state);
    const title=readLine(buffer,state);
    const format=readLine(buffer,state).toUpperCase();
    const dataset=readLine(buffer,state).toUpperCase();
    if (version.indexOf('vtk DataFile')<0)
        throw new Error('Not a legacy VTK file');
    if (dataset!=='DATASET POLYDATA')
        throw new Error(`Expected DATASET POLYDATA, found ${dataset}`);
    if (format!=='ASCII' && format!=='BINARY')
        throw new Error(`Unsupported VTK format ${format}`);
    const header={ version,title,format };
    if (format==='BINARY')
        return parseBinaryVTK(buffer,header,state);
    return parseAsciiVTK(buffer,header);
}

function offsetParcelIndices(surface,offset) {
    if (!surface.indices)
        throw new Error('Cannot offset a surface without point scalar indices');
    const output={
        points : surface.points,
        triangles : surface.triangles,
        indices : new Uint32Array(surface.indices.length),
        maxpoint : surface.maxpoint || 0,
    };
    for (let i=0;i<surface.indices.length;i++) {
        const value=surface.indices[i]+offset;
        if (value<0)
            throw new Error(`Parcel offset creates negative value ${value} at vertex ${i}`);
        output.indices[i]=value;
    }
    return output;
}

function getPointArrays(surface) {
    if (surface.pointArrays)
        return surface.pointArrays;
    const output=[];
    for (const name of [ 'points','points1','points2','points3' ]) {
        if (surface[name])
            output.push(surface[name]);
    }
    return output;
}

function validateSurface(surface,requireParcels) {
    const pointArrays=getPointArrays(surface);
    if (pointArrays.length<1)
        throw new Error('Surface has no point arrays');
    const numpoints=pointArrays[0].length/3;
    if (!Number.isInteger(numpoints))
        throw new Error('Surface point-array length is not divisible by three');
    for (const points of pointArrays) {
        if (points.length!==numpoints*3)
            throw new Error('All surface point arrays must have the same length');
    }
    if (!surface.triangles || surface.triangles.length%3!==0)
        throw new Error('Surface triangle-array length is not divisible by three');
    for (let i=0;i<surface.triangles.length;i++) {
        if (surface.triangles[i]>=numpoints)
            throw new Error(`Triangle index ${surface.triangles[i]} at element ${i} exceeds point count ${numpoints}`);
    }
    if (requireParcels && (!surface.indices || surface.indices.length!==numpoints))
        throw new Error('Surface parcel-array length does not match its point count');
    return {
        pointArrays,
        numpoints,
        numtriangles : surface.triangles.length/3,
    };
}

function packConnectivitySurfaces(surfaces) {
    if (!Array.isArray(surfaces) || surfaces.length!==2)
        throw new Error('Connectivity surface output requires right and left surfaces');
    const hasParcels=Boolean(surfaces[0].indices && surfaces[1].indices);
    if (Boolean(surfaces[0].indices)!==Boolean(surfaces[1].indices))
        throw new Error('Both hemispheres must either have parcel indices or omit them');
    const descriptions=surfaces.map((surface) => validateSurface(surface,hasParcels));
    let length=4;
    for (let i=0;i<2;i++) {
        const desc=descriptions[i];
        length+=16;
        length+=desc.pointArrays.length*desc.numpoints*3*4;
        length+=desc.numtriangles*3*4;
        if (hasParcels)
            length+=desc.numpoints*4;
    }

    const buffer=Buffer.alloc(length);
    let cursor=0;
    const uint32=(value) => {
        buffer.writeUInt32LE(value,cursor);
        cursor+=4;
    };
    uint32(hasParcels ? MAGIC_WITH_PARCELS : MAGIC_WITHOUT_PARCELS);

    for (let hemisphere=0;hemisphere<2;hemisphere++) {
        const surface=surfaces[hemisphere];
        const desc=descriptions[hemisphere];
        uint32(desc.pointArrays.length);
        uint32(surface.maxpoint || 0);
        uint32(desc.numpoints);
        uint32(desc.numtriangles);
        for (const points of desc.pointArrays) {
            for (let i=0;i<points.length;i++) {
                buffer.writeFloatLE(points[i],cursor);
                cursor+=4;
            }
        }
        for (let i=0;i<surface.triangles.length;i++)
            uint32(surface.triangles[i]);
        if (hasParcels) {
            for (let i=0;i<surface.indices.length;i++)
                uint32(surface.indices[i]);
        }
    }
    if (cursor!==buffer.length)
        throw new Error(`Packed ${cursor} bytes but allocated ${buffer.length}`);
    return buffer;
}

function unpackConnectivitySurfaces(input) {
    const buffer=asBuffer(input);
    let cursor=0;
    const uint32=() => {
        if (cursor+4>buffer.length)
            throw new Error('Truncated connectivity surface');
        const value=buffer.readUInt32LE(cursor);
        cursor+=4;
        return value;
    };
    const magic=uint32();
    if (magic!==MAGIC_WITH_PARCELS && magic!==MAGIC_WITHOUT_PARCELS)
        throw new Error(`Bad connectivity surface magic ${magic}`);
    const hasParcels=magic===MAGIC_WITH_PARCELS;
    const surfaces=[];
    for (let hemisphere=0;hemisphere<2;hemisphere++) {
        const numelements=uint32();
        const maxpoint=uint32();
        const numpoints=uint32();
        const numtriangles=uint32();
        const pointArrays=[];
        for (let element=0;element<numelements;element++) {
            const points=new Float32Array(numpoints*3);
            for (let i=0;i<points.length;i++) {
                points[i]=buffer.readFloatLE(cursor);
                cursor+=4;
            }
            pointArrays.push(points);
        }
        const triangles=new Uint32Array(numtriangles*3);
        for (let i=0;i<triangles.length;i++)
            triangles[i]=uint32();
        let indices=null;
        if (hasParcels) {
            indices=new Uint32Array(numpoints);
            for (let i=0;i<indices.length;i++)
                indices[i]=uint32();
        }
        surfaces.push({ pointArrays,points : pointArrays[0],triangles,indices,maxpoint });
    }
    if (cursor!==buffer.length)
        throw new Error(`Parsed ${cursor} bytes but input contains ${buffer.length}`);
    return { magic,surfaces };
}

function compareConnectivitySurfaces(first,second) {
    const a=unpackConnectivitySurfaces(first);
    const b=unpackConnectivitySurfaces(second);
    const result={
        identical : Buffer.compare(asBuffer(first),asBuffer(second))===0,
        magicEqual : a.magic===b.magic,
        hemispheres : [],
    };
    for (let hemisphere=0;hemisphere<2;hemisphere++) {
        const sa=a.surfaces[hemisphere];
        const sb=b.surfaces[hemisphere];
        const item={
            pointsEqual : 0,
            pointsDifferent : 0,
            maximumPointDifference : 0,
            trianglesEqual : 0,
            trianglesDifferent : 0,
            parcelsEqual : 0,
            parcelsDifferent : 0,
        };
        const ap=sa.points;
        const bp=sb.points;
        const pointCount=Math.min(ap.length,bp.length);
        for (let i=0;i<pointCount;i++) {
            const difference=Math.abs(ap[i]-bp[i]);
            if (difference===0)
                item.pointsEqual++;
            else
                item.pointsDifferent++;
            item.maximumPointDifference=Math.max(item.maximumPointDifference,difference);
        }
        item.pointsDifferent+=Math.abs(ap.length-bp.length);
        const triangleCount=Math.min(sa.triangles.length,sb.triangles.length);
        for (let i=0;i<triangleCount;i++) {
            if (sa.triangles[i]===sb.triangles[i])
                item.trianglesEqual++;
            else
                item.trianglesDifferent++;
        }
        item.trianglesDifferent+=Math.abs(sa.triangles.length-sb.triangles.length);
        if (sa.indices && sb.indices) {
            const parcelCount=Math.min(sa.indices.length,sb.indices.length);
            for (let i=0;i<parcelCount;i++) {
                if (sa.indices[i]===sb.indices[i])
                    item.parcelsEqual++;
                else
                    item.parcelsDifferent++;
            }
            item.parcelsDifferent+=Math.abs(sa.indices.length-sb.indices.length);
        }
        result.hemispheres.push(item);
    }
    return result;
}

function serializeLegacyVTKASCII(surface,title='BioImage Suite connectivity surface') {
    const description=validateSurface(surface,Boolean(surface.indices));
    const lines=[
        '# vtk DataFile Version 3.0',
        title,
        'ASCII',
        'DATASET POLYDATA',
        `POINTS ${description.numpoints} float`,
    ];
    for (let point=0;point<description.numpoints;point++) {
        const offset=point*3;
        lines.push(`${surface.points[offset]} ${surface.points[offset+1]} ${surface.points[offset+2]}`);
    }
    lines.push(`POLYGONS ${description.numtriangles} ${description.numtriangles*4}`);
    for (let triangle=0;triangle<description.numtriangles;triangle++) {
        const offset=triangle*3;
        lines.push(`3 ${surface.triangles[offset]} ${surface.triangles[offset+1]} ${surface.triangles[offset+2]}`);
    }
    if (surface.indices) {
        lines.push(`POINT_DATA ${description.numpoints}`);
        lines.push('SCALARS indices int 1');
        lines.push('LOOKUP_TABLE default');
        for (const value of surface.indices)
            lines.push(String(value));
    }
    return lines.join('\n')+'\n';
}

module.exports={
    MAGIC_WITH_PARCELS,
    MAGIC_WITHOUT_PARCELS,
    parseLegacyVTK,
    offsetParcelIndices,
    packConnectivitySurfaces,
    unpackConnectivitySurfaces,
    compareConnectivitySurfaces,
    serializeLegacyVTKASCII,
};
