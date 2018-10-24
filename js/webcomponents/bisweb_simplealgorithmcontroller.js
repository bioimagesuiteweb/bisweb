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

/* global document,HTMLElement */

/**
 * @file A Broswer module. Contains an element which manages the interaction between algorithm modules and the main viewer/main application
 * @author Xenios Papademetris
 * @version 1.0
 */


"use strict";

const BisWebLinearTransform = require('bisweb_lineartransformation.js');
const undoStack = require('bis_undostack');
const webutil = require('bis_webutil');
const transformationutil=require('bis_transformationutil');

/**
 * A class to manage algorithms
 *
 * @example
 *
 * <bisweb-algorithmmanager
 *     bis-viewerid1="#viewer"
 *     bis-viewerid2="#viewer"
 * >
 * </bisweb-algorithmmanager>
 *
 * Attributes:
 *      bis-viewerid : the first viewer to draw in 
 *      bis-viewerid2 : the second viewer to draw in 
 */
class SimpleAlgorithmControllerElement extends HTMLElement {

    constructor() {
        super();
        this.viewers = {
            viewer1 : null,
            viewer2 : null
        };
        this.undoImageStack = new undoStack(5, 1); // five images back ...and one offset
        this.blockUpdates = false;
        this.currentTransform=null;
        this.currentTransformController = null;
        this.currentMatrixController=null;
        this.identityTransform = new BisWebLinearTransform();
    }

    connectedCallback() {

        const self=this;
        
        webutil.runAfterAllLoaded( () => { 
            
            self.attachViewers();

            self.currentMatrixController= document.querySelector(this.getAttribute('bis-matrixelementid')) || null;
            self.currentTransformController = document.querySelector(this.getAttribute('bis-transformelementid')) || null;
            
            if (self.currentTransformController===null) {
                document.addEventListener('loadTransform', self.handleLoadTransformEvent.bind(self));
            }
        });
    }

    /** Find and attach matrixController and transformController */
    
    /** Find viewers and store them in this.viewers */
    attachViewers() {
        const viewerid = this.getAttribute('bis-viewerid');
        this.viewers['viewer1']= document.querySelector(viewerid) || null;
        if (this.viewers['viewer1'])
            this.viewers['viewer1'].setName('viewer1');

        const viewerid2 = this.getAttribute('bis-viewerid2');
        this.viewers['viewer2']=document.querySelector(viewerid2) || null;
        if (this.viewers['viewer2'])
            this.viewers['viewer2'].setName('viewer2');

    }


    /** Get the Current Image
     * @param{String} viewer - the name of the viewer "viewer" or "viewer2"
     * @param{String} itype - the type of the image "image" or "overlay" 
     * @returns{BisWebImage} - the image 
     */
    getImage(viewer,itype) {

        if (viewer.indexOf('2')>=0 && this.viewers['viewer2']!==null)
            viewer='viewer2';
        else
            viewer='viewer1';
        
        if (this.viewers[viewer]) {
            if (itype === "overlay")
                return this.viewers[viewer].getobjectmap();
            return this.viewers[viewer].getimage();
        }
        
        console.log('Error: attempting to get an image from nonexistent viewer',viewer,' with key', itype);
        return null;
    }

    /** get the Current Transformation 
     * @returns {BisWebBaseTransformation} - the current transformation
     */
    /** returns input imag
     * @param{string} key  -- the transformation to get 
     */
    getTransform(key) {

        let obj=null;

        if (key === "last" || key === "current") {
            if (this.currentTransformController) {
                obj=this.currentTransformController.getCurrentObject();
            } else {
                if (this.currentTransform) {
                    if (this.currentTransform.data) {
                        obj=this.currentTransform.data;
                    }
                }
            }
        }
        if (obj===null) {
//            console.log('returning identity');
            return this.identityTransform;
        }

        return obj;
    }

    
    /** get the current cross hairs of the viewer
     * @param{String} key - either viewer or viewer2
     */
    getViewerCrossHairs(key) {
        if (this.viewers[key]) 
            return this.viewers[key].getViewerCrossHairs();
        return null;
    }

    /** adds an image to the undo stack 
     * @param {BisWebImage} input -- An image to put on the undo stack
     * @param {Object} options - dictionary of options
     * @param {Boolean} - if false operation failed.
     */
    pushImageToUndoStack(input, options = {}) {
        
        if (!input)
            return false;

        let sz=input.getMemorySize();
        //console.log('input=',input.getFilename(),sz);

        if (sz< (50*1024*1024)) {
            
            let op = {
                'image': input,
                'options' : options
            };
            
            // Undo stack takes arrays!
            this.undoImageStack.addOperation([op]);
        } else {
            webutil.createAlert('Not adding image: '+input.getFilename() +' to undo stack. It is too large.',true);
        }
        return true;
    }

