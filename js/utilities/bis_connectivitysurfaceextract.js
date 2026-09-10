/*  LICENSE

    _This file is Copyright 2026 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._

    BioImage Suite Web is licensed under the Apache License, Version 2.0.
*/

'use strict';

let marchingTables=null;

function getMarchingTables() {
    if (!marchingTables) {
        const triangle=require('./vtk_marching_cubes_cases');
        const edge=new Uint16Array(256);
        for (let cube=0;cube<256;cube++) {
            for (let item=0;item<16 && triangle[cube*16+item]>=0;item++)
                edge[cube]|=1<<triangle[cube*16+item];
        }
        marchingTables={ edge,triangle };
    }
    return marchingTables;
}

function index3(x,y,z,dimensions) {
    return x+dimensions[0]*(y+dimensions[1]*z);
}

function findLabelBounds(data,dimensions,firstLabel,lastLabel) {
    const bounds=new Array(lastLabel-firstLabel+1).fill(null);
    let voxel=0;
    for (let z=0;z<dimensions[2];z++) {
        for (let y=0;y<dimensions[1];y++) {
            for (let x=0;x<dimensions[0];x++,voxel++) {
                const label=Math.round(data[voxel]);
                if (label<firstLabel || label>lastLabel)
                    continue;
                const offset=label-firstLabel;
                if (!bounds[offset])
                    bounds[offset]=[ x,x,y,y,z,z ];
                else {
                    const item=bounds[offset];
                    item[0]=Math.min(item[0],x); item[1]=Math.max(item[1],x);
                    item[2]=Math.min(item[2],y); item[3]=Math.max(item[3],y);
                    item[4]=Math.min(item[4],z); item[5]=Math.max(item[5],z);
                }
            }
        }
    }
    return bounds;
}

function gaussianKernel(sigma,radiusFactor=1.5) {
    if (sigma<=0)
        return Float32Array.from([ 1 ]);
    // vtkImageGaussianSmooth 5.10 truncates sigma*radiusFactor to int.
    const radius=Math.floor(sigma*radiusFactor);
    const kernel=new Float32Array(radius*2+1);
    let sum=0.0;
    for (let i=-radius;i<=radius;i++) {
        const value=Math.exp(-0.5*i*i/(sigma*sigma));
        kernel[i+radius]=value;
        sum+=value;
    }
    for (let i=0;i<kernel.length;i++)
        kernel[i]/=sum;
    return kernel;
}

function convolveAxis(input,dimensions,kernel,axis) {
    if (kernel.length===1)
        return input;
    const output=new Float32Array(input.length);
    const radius=(kernel.length-1)/2;
    const step=axis===0 ? 1 : (axis===1 ? dimensions[0] : dimensions[0]*dimensions[1]);
    for (let z=0;z<dimensions[2];z++) {
        for (let y=0;y<dimensions[1];y++) {
            for (let x=0;x<dimensions[0];x++) {
                const coordinate=axis===0 ? x : (axis===1 ? y : z);
                const limit=dimensions[axis];
                const center=index3(x,y,z,dimensions);
                let value=0.0;
                for (let delta=-radius;delta<=radius;delta++) {
                    const neighbor=coordinate+delta;
                    if (neighbor>=0 && neighbor<limit)
                        value+=input[center+delta*step]*kernel[delta+radius];
                }
                output[center]=value;
            }
        }
    }
    return output;
}

function sampleTrilinear(data,dimensions,x,y,z) {
    if (x<0 || y<0 || z<0 || x>dimensions[0]-1 || y>dimensions[1]-1 || z>dimensions[2]-1)
        return 0.0;
    const x0=Math.floor(x),y0=Math.floor(y),z0=Math.floor(z);
    const x1=Math.min(x0+1,dimensions[0]-1);
    const y1=Math.min(y0+1,dimensions[1]-1);
    const z1=Math.min(z0+1,dimensions[2]-1);
    const dx=x-x0,dy=y-y0,dz=z-z0;
    const c000=data[index3(x0,y0,z0,dimensions)];
    const c100=data[index3(x1,y0,z0,dimensions)];
    const c010=data[index3(x0,y1,z0,dimensions)];
    const c110=data[index3(x1,y1,z0,dimensions)];
    const c001=data[index3(x0,y0,z1,dimensions)];
    const c101=data[index3(x1,y0,z1,dimensions)];
    const c011=data[index3(x0,y1,z1,dimensions)];
    const c111=data[index3(x1,y1,z1,dimensions)];
    const low=(c000*(1-dx)+c100*dx)*(1-dy)+(c010*(1-dx)+c110*dx)*dy;
    const high=(c001*(1-dx)+c101*dx)*(1-dy)+(c011*(1-dx)+c111*dx)*dy;
    return low*(1-dz)+high*dz;
}

