/*  LICENSE

    _This file is Copyright 2026 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._

    BioImage Suite Web is licensed under the Apache License, Version 2.0.
*/

'use strict';

function createPointAdjacency(surface) {
    const numpoints=surface.points.length/3;
    const neighbors=new Array(numpoints);
    for (let i=0;i<numpoints;i++)
        neighbors[i]=[];
    const edgeCounts=new Map();
    for (let index=0;index<surface.triangles.length;index+=3) {
        const triangle=[ surface.triangles[index],surface.triangles[index+1],surface.triangles[index+2] ];
        for (const edge of [ [ triangle[0],triangle[1] ],[ triangle[1],triangle[2] ],[ triangle[2],triangle[0] ] ]) {
            const key=`${Math.min(edge[0],edge[1])}:${Math.max(edge[0],edge[1])}`;
            edgeCounts.set(key,(edgeCounts.get(key) || 0)+1);
        }
    }
    // Matches the four internal vtkSmoothPolyDataFilter vertex classes.
    const types=new Uint8Array(numpoints); // 0 simple, 1 fixed, 2 feature, 3 boundary
    const visitedEdges=new Set();
    for (let index=0;index<surface.triangles.length;index+=3) {
        const a=surface.triangles[index];
        const b=surface.triangles[index+1];
        const c=surface.triangles[index+2];
        for (const edge of [ [ a,b ],[ b,c ],[ c,a ] ]) {
            const low=Math.min(edge[0],edge[1]);
            const high=Math.max(edge[0],edge[1]);
            const key=`${low}:${high}`;
            if (!visitedEdges.has(key)) {
                visitedEdges.add(key);
                const count=edgeCounts.get(key);
                const edgeType=count===1 ? 3 : (count>2 ? 2 : 0);
                for (const directed of [ edge,[ edge[1],edge[0] ] ]) {
                    const point=directed[0];
                    const other=directed[1];
                    if (edgeType && types[point]===0) {
                        neighbors[point]=[ other ];
                        types[point]=edgeType;
                    } else if ((edgeType && (types[point]===2 || types[point]===3)) ||
                               (!edgeType && types[point]===0)) {
                        neighbors[point].push(other);
                        if (types[point] && edgeType===3)
                            types[point]=3;
                    }
                }
            }
        }
    }
    const cosineEdgeAngle=Math.cos(15.0*Math.PI/180.0);
    for (let point=0;point<numpoints;point++) {
        if (types[point]!==2 && types[point]!==3)
            continue;
        if (neighbors[point].length!==2) {
            types[point]=1;
            continue;
        }
        const p=point*3;
        const first=neighbors[point][0]*3;
        const second=neighbors[point][1]*3;
        let ax=surface.points[p]-surface.points[first];
        let ay=surface.points[p+1]-surface.points[first+1];
        let az=surface.points[p+2]-surface.points[first+2];
        let bx=surface.points[second]-surface.points[p];
        let by=surface.points[second+1]-surface.points[p+1];
        let bz=surface.points[second+2]-surface.points[p+2];
        const alength=Math.sqrt(ax*ax+ay*ay+az*az);
        const blength=Math.sqrt(bx*bx+by*by+bz*bz);
        if (alength>0 && blength>0) {
            ax/=alength; ay/=alength; az/=alength;
            bx/=blength; by/=blength; bz/=blength;
            if (ax*bx+ay*by+az*bz<cosineEdgeAngle)
                types[point]=1;
        }
    }
    neighbors.fixed=types.map((value) => value===1 ? 1 : 0);
    return neighbors;
}

