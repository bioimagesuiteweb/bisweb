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

"use strict";

/**
 * @file Browser/Node.js module. Contains {@link BisWeb_Matrix}.
 * @author Xenios Papademetris
 * @version 1.0
 */

const BisWebDataObject=require('bisweb_dataobject');
const genericio = require('bis_genericio');
const util=require('bis_util');

/** Class representing an electrodemultigrid object */


class BisWebElectrodeMultiGrid extends BisWebDataObject{
    
    constructor() {

        super();
        this.jsonformatname='BisElectrodeMultiGrid';
        this.legacyextension="mgrid";
        this.extension=".bismgrid";
        this.data={
            'patient' : 'No name',
            'comment' : 'None specified',
            'numgrids' : 0,
            'grids' : []
        };
    }


    // ---- Get Object Information -------------------------------------------------
    /** Returns the type of the object as a string
     * @returns{String} - the type of the object (e.g. image,matrix ...)
     */
    getObjectType() {
        return 'electrodemultigrid';
    }
    
    /** returns a textual description of the object for GUIs etc.
     * @returns {string} description
     */
    getDescription() {
        return "GRID: "+this.data.patient+','+this.data.comment+', numgrids=',this.data.numgrids;
    }

    /** compute hash 
     * @returns {String} - hash string identifying the object
     */
    computeHash() {
        return util.SHA256(JSON.stringify(this.data));
    }

    /** returns the memory used in bytes by this object 
     * @returns {number} -- the size or 0 if not implemented or small
     */
    getMemorySize() {
        return "Text: "+JSON.stringify(this.data).length;
    }


    // ---- Load and Save, Serialize and Deserialize to JSON -------------------------------------------------
    /**
     * Load an object from a filename or file object
     * @param {fobj} - If in browser this is a File object, if in node.js this is the filename!
     * @return {Promise} a promise that is fuilfilled when the image is loaded
     */
    load(fobj) {
        let ext = fobj.name ? fobj.name.split('.').pop() : fobj.split('.').pop();
        if (ext==='MGRID' || ext==='mgrid')
            return this.loadMGRIDFile(fobj);
        
        return new Promise( (resolve,reject) => {
            genericio.read(fobj, false).then((contents) => {
                this.parseFromJSON(contents.data);
                this.setFilename(contents.filename);
                console.log('++++\t loaded grid from '+contents.filename+', '+this.getDescription());
                resolve('loaded grid from '+contents.filename);
            }).catch( (e) => { reject(e); });
        });
    }


    /** saves an object to a filename. 
     * @param {string} filename - the filename to save to. If in broswer it will pop up a FileDialog
     * @return {Promise} a promise that is fuilfilled when the image is saved
     */
    save(fobj) {

        let ext = fobj.name ? fobj.name.split('.').pop() : fobj.split('.').pop();
        
        if (ext==='MGRID' || ext==='mgrid')
            return this.saveMGRIDFile(fobj);

        let output = this.serializeToJSON();
        return new Promise( function(resolve,reject) {
            genericio.write(fobj,output).then( () => {
                console.log('++++\t saved grid json in '+fobj);
                resolve('++++\t saved grid json in '+fobj);
            }).catch( (e) => { reject(e); });
        });
    }

    /** serializes object to a javascript dictionary object
        @returns {Object} dictionary containing all key elements
    */
    serializeToDictionary() {
        let obj= super.serializeToDictionary();
        obj.data=this.data;
        return obj;
    }
    
    /** parses from Dictionary Object  
     * @param {Object} obj -- dictionary object
     * @returns {Boolean} true if OK
     */
    parseFromDictionary(b) {
        this.data=b.data;
        super.parseFromDictionary(b);
        return true;
    }


    // ---- Interface to Web Assembly Code ----------------------------------------------------
    
    /** serializes an object to a WASM array (this being a string it is trivial)
     * @returns {String}  -- pointer biswasm serialized array
     */
    serializeWasm() {
        return null;
    }

    /** deserializes an object from WASM array (with an optional second input to help with header stuff)
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @param {Pointer} wasmarr - the unsined char wasm object
     */
    deserializeWasm() {
        console.log('No deserialize wasm implemented');
    }
    