function createSmoothedLabelField(data,dimensions,label,bounds,options={}) {
    const sigma=options.sigma || [ 1,1,1 ];
    const factor=options.resampleFactor || 3.0;
    const radiusFactor=options.radiusFactor || 1.5;
    const kernels=sigma.map((value) => gaussianKernel(value,radiusFactor));
    const radii=kernels.map((kernel) => (kernel.length-1)/2);
    const cropMin=[
        Math.max(0,bounds[0]-radii[0]),
        Math.max(0,bounds[2]-radii[1]),
        Math.max(0,bounds[4]-radii[2]),
    ];
    const cropMax=[
        Math.min(dimensions[0]-1,bounds[1]+radii[0]),
        Math.min(dimensions[1]-1,bounds[3]+radii[1]),
        Math.min(dimensions[2]-1,bounds[5]+radii[2]),
    ];
    const cropDimensions=cropMin.map((value,axis) => cropMax[axis]-value+1);
    let field=new Float32Array(cropDimensions[0]*cropDimensions[1]*cropDimensions[2]);
    let local=0;
    for (let z=cropMin[2];z<=cropMax[2];z++)
        for (let y=cropMin[1];y<=cropMax[1];y++)
            for (let x=cropMin[0];x<=cropMax[0];x++,local++)
                field[local]=Math.round(data[index3(x,y,z,dimensions)])===label ? 100.0 : 0.0;
    for (let axis=0;axis<3;axis++)
        field=convolveAxis(field,cropDimensions,kernels[axis],axis);

    const globalOutputMax=dimensions.map((value) => Math.round((value-1)/factor));
    const outputMin=cropMin.map((value) => Math.max(0,Math.floor(value/factor)-1));
    const outputMax=cropMax.map((value,axis) => Math.min(globalOutputMax[axis],Math.ceil(value/factor)+1));
    const outputDimensions=outputMin.map((value,axis) => outputMax[axis]-value+1);
    const output=new Float32Array(outputDimensions[0]*outputDimensions[1]*outputDimensions[2]);
    local=0;
    for (let z=0;z<outputDimensions[2];z++) {
        for (let y=0;y<outputDimensions[1];y++) {
            for (let x=0;x<outputDimensions[0];x++,local++) {
                const sourceX=(x+outputMin[0])*factor-cropMin[0];
                const sourceY=(y+outputMin[1])*factor-cropMin[1];
                const sourceZ=(z+outputMin[2])*factor-cropMin[2];
                output[local]=sampleTrilinear(field,cropDimensions,sourceX,sourceY,sourceZ);
            }
        }
    }
    return { data : output,dimensions : outputDimensions,gridOrigin : outputMin,factor };
}

