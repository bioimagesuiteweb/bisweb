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


const genericio=require('bis_genericio');
const BisWebLinearTransformation=require('bisweb_lineartransformation.js');
let BisWebGridTransformation=require("bisweb_gridtransformation");
let BisWebComboTransformation=require("bisweb_combotransformation");
let BisWebTransformationCollection=require("bisweb_transformationcollection");
const bisutil=require('bis_util');
const numeric=require('numeric');


/**
 * Utility code load and save transformations
 * @namespace BisTransformationUtil
 */

/**
 * @memberof BisTransformationUtil.createLinearTransformation
 * This function creates a new LinearTransformation
 * @returns {BisWebLinearTransformation}
 */
const createLinearTransformation=function(md) {
    return new BisWebLinearTransformation(md);
};

/**
 * @memberof BisTransformationUtil.createGridTransformation
 * This function creates a new GridTransformation
 * @returns {BisWebGridTransformation}
 */
const createGridTransformation = function (ii_dims, ii_spacing, ii_origin, ii_nonewfield, ii_linearinterpmode) {
    return new BisWebGridTransformation(ii_dims, ii_spacing, ii_origin, ii_nonewfield, ii_linearinterpmode);
};

/**
 * @memberof BisTransformationUtil.createComboTransformation
 * This function creates a new ComboTransformation
 * @returns {BisWebComboTransformation}
 */
const createComboTransformation = function (ii_initial) {
    return new BisWebComboTransformation(ii_initial);
};


/**
 * @memberof BisTransformationUtil.parseTransformationFromText
 * This function creates a new transformation from a text string
 * @param{string} inpstring - the loaded string
 * @param{string} filename - the file this came from (to check for suffixes)
 * @returns {BisWebBaseTransformation}
 */
let parseTransformationFromText = function (inpstring, filename) {

    var ext = filename.split('.').pop();
    let xform = null;

    if (ext === "matr") {
        xform = createLinearTransformation(0);
        let status = xform.legacyParseFromText(inpstring, filename);
        if (status === false)
            return null;
        xform.setFilename(filename);
        return xform;
    }

    if (ext === "grd") {
        xform = createComboTransformation(null);
        let status = xform.legacyParseFromText(inpstring, filename);
        if (status === false)
            return null;
        xform.setFilename(filename);
        return xform;
    }

    let b = "";
    try {
        b = JSON.parse(inpstring);
    } catch (e) {
        console.log(filename + " is not a valid JSON File --pick something with a .json extension");
        return false;
    }

    if (b.bisformat === 'BisLinearTransformation') {
        xform = createLinearTransformation(0);
        let status = xform.parseFromDictionary(b);
        if (status === false)
            return null;
        xform.setFilename(filename);
        return xform;
    }

    if (b.bisformat === 'BisComboTransformation') {
        xform = createComboTransformation(null);
        let status = xform.parseFromDictionary(b);
        if (status === false)
            return null;
        xform.setFilename(filename);
        return xform;
    }

    if (b.bisformat === 'BisGridTransformation') {
        xform = createGridTransformation();
        let status = xform.parseFromDictionary(b);
        if (status === false)
            return null;
        xform.setFilename(filename);
        return xform;
    }
    
    if (b.bisformat === 'BisTransformationCollection') {
        xform = new BisWebTransformationCollection();
        let status = xform.parseFromDictionary(b);
        if (status === false)
            return null;
        xform.setFilename(filename);
        return xform;
    }


    return null;
};


/** loads a Transformation from a URL. Returns a promise
 * @memberof BisTransformationUtil.loadTransformation
 * @param {String} filename -- abstact file handle object
 * @returns {Promise} -- the .then function of the promise has an object with two members data and filename
 * that contain the actual data read and the actual filename read respectively.
 */

let loadTransformation=function(filename) {

    return new Promise( function(resolve,reject) {
        
        genericio.read(filename, false).then((contents) => {

            let xform=parseTransformationFromText(contents.data, contents.filename);
            if (!xform)
                reject('Failed to read transformation from the file:'+contents.filename);
            else {
                xform.setFilename(contents.filename);
                console.log('++++\t loaded transformation from '+filename+', '+xform.constructor.name);
                resolve( { data: xform,
                           filename : contents.filename });
            }
        }).catch( (e) => { reject(e); });
    });
};

/** saves a Transformation from a URL. Returns a promise
 * @memberof BisTransformationUtil.saveTransformation
 * @param {String} filename -- abstact file handle object
 * @param {Transformation} transformation -- the matrix to save
 * @returns {Promise} -- the .then function of the promise has an object with info
 */

let saveTransformation=function(filename,transformation) {
    return transformation.save(filename);
};


/** Parses a Transformation from a JSON String. Returns a transformation
 * @memberof BisTransformationUtil.parseTransformationFromJSON
 * @param {String} filename -- abstact file handle object
 * @returns {Transformation} -- the actual transformation or null
 */

