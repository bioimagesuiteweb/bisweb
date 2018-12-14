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

const bisgenericio=require('bis_genericio');

/** 
 * @file Browser or Node.js module. Contains {@link BisHeader}.
 * @author Xenios Papademetris
 * @version 1.0
 */

/** Map from typename to size and TypedArray type 
    @alias BisHeader~typesizes
*/
const typesizes = {
    uchar :   [ 1,   Uint8Array   ],
    schar :    [ 1,   Int8Array    ],
    cchar :    [ 1,   Int8Array    ],
    ushort :  [ 2,   Uint16Array  ],
    sshort :   [ 2,   Int16Array   ],
    short :   [ 2,   Int16Array   ],
    uint :    [ 4,   Uint32Array  ], 
    sint :     [ 4,   Int32Array   ],
    int :     [ 4,   Int32Array   ],
    float :   [ 4,   Float32Array ],
    double :  [ 8,   Float64Array ]
};

/** Map from niftitype (code or number) to name and TypedArray type 
    @alias BisHeader~niftitypes
*/
const niftitypes= {
    2 :   [ 'uchar',  Uint8Array ,2],
    4 :   [ 'sshort', Int16Array ,4],
    8 :   [ 'sint', Int32Array  , 8],
    16 :  [ 'float',Float32Array,16 ],
    64 :  [ 'double',Float64Array,64],
    256 : [ 'schar',Int8Array ,256],
    512 : [ 'ushort',Uint16Array,512 ],
    768 : [ 'uint',Uint32Array,768]
};

/** Map from type name (e.g. char) to niftitype (e.g. 256))
    @alias BisHeader~name2nifticode
*/
const name2nifticode= {
    char : 256,
    schar : 256,
    uchar : 2,
    short : 4,
    sshort : 4,
    ushort : 512,
    int : 8,
    sint : 8,
    uint : 768,
    float : 16,
    double : 64,
};

/** Nifti Header Spec array of triples [ name, type, number of elements ]
    @alias BisHeader~niftiheaderspec
*/
const niftiheaderspec = [  [ 'sizeof_hdr', 'uint',1 ],
                           [ 'data_type' , 'uchar', 10],
                           [ 'db_name' , 'uchar', 18],
                           [ 'extents' , 'uint',1 ],
                           [ 'session_error' , 'ushort',1 ],
                           [ 'regular' , 'uchar',1 ],
                           [ 'dim_info' , 'uchar',1 ],
                           [ 'dim' , 'ushort', 8],
                           [ 'intent_p1' , 'float',1 ],
                           [ 'intent_p2' , 'float',1 ],
                           [ 'intent_p3' , 'float',1 ],
                           [ 'intent_code' , 'ushort',1 ],
                           [ 'datatype' , 'ushort',1 ],
                           [ 'bitpix' , 'ushort',1 ],
                           [ 'slice_start' , 'ushort',1 ],
                           [ 'pixdim' , 'float', 8],
                           [ 'vox_offset' , 'float',1 ],
                           [ 'scl_slope' , 'float',1 ],
                           [ 'scl_inter' , 'float',1 ],
                           [ 'slice_end' , 'ushort',1 ],
                           [ 'slice_code' , 'uchar',1 ],
                           [ 'xyzt_units' , 'uchar',1 ],
                           [ 'cal_max' , 'float',1 ],
                           [ 'cal_min' , 'float',1 ],
                           [ 'slice_duration' , 'float',1 ],
                           [ 'toffset' , 'float',1 ],
                           [ 'glmax' , 'uint', 1],
                           [ 'glmin' , 'uint', 1],
                           [ 'descrip' , 'uchar', 80],
                           [ 'aux_file' , 'uchar', 24],
                           [ 'qform_code' , 'ushort',1 ],
                           [ 'sform_code' , 'ushort',1 ],
                           [ 'quatern_b' , 'float',1 ],
                           [ 'quatern_c' , 'float',1 ],
                           [ 'quatern_d' , 'float',1 ],
                           [ 'qoffset_x' , 'float',1 ],
                           [ 'qoffset_y' , 'float',1 ],
                           [ 'qoffset_z' , 'float',1 ],
                           [ 'srow_x' , 'float', 4],
                           [ 'srow_y' , 'float', 4],
                           [ 'srow_z' , 'float', 4],
                           [ 'intent_name' , 'uchar', 16],
                           [ 'magic' , 'uchar', 4],
                           [ 'blank' , 'uchar', 4]
                        ];


/** 
 * A class for reading/writing and storing NIFTI image headers. 
 * @constructs BisHeader
 */

class BisHeader {
    
    constructor() {
        this.internal = {
            typedefs : null
        };
        this.struct= { };
        this.extensions=null;
    }
    
