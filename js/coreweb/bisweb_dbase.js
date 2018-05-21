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
 * @file A Broswer and Node.js module. Contains {@link DBase}. This is a wrapper around localforage {@link https://github.com/localForage/localForage}.
 * @author Xenios Papademetris
 * @version 1.0
 */

const localforage=require('localforage');

localforage.config({
    driver : localforage.INDEXEDDB,
    name : "BioImageSuiteWeb",
    version : 1.0,
    storeName : "bispreferences",
    description : "BioImageSuite Web preferences",
});

let getItem = function(key) {
    return localforage.getItem(key);
};

let setItem = function(key,value) {
    return localforage.setItem(key,value);
};


let removeItem = function(key) {
    return localforage.removeItem(key);
};

let clearAll = function() {
    return localforage.clear();
};

let getAllKeys = function() {
    return localforage.keys();
};


let setItems = function(obj) {
    
    let keys=Object.keys(obj);
    let p = [ ];
    for (let i=0;i<keys.length;i++) {
        p.push(setItem(keys[i],obj[keys[i]]));
    }
    return Promise.all(p);
};

let getItems = function(arr) {

    let p=[];
    for (let i=0;i<arr.length;i++) {
        p.push(getItem(arr[i]));
    }

    let obj=[];
    
    return new Promise( (resolve,reject) => {
        Promise.all(p).then( (results) => {
            for (let i=0;i<arr.length;i++) {
                obj[arr[i]]=results[i];
            }
            resolve(obj);
        }).catch((e)=> { reject(e); });
    });
};


let printAllKeys = function() {
    getAllKeys().then( (obj) => {
        let k=Object.keys(obj);
        for (let i=0;i<k.length;i++)
            console.log('++++ DBase['+k[i]+']='+obj[k[i]]);
        console.log('\n');
    }).catch( (e) => { console.log(e); });
};


const dbase = {
    setItem : setItem,
    getItem : getItem,
    getItems : getItems,
    setItems : setItems,
    removeItem : removeItem,
    clearAll : clearAll,
    getAllKeys : getAllKeys,
    printAllKeys :      printAllKeys
};

module.exports = dbase;