    // ---- Testing utility ----------------------------------------------------
    /** compares an image with a peer object of the same class and returns true if similar or false if different 
     * @param{BisWebElectrodeMultiGrid} other - the other object
     * @param{Number} threshold - the threshold to use for comparison
     * @returns{Object} - { testresult: true or false, value: comparison value, metric: metric name } 
     */
    compareWithOther(other,threshold=0.01) {
        
        let out = {
            testresult : false,
            value : 1000.0,
            metric: "maxabs",
        };

        if (other.constructor.name !== this.constructor.name)  {
            out.value=1000.0;
            console.log('different constructors');
            return out;
        }

        let maxsum=0.0;
        let numgrids=this.data.numgrids;

        if (numgrids!==other.data.numgrids) {
            out.value=1000.0;
            console.log('different number of grids');
            return out;
        }   
        
        for (let i=0;i<numgrids;i++) {
            let grid=this.data.grids[i];
            let nelec=grid.electrodes.length;

            if (nelec!==other.data.grids[i].electrodes.length) {
                out.value=1000.0;
                console.log('different number of electrodes in grid',i,
                            this.data.grids[i].electrodes.length,
                            other.data.grids[i].electrodes.length,
                           );
                return out;
            }

            for (let j=0;j<nelec;j++) {
                let sum=0.0;
                let e1=this.getElectrode(i,j);
                let e2=other.getElectrode(i,j);
                for (let ia=0;ia<=2;ia++) {
                    sum+=Math.abs(e1.position[i]-e2.position[i]);
                    sum+=Math.abs(e1.normal[i]-e2.normal[i]);
                }
                let keys=Object.keys(e1.props);
                for (let ia=0;ia<keys.length;ia++) {
                    sum+=Math.abs(e1.props[keys[i]]-e2.props[keys[i]]);
                }
                for (let ia=0;ia<e1.values.length;ia++) {
                    sum+=Math.abs(e1.values[i]-e2.values[i]);
                }
                if (sum>maxsum)
                    sum=maxsum;
            }
        }

        out.value=maxsum;
        if (out.value < threshold)
            out.testresult=true;
        return out;
    }

    // ----------------------------------------------------------------------------------------
    // Local Extensions
    // ----------------------------------------------------------------------------------------

    getNumGrids() {
        return this.data.numgrids;
    }
    
    getGrid(i) {
        if (i<0 || i>=this.data.numgrids)
            return null;
        return this.data.grids[i];
    }

    getElectrode(i,j) {
        return this.data.grids[i].electrodes[j];
    }

    
    
    // Read MGRIDs
    // ----------------------------------------------------------------------------------------
    static parseelectrode(txt,lineno,elec) {

        const PROPERTIES=[ "Motor", "Sensory", "Visual", "Language", "Auditory", "User1", "User2", "SeizureOnset", "SpikesPresent", "ElectrodePresent", "ElectrodeType", "Radius", "Thickness" ];
        lineno+=1;
        let pos=txt[lineno+5].trim().split(" ");
        let norm=txt[lineno+7].trim().split(" ");
        for (let i=0;i<=2;i++) {
            pos[i]=parseFloat(pos[i]);
            norm[i]=parseFloat(norm[i]);
        }
        //console.log('\t ++++ Position of ('+txt[lineno+1]+')=',pos);
        lineno+=9;
        let props={};
        for (let i=0;i<PROPERTIES.length;i++) {
            //console.log('Compare',txt[lineno-1],'with',PROPERTIES[i]);
            props[PROPERTIES[i]]=txt[lineno].trim();
            lineno+=2;
        }

        let a=txt[lineno-1].trim();
        let values=[];
        if (a==='#Values') {
            let numvalues=parseInt(txt[lineno]);
            for (let i=0;i<numvalues;i++) {
                lineno+=1;
                values.push(parseFloat(txt[lineno].trim()));
            }
        } else {
            //            console.log('No VALUES',lineno);
            lineno=lineno-2;
        }
            
        elec.push({
            'position' : pos,
            'normal' : norm,
            'values' : values,
            'props' : props
        });
        
        return lineno;
        
    }
    
    static parsegrid(txt,lineno,egrid) {

        //        console.log('Reading=',lineno+5,txt[lineno+5]);
        let description=txt[lineno+5];
        let dimensions=txt[lineno+7].trim();
        let spacing=txt[lineno+9].trim();
        let electrodetype=txt[lineno+11];
        let radius=txt[lineno+13];
        let thickness=txt[lineno+15];
        let color=txt[lineno+17].trim().split(' ');
        for (let i=0;i<=2;i++)
            color[i]=parseFloat(color[i]);
        lineno=lineno+17;
        
        let dims=dimensions.split(" ");
        for (let i=0;i<=1;i++)
            dims[i]=parseInt(dims[i]);
        //console.log('Grid',description,' dims=',dims[0],dims[1],'color=',color);
        let elec=[];
        let numelec=dims[0]*dims[1];
        for (let i=0;i<numelec;i++) {
            lineno=BisWebElectrodeMultiGrid.parseelectrode(txt,lineno,elec);
        }
        
        egrid.push( {
            'description' : description,
            'dimensions'  : dims,
            'spacing' : spacing,
            'electrodetype' : electrodetype,
            'radius' : radius,
            'thickness' : thickness,
            'color' : color,
            'electrodes' : elec
        });
        
        return lineno+1;
        
    }
    