    /** 
     * Returns type of nifti image as an array [ string, pointertype ] e.g.  [ 'uchar',  Uint8Array ].
     * @param {number} dt -- either an integer containing the nifti code (e.g. 2=uchar) or the name of the type (e.g. `uchar')
     */
    getniftitype(dt) { 
        
        var a=parseInt(dt);
        if (isNaN(a)) {
            a=name2nifticode[dt];
        }
        
        var b=niftitypes[a] ||  -1;
        return b;
    }
    
    /** 
     * Returns type of nifti image as an array [ string, pointertype ] e.g.  [ 'uchar',  Uint8Array ].
     * @param dt -- either an integer containing the nifti code (e.g. 2=uchar) or the name of the type (e.g. `uchar')
     */
    gettypesize(dt) {
        return typesizes[dt];
    }
    
    
    /** 
     * Initializes header as a nifti header (there may be other types in the future)
     */
    initializenifti() {
        this.initialize(niftiheaderspec);
    }
    
    /** 
     * Initializes header using header definition
     * @param {array} typedefs - header(struct) definition. See {@link BisHeaderInternal.niftiheaderspec} for an example
     */
    initialize( typedefs ) { 
        
        this.struct = { };
        var l=typedefs.length;
        var total=0;
        for (var i=0;i<l;i++) {
            var key=typedefs[i][0];
            var tp=typedefs[i][1];
            var sz=typedefs[i][2];
            total+=sz*typesizes[tp][0];
            if (sz==1)
                this.struct[key]=0;
            else
                this.struct[key]=null;
        }
        // Add two semiprivate things to show size and store definitions
        this.internal.typedefs = typedefs;
        return total;
    }
    
    /** 
     * Parse header from array buffer. Total length if specified denotes the length of the header
     * (as is the case with nifti that can have extensions). Otherwise the length is computer from the header spec
     * -- see {@link BisHeader.initialize}.
     * @param {arraybuffer} buffer - raw data buffer to parse
     * @param {number} totallength - optional length of buffer else computed from size of header spec
     */
    parse(buffer,totallength,swap=false) {

        let offset=0;
        let l=this.internal.typedefs.length;
        for (let i=0;i<l;i++) {
            let key=this.internal.typedefs[i][0];
            let tp=this.internal.typedefs[i][1];
            let sz=this.internal.typedefs[i][2];
            let sizeoftype=typesizes[tp][0];
            let Arraytype=typesizes[tp][1];

            if (swap && sizeoftype>1) {
                let _tmp=new Uint8Array(buffer,offset,sz*sizeoftype);
                for (let i=0;i<sz;i++) {
                    let offset=i*sizeoftype;
                    for (let j=0;j<sizeoftype/2;j++) {
                        let j1=j+offset;
                        let tmp1=_tmp[j1];
                        let j2=offset+(sizeoftype-1-j);
                        _tmp[j1]=_tmp[j2];
                        _tmp[j2]=tmp1;
                    }
                }
            }
            
            let _bytes = new Arraytype(buffer,offset,sz);
            offset+=sz*sizeoftype;
            if ( sz === 1 ) {
                this.struct[key]=_bytes[0];
            } else {
                let newbytes=new Array(sz);
                for (let j=0;j<sz;j++)
                    newbytes[j]=_bytes[j];
                this.struct[key]=newbytes;
            }

        }

        this.extensions = null;
        if (offset < totallength) {
            let diff=totallength-offset;
            this.extensions=new Uint8Array(diff);
            let _inbytes=new Uint8Array(buffer,offset,diff);
            for (let kk=0;kk<diff;kk++)
                this.extensions[kk]=_inbytes[kk];
        }
        
        // Check bit pix
        let dt=this.struct['datatype'];
        let name=niftitypes[dt][0];
        let bitpix=typesizes[name][0]*8;

        if (bitpix!==this.struct['bitpix']) {
            this.struct['bitpix']=bitpix;
        }

    }
    
    
    /** 
     * create binary buffer from header values. Do this before saving or cloning the header etc.
     */
    createHeaderRawData(keepextensions=false) {
        
        let totallength=352;
        if (keepextensions === true && this.extensions !==null) {
            if (this.extensions.length > 0 ) {
                totallength=totallength+this.extensions.length;
                this.struct["blank"]=[1,0,0,0];
            }
        } else {
            this.struct["blank"]=[0,0,0,0];
        }


        this.struct['vox_offset']=totallength;
        let outputbuffer = new ArrayBuffer(totallength);
        let offset=0;
        let l=this.internal.typedefs.length,kk;

        for (let i=0;i<l;i++) {
            
            let key=this.internal.typedefs[i][0];
            let tp=this.internal.typedefs[i][1];
            let sz=this.internal.typedefs[i][2];
            
            let sizeoftype=typesizes[tp][0];
            let Arraytype=typesizes[tp][1];
            
            let _dataarray = new Arraytype(outputbuffer,offset,sz);

            if (sz===1) {
                _dataarray[0]=this.struct[key];
            } else {
                for (kk=0;kk<sz;kk++) 
                    _dataarray[kk]=this.struct[key][kk];
            }
            offset+=sz*sizeoftype;
        }

        let bdata=new Uint8Array(outputbuffer);

        if (totallength !== offset) {
            let diff=totallength-offset;

            for (kk=0;kk<diff;kk++)
                bdata[kk+offset]=this.extensions[kk];
        }

        return { length : totallength,
                 data   : bdata };
    }

