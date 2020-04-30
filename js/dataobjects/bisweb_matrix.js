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
const wasmutil=require('bis_wasmutils');
const numeric=require('numeric');

/** Class for storing a matrix
 * @param{string} dtype - either matrix or vector (needed for wasm)
 * @param{Matrix} inputmat - if not null set the values from this
 */


class BisWebMatrix extends BisWebDataObject{
    
    constructor(dtype='matrix',inputmat=null) {

        if (dtype!=='vector')
            dtype='matrix';
        
        super();
        this.jsonformatname='BisMatrix';
        this.legacyextension="csv";
        this.extension=".bismatr";
        this.dimensions=[0,0];
        this.data=null;
        this.wasmtype=dtype;
        this.datatype="float";
        if (inputmat!==null) {
            if (inputmat.constructor.name === "Float32Array")
                this.linkToTypedArray(inputmat);
            else
                this.setFromNumericMatrix(inputmat);
        }
    }

    // ---- Get Object Information -------------------------------------------------
    /** Returns the type of the object as a string
     * @returns{String} - the type of the object (e.g. image,matrix ...)
     */
    getObjectType() {
        return 'matrix';
    }
    
    /** returns a textual description of the object for GUIs etc.
     * @returns {string} description
     */
    getDescription() {
        return "Matrix: "+this.filename+" ["+this.dimensions.join("*")+'], tp='+this.datatype;
    }

    /** compute hash 
     * @returns {String} - hash string identifying the object
     */
    computeHash() {
        if (this.data)
            return util.SHA256(this.data);
        return '*None*';
    }

    /** returns the memory used in bytes by this object 
     * @returns {number} -- the size or 0 if not implemented or small
     */
    getMemorySize() {
        return this.dimensions[0]*this.dimensions[1]*4;
    }


    // ---- Load and Save, Serialize and Deserialize to JSON -------------------------------------------------
    /**
     * Load an object from a filename or file object
     * @param {fobj} - If in browser this is a File object, if in node.js this is the filename!
     * @return {Promise} a promise that is fuilfilled when the image is loaded
     */
    load(fobj) {
        const self=this;
        return new Promise( (resolve,reject) => {

            let fname=fobj;
            if (fname.name) 
                fname=fname.name;
            let ext=fname.split('.').pop().toLowerCase();
            if (ext==='binmatr') {
                genericio.read(fobj, true).then((contents) => {
                    self.parseBinaryMatrix(contents.data,reject);
                    self.setFilename(contents.filename);
                    console.log('++++\t Loaded Binary '+this.getDescription());
                    resolve('loaded binary  matrix from '+contents.filename);
                    return;
                });
                return;
            }
            
            genericio.read(fobj, false).then((contents) => {
                self.parseFromText(contents.data,contents.filename,reject);
                self.setFilename(contents.filename);
                console.log('++++\t loaded matrix  '+this.filename,' ',this.getDescription());
                resolve('loaded matrix from '+contents.filename);
                
            }).catch( (e) => { reject(e); });
        });
    }

    /** saves an object to a filename. 
     * @param {string} filename - the filename to save to. If in broswer it will pop up a FileDialog
     * @return {Promise} a promise that is fuilfilled when the image is saved
     */
    save(filename) {

        this.datatype=wasmutil.getNameFromType(this.data);
        let fname=filename;
        if (fname.name) 
            fname=fname.name;
        let ext=fname.split('.').pop().toLowerCase();
        if (ext==='binmatr' ) {
            let output=this.serializeToBinaryMatrix();
            return new Promise( function(resolve,reject) {
                genericio.write(filename,output).then( (f) => {
                    console.log('++++\t Saved Binary Matrix in '+filename);
                    resolve(f);
                }).catch( (e) => { reject(e);});
            });
        }
        
        let output = this.serializeToText(filename);
        return new Promise( function(resolve,reject) {
            genericio.write(filename,output).then( (f) => {
                console.log('++++\t saved matrix in '+filename);
                resolve(f);
            }).catch( (e) => { reject(e); });
        });
    }