let parseTransformationFromJSON=function(text) {

    var b;
    try {
        b = JSON.parse(text);
    } catch (e) {
        return null;
    }

    let output=null;

    if (b.bisformat==="BisGridTransformation") {
        output = createGridTransformation([4, 4, 4], [2, 2, 2], [0, 0, 0], true);
    } else if (b.bisformat === 'BisComboTransformation') {
        output = createComboTransformation(null);
    } else if (b.bisformat === 'BisLinearTransformation') {
        output = createLinearTransformation(0);
    } else if (b.bisformat === 'BisTransformationCollection') {
        output = new BisWebTransformationCollection();
    }
    
    if (output!==null) {
        output.parseFromDictionary(b);
        return output;
    }

    return null;
};

/** Create a transformation that maps two images based on their NIFTI headers *
 * @param{BisWebImage} reference - the image to reslice to
 * @param{BisWebImage} transform - the image to be resliced
 * @param{Boolean} usetranslation - if the translation component of the header is to be trusted (default=false)
 * @param{Boolean} useztranslation - if the translation component of the header in the z-direction is to be trusted (default=true). Only used if usetranslation===true
 * @returns {BisWebLinearTransformation} - the actual linear transformation
 */

let computeHeaderTransformation=function(reference,target,usetranslation=false,useztranslation=true) {

    let h = [ reference.getHeader(), target.getHeader() ];
    let dm = [ reference.getDimensions(), target.getDimensions() ];
    let sp = [ reference.getSpacing(), target.getSpacing() ];
    let mat = [ null,null];
    
    let names=[ "srow_x", "srow_y", "srow_z" ];
    let maxk=2;
    if (usetranslation)
        maxk=3;

    
    for (let i=0;i<h.length;i++) {
        mat[i]=numeric.identity(4);
        
        let tm=numeric.identity(4);
        
        for (let j=0;j<names.length;j++) {
            let row=h[i].struct[names[j]];
            for (let k=0;k<=maxk;k++)
                tm[j][k]= row[k];
        }

        // Remember we need to map mm in image space to x-y-z
        // NIFTI matrix maps voxels in image space to x-y-z
        // Scale matric to handle mm to voxels
        let s=numeric.identity(4);
        for (let j=0;j<=2;j++) {
            s[j][j]=1.0/sp[i][j];
        }
        
        mat[i]=numeric.dot(tm,s);
        
    }

    let transform=new BisWebLinearTransformation();
    let comb=numeric.dot(numeric.inv(mat[1]),mat[0]);

    if (usetranslation) {
        if (!useztranslation)
            comb[2][3]=0.0;
        transform.setMatrix(comb);
        console.log('oooo Using Header, I created an initial transformation that uses translation = ',transform.getDescription());
        return transform;
    }
        
    // Compute a translation that matches the centers of the images
    let center=[ bisutil.zero(4,1),bisutil.zero(4,1) ];
    for (let i=0;i<=1;i++) {
        for (let j=0;j<=2;j++) { 
            center[i][j]=0.5* (dm[i][j]-1)*sp[i][j];
        }
    }
    let shift=numeric.dot(comb,center[0]);
    let newmat=numeric.identity(4);
    //    console.log('Shift = ',shift);
    for (let i=0;i<=2;i++)
        newmat[i][3]=(center[1][i]-shift[i]);
    
    let finalcombo=numeric.dot(newmat,comb);
    
    transform.setMatrix(finalcombo);
    console.log('oooo Using Header, I created an initial transformation = ',transform.getDescription());
    return transform;
};


/** Combine registration and header transformations -- this is used in linear and manual linear registrations
 * where the orientations are different. The header transform will have been computed using computeHeaderTransformation
 * @param{BisWebLinearTransformation} regtransform - the regular registration transformation
 * @param{BisWebLinearTransformation} headertransform - the header based transformation
 * @returns {BisWebLinearTransformation} - the combined linear transformation
 */

let computeCombinedTransformation=function(regxform,headerxform) {

    let m1=headerxform.getMatrix();
    let m2=regxform.getMatrix();
    let m3=numeric.dot(m1,m2);
    let output=new BisWebLinearTransformation();
    output.setMatrix(m3);
    console.log('oooo Post combining matrix with header adjustment');
    return output;
};

/** Check is transformation is identity or null 
 * if the combinedxform is not null or 0 or if it is identity return true
 * @param{BisWebLinearTransformation} transform - the transformation to test
 * @returns {Boolean} - if identity or null
 */ 
let isTransformIdentityOrNULL=function(xform) {

    if (!xform) {
        console.log('oooo no initial transformation');
        return true;
    }

    try {
        let comb=xform.getMatrix();
        let ident=numeric.identity(4);
        let e=numeric.norm2(numeric.sub(comb,ident));
        if (e<0.01) {
            return true;
        }
    } catch(e) {
        // must not be a matrix
        console.log('oooo not a linear transformation',e,e.stack);
    }

    return false;
};


// Export object
module.exports = {
    createLinearTransformation: createLinearTransformation,
    createGridTransformation: createGridTransformation,
    createComboTransformation: createComboTransformation,
    parseTransformationFromJSON: parseTransformationFromJSON,
    parseTransformationFromText: parseTransformationFromText,
    loadTransformation : loadTransformation,
    saveTransformation : saveTransformation,
    computeHeaderTransformation : computeHeaderTransformation,
    computeCombinedTransformation : computeCombinedTransformation,
    isTransformIdentityOrNULL : isTransformIdentityOrNULL,
};









