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
const genericio = require('bis_genericio');

/**
 * biswebUserPreferences namespace. Utility code to read/write user preferences
 * @namespace biswebUserPreferences
 */

/** 
 * The last good pointer to the web database
 * @alias biswebUserPreferences.dbasepointer
 */
let dbasepointer=null;
let count=0;
/** 
 * The internal user preferences Object
 * @alias biswebUserPreferences.userPreferences
 */

const userPreferences = {
    orientationOnLoad : 'None',
    snapshotscale : 2,
    snapshotdowhite : true,
    filesource : 'local',
    showwelcome : true,
    favoriteFolders : [],
    internal : false,
    enables3 : false,
};

const expobj = {
    loadedPromise : null
};


// ------------------------------------------------------------------------------------------
// Internal Functions

/** 
 * @alias biswebUserPreferences.getDefaultFileName
 * @returns {String} -  Returns HOMEDIR/.bisweb if on node or null if in browser 
 */
let getDefaultFileName=function() {
    
    if (genericio.getmode() === 'browser') 
        return null;

    
    const os = genericio.getosmodule();
    const path = genericio.getpathmodule();
    let homedir=os.homedir();
    return path.join(homedir,'.bisweb');
};


/** 
 * Parses the user preferences from a JSON string
 * @alias biswebUserPreferences.parseUserPreferences
 * @param {String} dat - the json string to parse from
 * @returns {Boolean} - true if successful
 */
let parseUserPreferences=function(obj) {

    Object.keys(obj).forEach((key) => {
        if (obj[key]!== undefined)
            userPreferences[key]=obj[key];
    });

    // Make sure this is sane

    if (!userPreferences['orientationOnLoad'])
        userPreferences['orientationOnLoad']='None';
    else
        expobj.setImageOrientationOnLoad(userPreferences['orientationOnLoad'],'None');


    if (userPreferences['showwelcome']!==false)
        userPreferences['showwelcome']=true;
    
    return true;
};

/** 
 * Loads the user preferences from a file object or ${HOME}/.bisweb
 * @alias biswebUserPreferences.load
 * @param {String} filename - the current filename or ${HOME}/.bisweb
 * @returns {String} - filename that these were read from or null
 */
let nodeLoadUserPreferences=function(fname=null) {

    if (genericio.getmode() === 'browser')  {
        return null;
    }

    if (fname===null)
        fname=getDefaultFileName();
    
    const fs = genericio.getfsmodule();
    let d1 = "";
    try {
        d1=fs.readFileSync(fname, 'utf-8');
    } catch(e) {
        return null;
    }

    let p=null;
    try {
        p=JSON.parse(d1);
    } catch(e) {
        return null;
    }

    if (p.bisformat !==  "BisWebUserPreferences") {
        console.log('---- Bad JSON Magic Code (bisformat) in ',fname);
        return null;
    }

    delete p.bisformat;
    
    if (parseUserPreferences(p))
        return fname;
    return null;
};



/**
 * Loads the user preferences from the web browses datatabse
 * @param{Object} dbase -- a hande to bisweb_preferencedbase
 * @returns {Promise} - resolved if all is well
 */

let webLoadUserPreferences=function(dbase=null) {


    if (genericio.getenvironment()==='electron') {
        if (nodeLoadUserPreferences(null))
            return Promise.resolve();
        return Promise.reject();
    }

    dbase = dbase  || dbasepointer;
    let keys=Object.keys(userPreferences);

    return new Promise( (resolve,reject) => {
        dbase.getItems(keys).then( (obj) => {
            if (parseUserPreferences(obj)) {
                dbasepointer=dbase;
                resolve();
            }
        }).catch( (e) => { reject(e); });
    });
};

// Internal Functions
// ------------------------------------------------------------------------------------------

/** 
 * Given a string returns one of 'RAS', 'LPS' or 'None'
 * true maps to RAS, all else to 'None'
 * @alias biswebUserPreferences.santizeOrientationOnLoad
 * @param {String} name - the input orientation name
 * @returns {String} - the output orientation name
 */

expobj.sanitizeOrientationOnLoad=function(name) {

    if (name==='Auto')
        return userPreferences['orientationOnLoad'];
    
    if (['RAS','LPS','LAS', 'None'].indexOf(name)>=0)
        return name;

    if (name === undefined || name === null)
        return userPreferences['orientationOnLoad'];
    
    if (name===true)
        return 'RAS';
    
    return "None";
};


/** 
 * Sets the orientation to a given name. Calls sanitizeOrientationOnLoad to clean this up first
 * @alias biswebUserPreferences.setImageOrientationOnLoad
 * @param {String} name - the input orientation name
 * @param {String} comment - an optional string for console.log logging output
 */
expobj.setImageOrientationOnLoad=function(name='',comment='') {

    userPreferences['orientationOnLoad']=expobj.sanitizeOrientationOnLoad(name);
    count=count+1;
    if (comment!==null && count===1)
        console.log('+++++ Setting forcing orientationOnLoad to: '+userPreferences['orientationOnLoad']+' (from '+name+'), '+comment);
};

/** 
 * Returns the  ImageOrientationOnLoad setting
 * @alias biswebUserPreferences.getImageOrientationOnLoad
 * @returns {String} - the current force orientation on load
 */
expobj.getImageOrientationOnLoad=function() {
    return userPreferences['orientationOnLoad'];
};

/** getImageOrientationOnLoad but ensures loadedPromise is fuilfilled
 * Returns the  ImageOrientationOnLoad setting
 * @alias biswebUserPreferences.safeGetImageOrientationOnLoad
 * @returns {Promise} - whose payload the current force orientation on load
 */