    /** serializes object to a javascript dictionary object
        @returns {Object} dictionary containing all key elements
    */
    serializeToDictionary() {
        this.datatype=wasmutil.getNameFromType(this.data);
        let obj= super.serializeToDictionary();
        let bytesarr=new Uint8Array(this.data.buffer);
        let b=genericio.tozbase64(bytesarr);
        obj.dimensions=this.dimensions;
        obj.datatype=this.datatype;
        obj.matrix=b;
        return obj;
    }
    
    /** parses from Dictionary Object  
     * @param {Object} obj -- dictionary object
     * @returns {Boolean} true if OK
     */
    parseFromDictionary(b) {
        let bytesarr=genericio.fromzbase64(b.matrix);
        this.dimensions=b.dimensions;
        this.datatype=b.datatype || 'float';

        let fn=wasmutil.getTypeFromName(this.datatype);
        this.data=new fn(bytesarr.buffer);
        //this.datatype=wasmutil.getNameFromType(this.data);
        super.parseFromDictionary(b);
        return true;
    }


    // ---- Interface to Web Assembly Code ----------------------------------------------------
    
    /** serializes an object to a WASM array
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @returns {Pointer}  -- pointer biswasm serialized array
     */
    serializeWasm(Module) {
        if (this.wasmtype==='vector'  && this.dimensions[1]===1)
            return wasmutil.packStructure(Module,this.data, [ this.dimensions[0] ]);
        return wasmutil.packStructure(Module,this.data, this.dimensions);
    }

    /** serializes an object to a WASM array
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @returns {Pointer}  -- pointer biswasm serialized array
     */
    serializeWasmInPlace(Module,inDataPtr) {
        
        if (this.wasmtype==='vector'  && this.dimensions[1]===1)
            return wasmutil.packStructureInPlace(Module,inDataPtr,this.data, [ this.dimensions[0] ]);
        
        return wasmutil.packStructureInPlace(Module,inDataPtr,this.data, this.dimensions);
    }

    getWASMNumberOfBytes() {
        // 16 = main header, 8=my header, 4*Rows*Cols
        return 16+8+4*this.dimensions[0]*this.dimensions[1];
    }

    /** deserializes an object from WASM array (with an optional second input to help with header stuff)
     * @param {EmscriptenModule} Module - the emscripten Module object
     * @param {Pointer} wasmarr - the unsined char wasm object
     */
    deserializeWasm(Module,wasmarr) {
        const wasmobj=wasmutil.unpackStructure(Module,wasmarr);

        if (wasmobj.magic_type!==wasmutil.get_matrix_magic_code(Module) &&
            wasmobj.magic_type!==wasmutil.get_vector_magic_code(Module) ) {
            console.log('failed to unpack Matrix');
            return 0;
        }

        if (wasmobj.magic_type===wasmutil.get_vector_magic_code(Module) )  {
            this.wasmtype='vector';
            this.dimensions=[ wasmobj.data_array.length ,1 ];
        } else {
            this.wasmtype='matrix';
            this.dimensions= [ wasmobj.dimensions[0],wasmobj.dimensions[1] ];
        }

        this.data=wasmobj.data_array;
        this.datatype=wasmutil.getNameFromType(this.data);

        return 1;
    }
    