    /** sendImageToViewer
     * @param{BisWebImage} image
     * @param{Object} options
     */
    sendImageToViewer(image,options={}) {

        let type = options.viewersource || 'image';
        let key = options.viewername || 'viewer1';
        let ctype = options.colortype || 'Auto';
        let plainmode = (ctype === "Objectmap");
        this.blockUpdates = true;
        
        if (type === 'overlay') {
            this.viewers[key].setobjectmap(image, plainmode, ctype);
        }  else {
            this.viewers[key].setimage(image);
        }
        this.blockUpdates = false;
        return true;
    }


    /** Performs undo operations and sets the new image on the viewer 
     * @param{Boolean} undo - if true then do undo else do redo
     */
    undoImage(undo=true) {

        let undoMessage=() => {
            let op='undo';
            if (!undo)
                op='redo';
            
            webutil.createAlert('Can not do '+op+' no prior data available',true);
            return false;
        };
        
        let undoelement;
        if (undo == false)
            undoelement = this.undoImageStack.getRedo() || null;
        else
            undoelement = this.undoImageStack.getUndo() || null;

        if (!undoelement) {
            return undoMessage();
        }
        
        undoelement = undoelement[0]; // it is an array internally
        if (!undoelement) {
            return undoMessage();

        }

        let image=undoelement.image;
        if (image === null)
            return;

        this.sendImageToViewer(image,undoelement.options);
        return true;
    }


    /**
     * handleImageUpdate
     * @param{BisWebImage} inpobj - the image
     * @param{Object} options - the options
     */
    handleImageUpdate(inpobj,options) {

        let viewersource = options.viewersource || 'image';
        let viewername = options.viewername || 'image';

        let oldimage=null;
        if (viewersource === 'overlay') {
            oldimage=this.viewers[viewername].getobjectmap();
        } else {
            oldimage=this.viewers[viewername].getimage();
        }
        
        if (oldimage) 
            this.pushImageToUndoStack(oldimage, {
                'viewername': viewername,
                'viewersource': viewersource,
                'colortype': this.viewers[viewername].getcolortype()
            });
        this.sendImageToViewer(inpobj,options);
        return true;
    }

    /**
     * @param{BisWebBaseTransformation} inpobj - the transformation
     * @param{Object} options - the data options
     */
    handleTransformUpdate(inpobj,options={}) {
        
        if (!this.currentTransformController) {
            this.currentTransform = {
                'data' : inpobj,
                'metadata' : options.inputinfo ? options.inputinfo : undefined
            };
            return true;
        }

        this.currentTransformController.addItem(inpobj);
    }

    /**
     * Takes data and updates the appropriate viewer. 
     * @param {BisWebDataObject} inpobj -- Data to place on a viewer appropriate to its data type. Note that this is not a dictionary entry but raw data.
     * @param {Object} options - dictionary of options
     * @param {String} options.viewername - Name of viewer ('image' or 'image2')
     * @param {String} options.viewersource - Image in viewer ('image' or 'overlay')
     * @param {String} options.colortype - Image in viewer ('Objectmap', "Overlay", "Overlay2" , "Red", "Green", "Blue","Gray","Orange")
     * @returns {Promise} 
     */
    handleUpdate(inpobj, options = {
        'viewername': 'image',
        'viewersource': 'image',
        'colortype': 'Auto',
    }) {

        return new Promise( (resolve,reject) => {

            if (!inpobj || this.blockUpdates===true)
                reject('either null input, blockUpdates=true');
            
            let objtype=inpobj.getObjectType();

            if (objtype === 'image') 
                this.handleImageUpdate(inpobj,options);
            else if (objtype === 'transform') 
                this.handleTransformUpdate(inpobj,options);
            
            resolve('Added object');
        });
    }

    
    /**
     * Handler function for the 'loadTransform' event dispatched by the 'Load Transform' button in bisweb_mainviewerapplication. 
     * Loads a transform from disk and uploads it to the database. 
     */
    handleLoadTransformEvent() {
        //body of parent element used to display the alert created by webutil.createAlert
        const self=this;
        webutil.createhiddeninputfile('.matr, .grd', (f) => {
            transformationutil.loadTransformation(f).then( (obj) => {
                self.currentTransform = {
                    data : obj.data
                };
                webutil.createAlert(`Created transform ${obj.filename} and updated current transform`, false);
            });
        }, false).click();
    }


    /** create menu items  
     * @param{menu} menu - the menu item
     */
    createMenuItems(menu) {

        webutil.createMenuItem(menu, 'Undo', () => {
            this.undoImage();
        });
        
        webutil.createMenuItem(menu, 'Redo', () => {
            this.undoImage(false);
        });

    }

    
    getViewers() {
        return this.viewers;
    }

    getTransformController() {
        return this.currentTransformController;
    }

    getMatrixController() {
        return this.currentMatrixController;
    }
    

}

webutil.defineElement('bisweb-simplealgorithmcontrollerelement', SimpleAlgorithmControllerElement);
module.exports=SimpleAlgorithmControllerElement;