    loadMGRIDFile(fname) {

        return new Promise( (resolve,reject) => {
            
            genericio.read(fname).then( (fdataobj) => {
                let txt=fdataobj.data.split('\n');

                //console.log('Read Grid from',fdataobj.filename,'numlines=',txt.length);
                
                if (txt[0].trim()!=="#vtkpxElectrodeMultiGridSource File") {
                    console.log('Bad File',txt[0]);
                    reject('Bad header'+txt[0]);
                    return;
                }

                let numgrids=parseInt(txt[6]);
                let pname=txt[2];
                let comment=txt[4];
                let egrid=[];
                let lineno=7;

                for (let i=0;i<numgrids;i++) {
                    lineno=BisWebElectrodeMultiGrid.parsegrid(txt,lineno,egrid);
                    //console.log('Read ',egrid[i].description);
                }

                this.data={};
                this.data['patient']=pname;
                this.data['comment']=comment;
                this.data['numgrids']=numgrids,
                this.data['grids']=egrid;
                this.setFilename(fdataobj.filename);
                console.log('++++\t loaded mgrid file from '+fdataobj.filename);
                resolve('loaded mgrid file from '+fdataobj.filename);
                return;
            }).catch( (e) => {
                console.log('Failed to read from ', fname.name || fname);
                reject(e);
            });
        });
    }

    saveMGRIDFile(fname) {

        let output=`#vtkpxElectrodeMultiGridSource File
#Description
${this.data.patient}
#Comment
${this.data.comment}
#Number of Grids
 ${this.data.numgrids}`;

        for (let i=0;i<this.data.numgrids;i++) {
            let grid=this.data.grids[i];
            output+=`
#- - - - - - - - - - - - - - - - - - -
# Electrode Grid ${i}
- - - - - - - - - - - - - - - - - - -
#vtkpxElectrodeGridSource File v2
#Description
${grid.description}
#Dimensions
 ${grid.dimensions.join(' ')}
#Electrode Spacing
 ${grid.spacing}
#Electrode Type
${grid.electrodetype}
#Radius
${grid.radius}
#Thickeness
${grid.thickness}
#Color
${grid.color[0].toFixed(3)} ${grid.color[1].toFixed(3)} ${grid.color[2].toFixed(3)}`;
            let electrodes=grid.electrodes;
            let index=0;
            for (let ja=0;ja<grid.dimensions[1];ja++) {
                for (let ia=0;ia<grid.dimensions[0];ia++) {
                    {
                        let elec=electrodes[index];
                        index++;
                        output+=`
#- - - - - - - - - - - - - - - - - - -
# Electrode ${ia} ${ja}
- - - - - - - - - - - - - - - - - - -
#vtkpxElectrodeSource2 File
#Position
 ${elec.position[0].toFixed(4)} ${elec.position[1].toFixed(4)} ${elec.position[2].toFixed(4)}
#Normal
 ${elec.normal[0].toFixed(4)} ${elec.normal[1].toFixed(4)} ${elec.normal[2].toFixed(4)}
#Motor Function
${elec.props['Motor']}
#Sensory Function
${elec.props['Sensory']}
#Visual Function
${elec.props['Visual']}
#Language Function
${elec.props['Language']}
#Auditory Function
${elec.props['Auditory']}
#User1 Function
${elec.props['User1']}
#User2 Function
${elec.props['User2']}
#Seizure Onset
${elec.props['SeizureOnset']}
#Spikes Present
${elec.props['SpikesPresent']}
#Electrode Present
${elec.props['ElectrodePresent']}
#Electrode Type
${elec.props['ElectrodeType']}
#Radius
${elec.props['Radius']}
#Thickeness
${elec.props['Thickness']}
#Values
${elec.values.length}`;
                        output+='\n';
                        for (let i=0;i<elec.values.length;i++) {
                            output+=`${elec.values[i].toFixed(6)}`;
                        }
                    }
                }
            }
        }
        output+='\n';
        
        return new Promise( (resolve,reject) => {
            genericio.write(fname,output).then( () => {
                console.log('++++\t saved in mgrid format in '+fname);
                resolve('++++\t saved in mgrid format in '+fname);
            }).catch( (e) => { reject(e); });
        });
    }

    transformElectrodes(xform,flipx=false,flipy=false,widthmm=256.0,heightmm=256.0) {
        
        let numgrids=this.data.numgrids;
        for (let i=0;i<numgrids;i++) {
            let grid=this.data.grids[i];
            let nelec=grid.electrodes.length;
            for (let j=0;j<nelec;j++) {
                let electrode=this.getElectrode(i,j);
                if (flipx) 
                    electrode.position[0]= widthmm-electrode.position[0];
                if (flipy)
                    electrode.position[1]= heightmm-electrode.position[1];
            
                let q=[0,0,0];
                xform.transformPoint(electrode.position,q);
                for (let k=0;k<=2;k++) 
                    electrode.position[k]=q[k];
            }
        }
    }
    
}


module.exports=BisWebElectrodeMultiGrid;