    // ---- Testing utility ----------------------------------------------------
    /** compares an image with a peer object of the same class and returns true if similar or false if different 
     * @param{BisWebMatrix} other - the other object
     * @param{String} method - the comparison method one of maxabs,ssd,cc etc.
     * @param{Number} threshold - the threshold to use for comparison
     * @returns{Object} - { testresult: true or false, value: comparison value, metric: metric name } 
     */
    compareWithOther(other,method="maxabs",threshold=0.01) {
        
        let out = {
            testresult : false,
            value : null,
            metric : "maxabs"
        };

        if (other.constructor.name !== this.constructor.name)  {
            console.log('different constructors');
            return out;
        }
        let idat=this.data || null;
        let odat=other.getDataArray() || null;

        if (idat && odat) {
            if (idat.length!==odat.length)  {
                console.log('different lengths');
                return out;
            }
            
            console.log('....\t comparing matrices:',this.getDimensions(),other.getDimensions(),method,this.datatype,other.datatype);
            if (method==='ssd') {
                let sum=0.0;
                for (let i=0;i<idat.length;i++) {
                    let v=(idat[i]-odat[i]);
                    sum+=v*v;
                }
                out.value=Math.sqrt(sum);
                out.metric='ssd';
            } else {
                let maxv=0.0;
                for (let i=0;i<idat.length;i++) {
                    maxv=Math.max(Math.abs(idat[i]-odat[i]));
                }
                out.value=maxv;
            }

            if (out.value < threshold)
                out.testresult=true;
        } else {
            let l1=0,l2=0;
            if (idat)
                l1=idat.length;
            if (odat)
                l2=odat.length;
            if (l1!==l2) {
                console.log('different lengths');
                return out;
            } else {
                out.value=0.0;
                out.testresult=true;
            }
        }

        return out;
    }

    // ---------------------------- Localized Stuff ---------------------
    /** Allocate Matrix
     * @param {number} numrows  - number of rows
     * @param {number} numcols  - number of cols
     * @param {number} value    - value to fill =0
     * @param {String} dtype    - matrix dtpe
     */
    allocate(numrows,numcolumns,value=0,dtype='float') {
        this.dimensions=[numrows,numcolumns];
        let fn=wasmutil.getTypeFromName(dtype);
        this.data=new fn(numrows*numcolumns);
        this.datatype=wasmutil.getNameFromType(this.data);
        for (let i=0;i<numrows*numcolumns;i++)
            this.data[i]=value;
    }

    /** Allocate Matrix and fill with zero
     * @param {number} numrows  - number of rows
     * @param {number} numcols  - number of cols
     */
    zero(numrows,numcolumns) {
        this.allocate(numrows,numcolumns,0);
    }
    
    /** returns an element
     * @param{number} row - row index
     * @param{number} column - column index
     * @returns{number} the value at (row,column)
     */
    getElement(row,column) {
        return this.data[row*this.dimensions[1]+column];
    }

    /** sets an element
     * @param{number} row - row index
     * @param{number} column - column index
     * @param{number} the value to set at (row,column)
     */
    setElement(row,column,value) {
        this.data[row*this.dimensions[1]+column]=value;
    }

    
    /** getDataArray 
     * @returns {TypedArray} - the data
     */
    getDataArray() {
        return this.data;
    }

    /** getDimensions
     * @returns {array} - the data dimensions
     */
    getDimensions() {
        return this.dimensions.slice(0);
    }

    /** getNumericMatrix 
     * @returns{Matrix} - a 2d numeric.js matrix */
    getNumericMatrix() {
        let out=util.zero(this.dimensions[0],this.dimensions[1]);
        for (let row=0;row<this.dimensions[0];row++)
            for (let col=0;col<this.dimensions[1];col++)
                out[row][col]=this.data[row*this.dimensions[1]+col];
        return out;
    }