function marchingCubes(field,spacing,isovalue=50.0) {
    const tables=getMarchingTables();
    const dimensions=field.dimensions;
    const data=field.data;
    const points=[];
    const triangles=[];
    const edgeVertices=new Map();
    const corners=[
        [ 0,0,0 ],[ 1,0,0 ],[ 1,1,0 ],[ 0,1,0 ],
        [ 0,0,1 ],[ 1,0,1 ],[ 1,1,1 ],[ 0,1,1 ],
    ];
    const edges=[ [ 0,1 ],[ 1,2 ],[ 3,2 ],[ 0,3 ],[ 4,5 ],[ 5,6 ],
                  [ 7,6 ],[ 4,7 ],[ 0,4 ],[ 1,5 ],[ 3,7 ],[ 2,6 ] ];
    const bit=[ 1,2,4,8,16,32,64,128 ];

    for (let z=0;z<dimensions[2]-1;z++) {
        for (let y=0;y<dimensions[1]-1;y++) {
            for (let x=0;x<dimensions[0]-1;x++) {
                const values=new Array(8);
                const nodeIds=new Array(8);
                let cubeIndex=0;
                for (let corner=0;corner<8;corner++) {
                    const coordinate=corners[corner];
                    const node=index3(x+coordinate[0],y+coordinate[1],z+coordinate[2],dimensions);
                    nodeIds[corner]=node;
                    values[corner]=data[node];
                    if (values[corner]>=isovalue)
                        cubeIndex|=bit[corner];
                }
                const edgeMask=tables.edge[cubeIndex];
                if (!edgeMask)
                    continue;
                const cubeVertices=new Array(12);
                const vertexForEdge=(edge) => {
                    if (cubeVertices[edge]!==undefined)
                        return cubeVertices[edge];
                    const endpoints=edges[edge];
                    const first=endpoints[0],second=endpoints[1];
                    const low=Math.min(nodeIds[first],nodeIds[second]);
                    const high=Math.max(nodeIds[first],nodeIds[second]);
                    const key=`${low}:${high}`;
                    let vertex=edgeVertices.get(key);
                    if (vertex===undefined) {
                        const denominator=values[second]-values[first];
                        const mu=Math.abs(denominator)<1e-12 ? 0.5 : (isovalue-values[first])/denominator;
                        const a=corners[first],b=corners[second];
                        for (let axis=0;axis<3;axis++) {
                            const outputIndex=field.gridOrigin[axis]+[ x,y,z ][axis]+a[axis]+mu*(b[axis]-a[axis]);
                            points.push(outputIndex*spacing[axis]*field.factor);
                        }
                        vertex=points.length/3-1;
                        edgeVertices.set(key,vertex);
                    }
                    cubeVertices[edge]=vertex;
                    return vertex;
                };
                const tableOffset=cubeIndex*16;
                for (let item=0;tables.triangle[tableOffset+item]!==-1;item+=3) {
                    triangles.push(vertexForEdge(tables.triangle[tableOffset+item]),
                                   vertexForEdge(tables.triangle[tableOffset+item+1]),
                                   vertexForEdge(tables.triangle[tableOffset+item+2]));
                }
            }
        }
    }
    return { points : Float32Array.from(points),triangles : Uint32Array.from(triangles) };
}

function appendSurfaces(surfaces) {
    let numberOfPoints=0,numberOfTriangles=0;
    for (const item of surfaces) {
        const surface=item.surface || item;
        numberOfPoints+=surface.points.length/3;
        numberOfTriangles+=surface.triangles.length/3;
    }
    const points=new Float32Array(numberOfPoints*3);
    const triangles=new Uint32Array(numberOfTriangles*3);
    const indices=new Int32Array(numberOfPoints);
    let pointOffset=0,triangleOffset=0;
    for (const item of surfaces) {
        const surface=item.surface || item;
        points.set(surface.points,pointOffset*3);
        for (let i=0;i<surface.triangles.length;i++)
            triangles[triangleOffset*3+i]=surface.triangles[i]+pointOffset;
        indices.fill(item.index || 0,pointOffset,pointOffset+surface.points.length/3);
        pointOffset+=surface.points.length/3;
        triangleOffset+=surface.triangles.length/3;
    }
    return { points,triangles,indices };
}

function extractLabelRange(data,dimensions,spacing,firstLabel,lastLabel,options={}) {
    const bounds=findLabelBounds(data,dimensions,firstLabel,lastLabel);
    const surfaces=[];
    for (let label=firstLabel;label<=lastLabel;label++) {
        const labelBounds=bounds[label-firstLabel];
        if (!labelBounds)
            continue;
        const attempts=[ options ];
        if (options.adaptive) {
            const sigma=options.sigma || [ 1,1,1 ];
            const factor=options.resampleFactor || 3.0;
            attempts.push(
                Object.assign({},options,{ sigma : sigma.map((value) => Math.min(value,0.6)) }),
                Object.assign({},options,{ sigma : [ 0,0,0 ],resampleFactor : Math.min(factor,1.5) }),
                Object.assign({},options,{ sigma : [ 0,0,0 ],resampleFactor : 1.0 }));
        }
        let surface=null,usedOptions=null;
        const tried=new Set();
        for (const attempt of attempts) {
            const key=`${attempt.sigma || [ 1,1,1 ]}:${attempt.resampleFactor || 3.0}`;
            if (tried.has(key))
                continue;
            tried.add(key);
            const field=createSmoothedLabelField(data,dimensions,label,labelBounds,attempt);
            surface=marchingCubes(field,spacing,attempt.isovalue || 50.0);
            usedOptions=attempt;
            if (surface.points.length>0)
                break;
        }
        if (surface.points.length>0)
            surfaces.push({ surface,index : label-firstLabel });
        if (options.progress)
            options.progress(label,surface,usedOptions);
    }
    return appendSurfaces(surfaces);
}

module.exports={
    findLabelBounds,
    gaussianKernel,
    convolveAxis,
    sampleTrilinear,
    createSmoothedLabelField,
    marchingCubes,
    appendSurfaces,
    extractLabelRange,
};
