/*  LICENSE
 
 _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
 
 BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
 
 - you may not use this software except in compliance with the License.
 - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
 
 __Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.__
 
 ENDLICENSE */

/* jshint node:true */
/*global describe, it */
"use strict";

require('../config/bisweb_pathconfig.js');
const assert = require("assert");
const util=require('bis_util');

describe('Testing colormapping code (from bisutil.js) \n', function() {
    this.timeout(500000);
    it('color mapping is correct ',function() {

        let truec = [ [ 1, 0, 1, 1 ],[ 1, 0, 1, 1 ],[ 1, 0, 1, 1 ],[ 0.902, 0, 1, 1 ],[ 0.773, 0, 1, 1 ],[ 0.647, 0, 1, 1 ],[ 0.518, 0, 1, 1 ],[ 0.388, 0, 1, 1 ],[ 0.259, 0, 1, 1 ],[ 0.129, 0, 1, 1 ],[ 0, 0, 1, 1 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 0, 0, 0, 0 ],[ 1, 0, 0, 1 ],[ 1, 0.376, 0, 1 ],[ 1, 0.875, 0, 1 ],[ 1, 1, 0.082, 1 ],[ 1, 1, 0.196, 1 ],[ 1, 1, 0.306, 1 ],[ 1, 1, 0.416, 1 ],[ 1, 1, 0.529, 1 ],[ 1, 1, 0.639, 1 ],[ 1, 1, 0.639, 1 ]];
        
        let num=40;
        let data=new Float32Array(num),i=0,j=0;
        for (i=0;i<num;i++)
            data[i]=(i-num/2);

        for (i=0;i<truec.length;i++) {
            for (j=0;j<4;j++) {
                truec[i][j]=Math.round(truec[i][j]*255);
            }
        }


        let mapper=util.mapoverlayfactory(10,18,255,3,false);
        let c= [ 0,0,0,0];
        let sum=0.0;
        for (i=0;i<num;i++) {
            mapper(data,i,c);
            for (j=0;j<=3;j++)
                sum+=Math.abs(c[j]-truec[i][j]);
        }
        console.log('+++++ f2 map sum=',sum);
        assert.equal(0,sum);
        
    });

    it('ste[ mapping is correct ',function() {

        let num=40;
        let data=new Float32Array(num),i=0;
        for (i=0;i<num;i++)
            data[i]=i;

        let mapper=util.mapstepcolormapfactory(10,30,255);
        let c= [ 0,0,0,0];
        let sum=0.0;
        let scale=255.0/(30-10);
        let offset=10.0;
        for (i=0;i<num;i++) {
            mapper(data,i,c);
            let truec=0,trueopa=255;
            if (data[i]<10)
                truec=0;
            else if (data[i]>=10 && data[i]<30.0)
                truec=Math.round(scale*(data[i]-offset));
            else
                truec=255.0;
            if (data[i]<10)
                trueopa=0;
            sum+=Math.abs(c[0]-c[1])+
                Math.abs(c[0]-c[2])+
                Math.abs(c[0]-truec)+
                Math.abs(c[3]-trueopa);
        }
        console.log('+++++ step map sum=',sum);
        assert.equal(0,sum);
        
    });
    

});