    /** setFromNumericMatrix 
     * @param{Matrix} mat - a 2d numeric.js matrix */
    setFromNumericMatrix(mat) {

        this.datatype='float';
        let sz=numeric.dim(mat);
        if (sz.length===2) {
            let rows=0;
            for (let i=0;i<sz[0];i++) {
                if (!isNaN(mat[i][0]))
                    rows+=1;
                else
                    i=sz[0];
            }
            sz[0]=rows;

            
            this.dimensions=[sz[0],sz[1]];
            this.data=new Float32Array(sz[0]*sz[1]);
            this.datatype=wasmutil.getNameFromType(this.data);
            console.log('++++\t\t setting from Numeric Matrix. Input rows=',sz[0],'output rows=',rows,' tp='+this.datatype);

            let index=0;
            for (let row=0;row<this.dimensions[0];row++) {
                for (let col=0;col<this.dimensions[1];col++) {
                    this.data[index]=mat[row][col];
                    index=index+1;
                }
            }
        } else {
            this.dimensions=[sz[0],1];
            this.data=new Float32Array(sz[0]);
            this.datatype=wasmutil.getNameFromType(this.data);
            for (let row=0;row<this.dimensions[0];row++)
                this.data[row]=mat[row];
        }
    }
    
    /** linkToTypedArray
     * @param{TypedArray} arr - a 2d numeric.js matrix */
    linkToTypedArray(arr) {
        this.data=arr;
        this.datatype=wasmutil.getNameFromType(this.data);
        this.dimensions=[ arr.length,1];
        this.wasmtype='vector';
    }

    /** parseFromTexts the matrix from a string consistent 
     * with the legacy BioImage Suite .matr or .csv or .txt  formats or .json
     * @param {string} inpstring - input string
     * @param {string} filename -  filename of original file
     * @return {boolean} val - true or false
     */
    parseFromText(text,filename) {
        
        let fixed = genericio.getFixedLoadFileName(filename);
        let ext=  fixed.split('.').pop();
        
        if (ext === 'csv' || ext==='matr' || ext==="txt") {

            if (ext==="txt") {
                // Make this into CSV file
                //console.log(text);
                let s=text.split('\n');
                text="";
                for (let i=0;i<s.length;i++) {
                    if (s[i].indexOf("#")!==0) {
                        let v=s[i].trim().replace(/ /g,',').replace(/\t/g,',').replace(/,+/g,',');
                        if (v.length>0)
                            text=text+v+'\n';
                    }
                }
                ext='csv';
            }
            
            let output=null;
            if (ext==='csv')
                output = numeric.parseCSV(text);
            else
                output=BisWebMatrix.parseMatrFile(text);

            this.setFromNumericMatrix(output);
            return 1;
        }

        return this.parseFromJSON(text);
    }

    /** serializes the matrix from a string consistent 
     * to the legacy BioImage Suite .matr or .csv formats or .json
     * @param {string} filename -  filename of original file
     * @return {String} text - the output text
     */
    serializeToText(filename) {

        this.datatype=wasmutil.getNameFromType(this.data);
        let ext = filename.name ? filename.name.split('.').pop() : filename.split('.').pop();

        if (ext==='csv') {
            let output="";
            for (let row=0;row<this.dimensions[0];row++) {
                for (let col=0;col<this.dimensions[1];col++) {
                    output=output+`${this.data[row*this.dimensions[1]+col]}`;
                    if (col!=(this.dimensions[1]-1))
                        output+=", ";
                }
                if (row!=(this.dimensions[0]-1)) 
                    output=output+"\n";
            }
            return output;
        }

        if (ext === 'matr' ) {
            let mat=this.getNumericMatrix();
            let name='matrix';
            if (this.dimensions[1]===1)
                name='vector';
            return BisWebMatrix.serializeMatrFile(mat,name);
        }

        return this.serializeToJSON(false);
    }

    /** parse binary matrix
     * @param {Buffer} data
     * @param {Function} reject
     */
    parseBinaryMatrix(data,reject) {
        
        let head=new Uint32Array(data.buffer,0,4);
        if (head[0]!==1700) {
            reject('Bad header in binary matrix');
            return;
        }

        let tp=head[1];
        let idat=null;

        let matsize=head[2]*head[3];
        
        if (tp===2) {
            idat=new Float32Array(data.buffer,16,matsize);
            this.data=new Float32Array(matsize);
        } else if (tp===1) {
            idat=new BigInt64Array(data.buffer,16,matsize);
            this.data=new BigInt64Array(matsize);
        } else {
            idat=new Float64Array(data.buffer,16,matsize);
            this.data=new Float64Array(matsize);
        }
        this.data.set(idat);
        this.datatype=wasmutil.getNameFromType(this.data);
        this.dimensions=[ head[2],head[3] ];
        return 1;
    }

