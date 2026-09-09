/*  LICENSE

    _This file is Copyright 2026 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._

    BioImage Suite Web is licensed under the Apache License, Version 2.0.
*/

/* global describe, it */

'use strict';

require('../config/bisweb_pathconfig.js');
const assert=require('assert');
const surfaceMap=require('bis_connectivitysurfacemap');

describe('Connectivity surface label mapping',function() {
    it('finds nearest points with a kd-tree',function() {
        const points=Float32Array.from([
            0,0,0,
            2,0,0,
            0,3,0,
            0,0,4,
        ]);
        const tree=surfaceMap.buildPointKdTree(points);
        assert.deepStrictEqual(surfaceMap.findClosestPoint(points,tree,1.8,0.1,0).index,1);
        assert.deepStrictEqual(surfaceMap.findClosestPoint(points,tree,0,2.8,0).index,2);
    });

    it('maps labels from nearest source points after smoothing',function() {
        const surface={
            points : Float32Array.from([
                0,0,0,
                1,0,0,
                1,1,0,
                0,1,0,
            ]),
            triangles : Uint32Array.from([ 0,1,2,0,2,3 ]),
            indices : Int32Array.from([ 4,5,6,7 ]),
        };
        const output=surfaceMap.mapParcelsUsingSmoothedNearest(surface,{
            iterations : 0,
            offset : 10,
        });
        assert.deepStrictEqual(Array.from(output.indices),[ 14,15,16,17 ]);
        assert.strictEqual(output.rejected,0);
    });
});
