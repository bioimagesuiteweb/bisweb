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
 * @file A Broswer and Node.js module. Contains {@link UndoStack}.
 * @author Xenios Papademetris
 * @version 1.0
 */


const util=require('bis_util');
const MAXSIZE = 100;

// ------------------------------------------------------------------
// Main object
// ------------------------------------------------------------------

/** 
 * A class for managing an undostack. Do not call directly use instead the 
 * the a factory function (see examples below).
 * @constructs UndoStack
 * @param {number} in_size  - size of stack
 * @param {number} in_shift - amount to shift by (default == 1) when stack is full
 * @param {number} offset - if 1 then the last element is placed there for future undo, else last element is last element. This is needed for image stuff. (0=default)
 * @example
 * // to create a new undostack:
 * const UndoStack=require('bis_undostack'); 
 * let newundostack = new UndoStack(50,5); // returns a new UndoStack 
 */
class UndoStack {

    constructor(in_size=MAXSIZE,in_shift=1,offset=0) {

        if (offset!==1)
            offset=0;
        
        this.internal = {
            size : in_size,
            shift : in_shift,
            max_index : -1,
            undo_index : -1,
            redo_index : -1,
            doing_undo : false,
            doing_redo : false,
            offset : offset,
        };

        this.initialize();
    }

    initialize(num,shift) {
        this.resetundoredoflags();
        this.internal.size = util.range( num || this.internal.size , 10,2*MAXSIZE);
        var a=Math.round(this.internal.size/3);
        this.internal.shift = util.range(shift || this.internal.shift,1,a);
        
        // index current position on stack -1 means empty
        this.internal.index=-1;
        // max valid position on stack (rest is unused or corrupt post new add)
        this.internal.max_index=-1;
        
        // Create stack array of empty arrays
        this.internal.elements=new Array(this.internal.size);
        for (var i=0;i<this.internal.size;i++)
            this.internal.elements[i]=[];
    }

    resetundoredoflags() {
        this.internal.undo_index=-1;
        this.internal.redo_index=-1;
        this.internal.doing_undo=false;
        this.internal.doing_redo=false;
    }
    
    /** 
     * Add a new operation arr must be array or string
     * basically anything on which slice(0) will create a copy
     * @param {array} - arr - something to push on stack. (String is probably OK also)
     */
    addOperation(arr) {

        if (arr===null) 
            throw('bad item to stack :null');
        
        if (typeof arr.slice !== "function")
            throw('bad item to stack :'+arr+' not a string or an array');
        
        if (this.internal.index==this.internal.size-1)
            this.shuffle();
        
        this.resetundoredoflags();
        this.internal.index+=1;
        this.internal.max_index=this.internal.index;
        this.internal.elements[this.internal.index]=arr.slice(0);
    }
    
    
    /** 
     * This is where the get the last change to undo.
     */
    getUndo() {
        
        this.internal.doing_redo=false;
        
        if (this.internal.doing_undo===false)  {
            if (this.internal.index>=this.internal.offset) {
                this.internal.undo_index=this.internal.index-this.internal.offset;
                this.internal.doing_undo=true;
                return this.internal.elements[this.internal.undo_index];
            }
            return null;
        }
        
        if (this.internal.undo_index>0) {
            this.internal.undo_index-=1;
            this.internal.index=this.internal.undo_index;
            return this.internal.elements[this.internal.undo_index];
        }

        return null;
    }
    

    /** 
     * This is where the get the last change to redo. Only valid
     * if previous operation was undo (or redo)
     */
    getRedo() {
        
        if (this.internal.doing_redo===false)  {
            
            if (this.internal.doing_undo===false) 
                return null;
            
            this.internal.doing_undo=false;
            if (this.internal.index>=0 && this.internal.index<(this.internal.size-this.internal.offset)) {
                this.internal.redo_index=this.internal.index+this.internal.offset;
                this.internal.doing_redo=true;
                return this.internal.elements[this.internal.redo_index];
            }
            this.internal.doing_redo=false;
            return null;
        }
        
        // From Here on Currently Doing_redo = 1
        this.internal.doing_undo=false;
        this.internal.redo_index+=1;
        if (this.internal.redo_index<= this.internal.max_index) {
            this.internal.index=this.internal.redo_index;
            return this.internal.elements[this.internal.redo_index];
        }

        return null;
    }
    
    /** 
     * This is called when stack if full (called automatically)
     */
    shuffle() {
        
        var shift=this.internal.shift;
        
        for (var ia=shift;ia<this.internal.size;ia++) 
            this.internal.elements[ia-shift]=this.internal.elements[ia];
        
        for (var ib=1;ib<=shift;ib++) 
            this.internal.elements[this.internal.size-ib]=[];
        
        this.internal.index-=shift;
        if (this.internal.undo_index>=shift)
            this.internal.undo_index-=shift;
        else
            this.internal.undo_index=-1;
        
        this.internal.redo_index=-1;
        if (this.internal.redo_index>=shift)
            this.internal.redo_index-=shift;
        else
            this.internal.redo_index=-1;
        
        this.internal.max_index-=shift;
        this.internal.doing_undo=false;
        this.internal.doing_redo=false;
    }
    
    // -------------------------
    // Needed for testing mostly
    // -------------------------
    /** 
     * This is to get a copy of the current element at index = index
     * Used for testing
     */
    
    getCopyOfElement(index) {
        return this.internal.elements[index].slice(0);
    }

    /** 
     * This is to get a copy of the current element as a sstring
     * Used for testing
     */
    getElementsAsString() {
        return this.internal.elements.join();
    }
}


module.exports = UndoStack;


