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



// Export object
module.exports = {
    createLinearTransformation: createLinearTransformation,
    createGridTransformation: createGridTransformation,
    createComboTransformation: createComboTransformation,
    parseTransformationFromJSON: parseTransformationFromJSON,
    parseTransformationFromText: parseTransformationFromText,
    loadTransformation : loadTransformation,
    saveTransformation : saveTransformation,

};