expobj.safeGetImageOrientationOnLoad=function() {
    return new Promise( (resolve,reject) => {
        expobj.loadedPromise.then( () => {
            let or=expobj.getImageOrientationOnLoad();
            resolve(or);
        }).catch( (e) => {
            reject(e);
        });
    });
};



/** 
 * Saves the user preferences from a file object or ${HOME}/.bisweb
 * @alias biswebUserPreferences.save
 * @param {String} filename - the current filename or ${HOME}/.bisweb
 * @returns {Promise} - if successful
 */
expobj.saveUserPreferences=function(fname=null) {
    
    if (fname === null) 
        fname=getDefaultFileName();
    userPreferences['bisformat']="BisWebUserPreferences";
    let opt=JSON.stringify(userPreferences,null,2);
    delete userPreferences.bisformat;
    const fs = genericio.getfsmodule();

    try {
        console.log('Saving user preferences in ',fname);
        fs.writeFileSync(fname,opt);
    } catch(e) {
        console.log('Error=',e);
        return;
    }
    return true;
};

expobj.printUserPreferences=function() {
    console.log(JSON.stringify(userPreferences,null,2));
};

/**
 * Stores the user preferences to the web browses datatabse
 * @param{Object} dbase -- a hande to bisweb_preferencedbase or null to use last good pointer (from webLoad)
 * @returns {Promise} - resolved if all is well
 */

expobj.storeUserPreferences=function(dbase) {

    if (genericio.getenvironment()!=='browser') {
        if (expobj.saveUserPreferences())
            return Promise.resolve();
        return Promise.reject();
    }

    dbase = dbase  || dbasepointer;
    return new Promise( (resolve,reject) => {
        console.log('Storing',JSON.stringify(userPreferences,null,2));
        
        dbase.setItems(userPreferences).then( () => {
            resolve();
        }).catch( (e) => { reject(e);});
    });
};

/** 
 * Returns the entire user preferences object
 * @alias biswebUserPreferences.getItem
 * @param {String} item  the current item key
 * @returns {String} - the value of the key
 */
expobj.getItem=function(item) {
    let a=userPreferences[item];
    if (a===undefined)
        return null;
    return a;
};

/** getItem but ensures loadedPromise is fuilfilled
 * @alias biswebUserPreferences.safeGetItem
 * @param {String} item  the current item key
 * @returns {Promise} - whose payload is the value of the key
 */

expobj.safeGetItem=function(item) {

    return new Promise( (resolve,reject) => {
        expobj.loadedPromise.then( () => {
            resolve(expobj.getItem(item));
        }).catch( (e) => {
            reject(e);
        });
    });
};


// -------------------------------------------------------    

/** 
 * Returns the entire user preferences object
 * @alias biswebUserPreferences.setItem
 * @returns {String} key - the current key
 * @returns {String} value - the current value
 */
expobj.setItem=function(key,value,save=false) {
    if (key==="orientationOnLoad")
        this.setImageOrientationOnLoad(value);
    else
        userPreferences[key]=value;

    
    if (save) {
        if (genericio.getmode() === 'browser')  {
            expobj.storeUserPreferences();
        } else {
            expobj.saveUserPreferences();
        }
    }
};


// ----------------------------
// Export Functions
// ----------------------------

/*    expobj.getItem=getItem;
    setItem : setItem,
    //
    storeUserPreferences :  storeUserPreferences,
    saveUserPreferences : saveUserPreferences,
    //
    printUserPreferences : printUserPreferences,
    //
    sanitizeOrientationOnLoad : sanitizeOrientationOnLoad,
    setImageOrientationOnLoad : setImageOrientationOnLoad ,
    getImageOrientationOnLoad : getImageOrientationOnLoad,
    //
*/


// -------------------------------- On Load if not in browser -----------------------
// Load ${HOME}/.bisweb
// ------------------------------------------------------------------------------

let initializeCommandLine=function() {

    if (expobj.loadedPromise!==null)
        return;
    
    console.log(',,,,');
    let fname=nodeLoadUserPreferences();
    if (fname!==null) {
        console.log(",,,, bisweb commandline user preferences loaded from "+fname);
        console.log(',,,, ',JSON.stringify(userPreferences));
        console.log(',,,,');
    } else {
        console.log(',,,, Failed to read user preferences from default location');
        expobj.setImageOrientationOnLoad(userPreferences['orientationOnLoad'],null);
        fname=getDefaultFileName();
        if (expobj.saveUserPreferences(fname))
            console.log(',,,, \t created and saved user preferences in ',fname);
        console.log(',,,,');
    }
    // Resolve the promise for later
    expobj.loadedPromise=Promise.resolve();
};    




// -------------------------------------------------
// initialize function

expobj.initialize=function(dbase) {

    if (expobj.loadedPromise!==null) {
        console.log('+++++ \t user preferences already initialized (or in process of being initialized)');
        return expobj.loadedPromise;
    }
    
    if (genericio.getmode() === 'browser')  {
        expobj.loadedPromise=webLoadUserPreferences(dbase);
        expobj.loadedPromise.then(() => {
            expobj.storeUserPreferences(dbase);
        });
    } else {
        initializeCommandLine();
    }
    return expobj.loadedPromise;
};

// -------------------------- auto execute code -----------------------------
// If one command line, initialize automatically
if (genericio.getmode() !== 'browser')  {
    initializeCommandLine();
} else {
    try {
        // Web worker gives an error
        Window.biswebpref=expobj;
    } catch (e) {
        console.log("++++ In web worker, no export");
    }
}



module.exports=expobj;
