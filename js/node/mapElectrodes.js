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


'use strict';

const BaseModule = require('basemodule.js');
const baseutils=require("baseutils");
const util=require("bis_util");
const BisWebElectrodeMultiGrid = require('bisweb_electrodemultigrid');
const genericio = require('bis_genericio');

class MapElectrodesModule extends BaseModule {
    constructor() {
        super();
        this.name = 'mapElectrodes';
    }

    createDescription() {

        return {
            "name": "Map Electrode Grids",
            "description": "Label electrode grids with regions",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "shortname" : "map",
            "slicer" : true,
            "buttonName": "Map",
            "inputs":   [
                {
                    'type': 'electrodemultigrid',
                    'name': 'Grid to Map',
                    'description': 'Input Electrode Grid',
                    'varname': 'input',
                    'shortname' : 'i',
                    'required' : true,
                },
                {
                    'name' : 'Atlas image Image',
                    'description' : 'Load the atlas label image',
                    'type': 'image',
                    'varname' : 'reference',
                    'shortname' : 'r',
                    'required' : true,
                    'guiviewertype' : 'image',
                    'guiviewer'  : 'viewer1',
                },
            ],
            outputs: [],
            params: [
                {
                    "name": "output",
                    "description": "Name of the output file",
                    "advanced": false,
                    "type": "string",
                    "varname": "output",
                    "required" : true,
                    "shortname" :  "o",
                    "default": ""
                },
                {
                    "name": "Min Value",
                    "description": "The minvalue to use when sampling the image",
                    "priority": 2,
                    "advanced": true,
                    "gui": "slider",
                    "type": 'int',
                    "default": 5,
                    "lowbound": 1,
                    "highbound": 5000,
                    "varname": "minvalue"
                },
                {
                    "name": "Max Radius",
                    "description": "The max radius to use when sampling the image",
                    "priority": 10,
                    "advanced": true,
                    "gui": "slider",
                    "type": 'int',
                    "default": 4,
                    "lowbound": 1,
                    "highbound": 200,
                    "varname": "maxradius"
                },
                baseutils.getDebugParam(),
            ]
        };
    }

    findLabel(reference,vox,thr,radius,debug) {

        let dims=reference.getDimensions();
        let ivox=[0,0,0,0];
        
        for (let j=0;j<=2;j++) 
            ivox[j]=util.range(Math.round(vox[j]),0,dims[j]-1);
        let val=reference.getVoxel(ivox);

        if (debug)
            console.log('vox=',vox,'--> ivox=',ivox, 'val=',val, ' thr=',thr)

        if (val>=thr)
            return [ val ,0.0 ];

        
        let offset=1;
        val=-1.0;
        let mindist=10000.0;
        
        while (val<1 && offset<radius) {
            let mink=util.range(ivox[2]-offset,0,dims[2]-1);
            let maxk=util.range(ivox[2]+offset,0,dims[2]-1);
            let minj=util.range(ivox[1]-offset,0,dims[1]-1);
            let maxj=util.range(ivox[1]+offset,0,dims[1]-1);
            let mini=util.range(ivox[0]-offset,0,dims[0]-1);
            let maxi=util.range(ivox[0]+offset,0,dims[0]-1);
            
            if (debug)
                console.log('... continuing',offset,'/',radius,[ mini,maxi],[minj,maxj],[mink,maxk]);

            for (let k=mink;k<=maxk;k++) {
                for (let j=minj;j<=maxj;j++) {
                    for (let i=mini;i<=maxi;i++) {
                        const v=reference.getVoxel([ i,j,k,0]);
                        if (v>=thr) {
                            const dist=Math.pow(i-vox[0],2.0)+Math.abs(j-vox[1],2.0)+Math.abs(k-vox[2],2.0);
                            //                            if (debug)
                            //console.log('   ',[i,j,k],' = ',v,' dist=',dist,' vs min=',mindist);
                            

                            if (dist<mindist) {
                                mindist=dist;
                                val=v;
                            }
                        }
                    }
                }
            }
            offset+=1;
        }
        if (debug)
            console.log('... mindist=',mindist, 'val=',val);
        
        return [ val, util.scaledround(mindist,100.0) ];
    }
        
    async directInvokeAlgorithm(vals) {
        console.log('oooo invoking: mapElectrodes with vals', JSON.stringify(vals));
        const input = this.inputs['input'];
        const reference = this.inputs['reference'];
        const radius=parseInt(vals.maxradius);
        const threshold=parseInt(vals.minvalue);
        const debug=super.parseBoolean(vals.debug);

        if (reference === null || input===null) {
            return Promise.reject('Either no image or no grid to map specified');
        }

        const spa=reference.getSpacing();
        const numgrids=input.getNumGrids();
        const outputtext=[];
        let numbad=0;
        outputtext.push('Grid Name, ElecNumber, (Gridi Gridj), Vox-x,Vox-y,Vox-z,Distance,Value');
        for (let i=0;i<numgrids;i++) {
            let grid=input.getGrid(i);
            const gname=grid.description.trim();
            const dimensions=grid.dimensions;
            const electrodes=grid.electrodes;
            console.log('___ Mapping grid',gname,'Dimensions=',dimensions);

            for (let ia=0;ia<dimensions[0];ia++) {
                for (let ja=dimensions[1]-1;ja>=0;ja=ja-1) {
                    {
                        let elecnumber=0;
                        if (dimensions[0]===1) {
                            elecnumber=`${dimensions[1]-1-ja+1},(${ia} ${ja})`
                        } else if (dimensions[1]===1) {
                            elecnumber=`${dimensions[0]-1-ia+1},(${ia} ${ja})`;
                        } else {
                            elecnumber=`${(ia)*dimensions[1]+(dimensions[1]-1-ja)+1},(${ia} ${ja})`;
                        }

                        let index=ia+ja*dimensions[0];
                        const elec=electrodes[index];
                        const present=parseInt(elec.props['ElectrodePresent']) || 0;
                        if (present) {
                            let vox=[0,0,0];
                            for (let j=0;j<=2;j++) {
                                vox[j]=elec.position[j]/spa[j];
                            }
                            if (ia+ja<1)
                                console.log('Electrode=',elec.position,'-->',vox);
                            let val=this.findLabel(reference,vox,radius,threshold,( (ia===0) && (ja===0)));
                            if (val[0]<1)
                                numbad++;
                            for (let r=0;r<=2;r++)
                                vox[r]=util.scaledround(vox[r]*spa[r],100.0);
                            outputtext.push(`${gname},${elecnumber},${vox[0]},${vox[1]},${vox[2]},${val[1]},${val[0]}`);
                        }
                    }
                }
            }
        }

        console.log('... done ',numbad,' electrodes were more than',threshold,' voxels away from any region');

        try {
            await genericio.write(vals['output'],outputtext.join('\n'));
            console.log('++++\t saved grid data in '+vals['output']);
        } catch (e) {
            return Promise.reject(e);
        }

        return Promise.resolve();
    }
}

module.exports = MapElectrodesModule;