// vtkSmoothPolyDataFilter's default mode performs umbrella Laplacian
// smoothing. The generated atlas meshes are closed, disconnected components,
// so its boundary and feature-edge options do not alter this update.
function smoothSurfacePoints(surface,iterations=100,relaxation=0.2) {
    const neighbors=createPointAdjacency(surface);
    // VTK 5.10 updates vtkPoints in point-id order, in place. This is a
    // Gauss-Seidel pass (later vertices see already-updated neighbors), not a
    // simultaneous/Jacobi update. vtkPoints also stores floats by default.
    const current=Float32Array.from(surface.points);
    for (let iteration=0;iteration<iterations;iteration++) {
        for (let point=0;point<neighbors.length;point++) {
            const offset=point*3;
            const count=neighbors[point].length;
            if (count===0 || neighbors.fixed[point])
                continue;
            const oldx=current[offset];
            const oldy=current[offset+1];
            const oldz=current[offset+2];
            let dx=0.0,dy=0.0,dz=0.0;
            for (const neighbor of neighbors[point]) {
                const source=neighbor*3;
                dx+=(current[source]-oldx)/count;
                dy+=(current[source+1]-oldy)/count;
                dz+=(current[source+2]-oldz)/count;
            }
            current[offset]=oldx+relaxation*dx;
            current[offset+1]=oldy+relaxation*dy;
            current[offset+2]=oldz+relaxation*dz;
        }
    }
    return current;
}

function coordinate(points,index,axis) {
    return points[index*3+axis];
}

function buildPointKdTree(points) {
    const numpoints=points.length/3;
    const indices=new Array(numpoints);
    for (let i=0;i<numpoints;i++)
        indices[i]=i;

    function build(values,depth) {
        if (values.length===0)
            return null;
        const axis=depth%3;
        values.sort((a,b) => coordinate(points,a,axis)-coordinate(points,b,axis));
        const middle=Math.floor(values.length/2);
        return {
            index : values[middle],
            axis,
            left : build(values.slice(0,middle),depth+1),
            right : build(values.slice(middle+1),depth+1),
        };
    }
    return build(indices,0);
}

function findClosestPoint(points,tree,x,y,z) {
    const query=[ x,y,z ];
    let bestIndex=-1;
    let bestDistance=Number.POSITIVE_INFINITY;

    function visit(node) {
        if (!node)
            return;
        const offset=node.index*3;
        const dx=x-points[offset];
        const dy=y-points[offset+1];
        const dz=z-points[offset+2];
        const distance=dx*dx+dy*dy+dz*dz;
        if (distance<bestDistance || (distance===bestDistance && node.index<bestIndex)) {
            bestDistance=distance;
            bestIndex=node.index;
        }
        const difference=query[node.axis]-points[offset+node.axis];
        const near=difference<0 ? node.left : node.right;
        const far=difference<0 ? node.right : node.left;
        visit(near);
        if (difference*difference<=bestDistance)
            visit(far);
    }
    visit(tree);
    return { index : bestIndex,distanceSquared : bestDistance };
}

function mapParcelsUsingSmoothedNearest(surface,options={}) {
    if (!surface.indices)
        throw new Error('The atlas surface must contain point scalar labels');
    const iterations=options.iterations===undefined ? 100 : options.iterations;
    const relaxation=options.relaxation===undefined ? 0.2 : options.relaxation;
    const offset=options.offset || 0;
    const distanceThreshold=options.distanceThreshold===undefined ? 36.0 : options.distanceThreshold;
    const thresholdSquared=distanceThreshold*distanceThreshold;
    const smoothed=smoothSurfacePoints(surface,iterations,relaxation);
    const tree=buildPointKdTree(surface.points);
    const indices=new Uint32Array(surface.indices.length);
    let rejected=0;
    for (let point=0;point<indices.length;point++) {
        const source=point*3;
        const match=findClosestPoint(surface.points,tree,
                                     smoothed[source],smoothed[source+1],smoothed[source+2]);
        if (match.distanceSquared<thresholdSquared)
            indices[point]=surface.indices[match.index]+offset;
        else {
            indices[point]=0;
            rejected++;
        }
    }
    return {
        points : surface.points,
        triangles : surface.triangles,
        indices,
        smoothedPoints : smoothed,
        rejected,
    };
}

module.exports={
    createPointAdjacency,
    smoothSurfacePoints,
    buildPointKdTree,
    findClosestPoint,
    mapParcelsUsingSmoothedNearest,
};