    /** store in binary matrix */
    serializeToBinaryMatrix() {

        let sz=4;
        if (this.datatype!=="float")
            sz=8;

        let matsize=this.dimensions[0]*this.dimensions[1];
        let output=new Uint8Array(sz*matsize+16);
        
        let hd=new Uint32Array(output.buffer,0,4);
        hd[0]=1700;
        hd[1]=0;
        hd[2]=this.dimensions[0];
        hd[3]=this.dimensions[1];

        let dat=null;
        
        if (this.datatype=='float') {
            hd[1]=2;
            dat=new Float32Array(output.buffer,16,matsize);
        } else if (this.datatype==='int64') {
            hd[1]=1;
            dat=new BigInt64Array(output.buffer,16,matsize);
        } else {
            hd[1]=3;
            dat=new Float64Array(output.buffer,16,matsize);
        }

        for (let i=0;i<matsize;i++) {
            dat[i]=this.data[i];
        }
        dat=null;
        hd=null;
        return output;
    }


    /** parse string from .matr file 
     * @param {string} filestring
     * @returns {Matrix} -- the deserialized matrix
     */
    static parseMatrFile(matrstring) {
        var lines=matrstring.split("\n");
        /*
          #vtkpxMatrix File
          # name: Test_bis_glm
          # type: matrix
          # rows: 200
          # columns: 3
        */
        if (lines[0].trim() !== "#vtkpxMatrix File" ) {
            return [0];
        }
        
        let rows = parseInt(lines[3].split(":")[1]);
        let columns = parseInt(lines[4].split(":")[1]);
        
        var out=util.zero(rows,columns);
        for (let l=5;l<(5+rows);l++) {
            var lst=lines[l].trim().split(" ");
            if (lst.length!==columns) {
                console.log('Error bad file ');
                return [0];
            }
            let row=l-5;
            for (let col=0;col<columns;col++) {
                out[row][col]=parseFloat(lst[col]);
            }
        }
        return out;
    }
    
    /** parse string from .matr file 
     * @param {Matrix} matrix -- the  matrix to serialize
     * @param {String} name -- the  matrix name (optional)
     * @returns {string} filestring
     
     */
    static serializeMatrFile(matrix,name='matrix') {
        
        let sz=numeric.dim(matrix);
        let tname="matrix";
        if (sz.length===1)
            tname="vector";
        let out = "#vtkpxMatrix File\n"+
            "# name: "+name+"\n"+
            "# type: "+tname+"\n"+
            "# rows: "+(sz[0])+"\n"+
            "# columns: "+(sz[1] || 1)+"\n";

        if (sz.length>1) {
            for (let row=0;row<sz[0];row++) {
                out+=matrix[row].join(" ")+"\n";
            }
        } else {
            for (let row=0;row<sz[0];row++) {
                out+=matrix[row]+"\n";
            }
        }
        return out;
    }
    
    /** loads a Matrix and returns a numeric Matrix 
     * @param {String} filename -- abstact file handle object
     * @returns {Promise} -- the .then function of the promise has an object with two members data and filename
     * that contain the actual data read and the actual filename read respectively.
     */
    
    static loadNumericMatrix(filename) {

        return new Promise( function(resolve,reject) {

            let obj=new BisWebMatrix();
            obj.load(filename).then( () => {

                resolve( {
                    data:  obj.getNumericMatrix(),
                    filename: filename
                });
            }).catch( (e) => { reject(e); });
        });
    }

}


module.exports=BisWebMatrix;