    /** serializes the header set to a json string
     * @return {string} string - containing json formattted values
     */
    serialize(dataonly=false)  {

        let obj = { 
            bisformat : 'BisHeader',
            data : this.struct,
            defs : null,
        };
        if ( !dataonly)
            obj.defs =this.internal.typedefs;
        return JSON.stringify(obj);
    }
    
    /** deserializes the header from a json string
     * @param {string} inpstring - input JSON string
     * @param {callback} doerror -  function to call if error 
     * @return {boolean} val - true or false
     */
    deserialize(jsonstring,doerror) {
        
        let b;
        try {
            b=JSON.parse(jsonstring);
        } catch(e) {
            doerror('image header does not come from a valid JSON string');
            return false;
        }
        
        if (b.bisformat !== 'BisHeader') {
            doerror("Bad JSON File element bisformat does not equal \"BisHeader\"");
            return false;
        }

        this.internal.typedefs = b.defs;
        this.struct=b.data;

        return true;
    }

    /**
     * Initialize New Nifti Header
     */
    createNIFTIHeader() {
        this.struct =  {
            "sizeof_hdr":348,
            "data_type":[0,0,0,0,0,0,0,0,0,0],
            "db_name":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            "extents":0,
            "session_error":0,
            "regular":0,
            "dim_info":0,
            "dim":[3,64,64,64,1,0,0,0],
            "intent_p1":0,
            "intent_p2":0,
            "intent_p3":0,
            "intent_code":0,
            "datatype":2,
            "bitpix":8,
            "slice_start":0,
            "pixdim":[1,1,1,1,1,1,1,1],
            "vox_offset":352,
            "scl_slope":1,
            "scl_inter":0,
            "slice_end":0,
            "slice_code":0,
            "xyzt_units":2,
            "cal_max":255,
            "cal_min":0,
            "slice_duration":1,
            "toffset":0,
            "glmax":208,
            "glmin":0,
            "descrip":[100,101,102,97,117,108,116,32,98,105,115,73,109,97,103,101,72,101,97,100,101,114,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            "aux_file":[110,111,110,101,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            "qform_code":0,
            "sform_code":1,
            "quatern_b":0,
            "quatern_c":0,
            "quatern_d":1,
            "qoffset_x":0,
            "qoffset_y":0,
            "qoffset_z":0,
            "srow_x":[1,0,0,0],
            "srow_y":[0,1,0,0],
            "srow_z":[0,0,1,0],
            "intent_name":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            "magic":[110,43,49,0],
            "blank":[0,0,0,0]};
        this.internal.typedefs = niftiheaderspec;
        return;
    }

    /** Set the extensions
     *@param{Uint8Array} extensions
     */
    setExtensions(ext) {
        if (ext!==null) {
            this.extensions=ext;
        }
    }

    /** Get the extensions
     * @return{Uint8Array} -- the extensions as binary array
     */
    getExtensions() {
        return this.extensions;
    }
    
    /** parse comment list from binary string
     * @returns {Array} -- list of extensions
     */
    parseExtensionsToArray() {

        let binstr=this.extensions;
        if (binstr===null) {
            return [];
        }
        
        let len=binstr.length;
        let left=len;
        let offset=0;
        let commentlist = [];
        while (left>0) {
            let arr=new Uint32Array(binstr.buffer,offset,2);
            let strlen=arr[0];
            if (strlen>0) {
                let ostr=new Uint8Array(binstr.buffer,offset,strlen-1);
                offset=offset+strlen;
                left=left-strlen;
                let newtxt=bisgenericio.binary2string(ostr,true).trim();
                try {
                    let b=JSON.parse(newtxt);
                    if (b.extensions.constructor.name==="Array")
                        commentlist=commentlist.concat(b.extensions);
                    else
                        commentlist.push(b.extensions || []);
                } catch(e) {
                    commentlist.push({ "Legacy" : newtxt });
                }
            }
        }
        return commentlist;
    }
    /** set extensions from comment list
     * @param {Array} -- list of comments (extensions)
     */
    setExtensionsFromArray(commentlist) {
        
        if (commentlist.length<1)
            return null;
        let txt=JSON.stringify({ extensions : commentlist},null,2);
        this.extensions=bisgenericio.string2binary(txt,true);
    }

    /** copyOrientationInfo from other header 
     * @param {BisHeader} other -- the header to copy from
     */
    copyOrientationInfo(other,spacing=null) {


        
        let otherstruct=other.struct;
        let names=[ "quatern_b",        "quatern_c",    "quatern_d", "qoffset_x", "qoffset_y",  "qoffset_z" ,
                    "srow_x", "srow_y", "srow_z" , "qform_code", "sform_code"];

        

        
        for (let i=0;i<names.length;i++) {
            let item=names[i];
            if (otherstruct[item].length) {
                for (let j=0;j<otherstruct[item].length;j++)
                    this.struct[item][j]=otherstruct[item][j];
            } else {
                this.struct[item]=otherstruct[item];
            }
        }

        // This must be copied too as this defines left-handedness of quaternion
        this.struct.pixdim[0]=other.struct.pixdim[0];

        
        if (spacing!==null) {
            this.struct.pixdim[1]=spacing[0];
            this.struct.pixdim[2]=spacing[1];
            this.struct.pixdim[3]=spacing[2];

            if (this.struct.sform_code > 0) {
                let sx = this.struct.srow_x, sy = this.struct.srow_y, sz = this.struct.srow_z;
                let magn = [
                    Math.sqrt(sx[0]*sx[0]+sx[1]*sx[1]+sx[2]*sx[2]),
                    Math.sqrt(sy[0]*sy[0]+sy[1]*sy[1]+sy[2]*sy[2]),
                    Math.sqrt(sz[0]*sz[0]+sz[1]*sz[1]+sz[2]*sz[2]),
                ];

                for (let ia=0;ia<=2;ia++) {
                    sx[ia]*=spacing[0]/magn[0];
                    sy[ia]*=spacing[1]/magn[1];
                    sz[ia]*=spacing[2]/magn[2];
                }
            }
        }


    }
    

    /** returns a rich dDescription of the header ala bis_headerinfo --detail full 
     * from BioImage Suite
     * @returns {String} -- full header descriptions 
     */
    getDescription() {
        
        let dt=this.struct.datatype;
        let typename=this.getniftitype(dt);
        let len=0;
        if (this.extensions)
            len=this.extensions.length || 0;

        let s=[];
        s.push([ `\tData Type = ${typename[0]}(${dt}) (Bits per pixel=${this.struct.bitpix}), Vox_Offset=${this.struct['vox_offset']}, Extension Size=${len}`]);
        s.push(`\tScale=${this.struct['scl_slope']}, Shift=${this.struct['scl_inter']}`);
        s.push(`\tOrientation Matrix (qform_code=${this.struct['qform_code']}, sform_code=${this.struct['sform_code']})`);
        if (this.struct['qform_code']>0) {
            let names=[ "quatern_b",    "quatern_c",    "quatern_d", "qoffset_x", "qoffset_y",  "qoffset_z" ];
            let s2= '\t';
            for (let i=0;i<names.length;i++) {
                let v=this.struct[names[i]].toFixed(2);
                s2=s2+v+' ';
            }                   
            s.push(`    Quaternion = [ ${s2} ]`);
        }
        if (this.struct['sform_code']>0) {
            let names=[ "srow_x", "srow_y", "srow_z" ];
            let s2='';
            for (let i=0;i<names.length;i++) {
                s2=s2+' [ ';
                let v=this.struct[names[i]];
                for (let j=0;j<=3;j++) {
                    s2+=v[j].toFixed(3)+' ';
                }
                s2=s2+"] \n\t\t";
            }
            s.push(`\tMatrix= ${s2}`);
        }

        let cmt=this.parseExtensionsToArray();
        if (cmt.length>0) {
            s.push('\tExtensions:\n\t-----------');
            let s2=[];
            for (let i=0;i<cmt.length;i++) {
                let obj=cmt[i];
                Object.keys(obj).forEach((key) => { // jshint ignore:line
                    if (typeof obj[key] === "object") {
                        s2.push('\t  '+key+':');
                        let obj2=obj[key];
                        Object.keys(obj2).forEach((key2) => {
                            s2.push('\t      '+key2+': '+JSON.stringify(obj2[key2])+'');
                        });
                    } else {
                        s2.push('\t  '+key+':\n\t      '+JSON.stringify(obj[key])+'\n');
                    }
                });
            }
            s.push(s2.join("\n"));
        }       
        return s.join("\n")+'\n';
    }

}

module.exports = BisHeader;

