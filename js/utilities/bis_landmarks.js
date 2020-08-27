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

/** 
 * @file Browser or Node.js module. Contains {@link LandmarkSet}.
 * @author Xenios Papademetris
 * @version 1.0
 */


"use strict";

const util=require('bis_util');
const UndoStack=require('bis_undostack');

// -------------------------------------------------------------------------
// First Landmark Structure
// -------------------------------------------------------------------------

/** A class for storing and manipulating a set of landmarks (points).
 * This is hidden inside the bis_landmarks module and can only be accessed using
 * a factory function (see examples below). It also creates an internal
 * {@link UndoStack} buffer to track edits.
 * @class LandmarkSet 
 * @param {number} undosize - if > 0 also creates an undo buffer of size undosize. If zero there is no undo functionality.
 * @example
 * // to create a new landmarkset:
 * const LandmarkSet=require('bis_landmarks'); 
 * let newlandmarkset = new LandmarkSet(10); // returns a new LandkSet object
 */
class LandmarkSet {

    constructor(undosize=0) {

        this.points = [];
        this.names  = [];
        this.color  = "#ffff00";
        this.filename = 'PointSet.ljson';
        this.size = 2.0;
        if (undosize>0) {
            this.undostack=new UndoStack(undosize);
            this.noundo=false;
        } else {
            this.undostack=null;
            this.noundo=true;
        }
    }

    /** get number of points
     * @return {number} points - the number of points
     */
    getnumpoints() {
        return this.points.length;
    }
    
    /** resets undo stack to initial state (called by load and other functions)
     */
    resetundo() { 
        if (this.undostack!==null)
            this.undostack.initialize();
    }

    /** adds a point to the set (with name ``Name'')
     * @param {array} mm -- a 3-array containing x,y,z coordinates of new point
     */
    addpoint(mm) {
        this.points.push(mm);
        this.names.push('Point');
        if (!this.noundo) {
            var index=this.points.length-1;
            this.undostack.addOperation( [ 'add',index,mm.slice(0),this.names[index]]);
        }
    }

    /** inserts a point to the landmark set 
     * @param {number} index -- position to insert point at
     * @param {array} mm -- a 3-array containing x,y,z coordinates of new point
     * @param {string} name --  name of landmark (or `Point' if not specified)
     */
    insertpoint(index,mm,name) {
        
        name = name || "Point";
        if (index<0)
            index=this.points.length-1;
        if (index<0)
            return;
        
        this.points.splice(index,0,mm);
        this.names.splice(index,0,name);
        if (!this.noundo) {
            this.undostack.addOperation( [ 'add',index,mm.slice(0),this.names[index]]);
        }
    }
    
    /** move a point to a new position
     * @param {number} index -- index of point to move
     * @param {array} mm -- a 3-array containing the new x,y,z coordinates of new point
     */
    movepoint(index,mm) {
        if (index<0)
            index=this.points.length-1;
        if (index<0)
            return;
        
        var old= this.points[index].slice(0);
        this.points[index]=[ mm[0],mm[1],mm[2]];
        if (!this.noundo) {
            this.undostack.addOperation( [ 'move',index,mm.slice(0),old ]);
        }
    }
    
    /** rename a point in the set
     * @param {number} index -- index of point to rename
     * @param {string} name -- new name of point
     */
    renamepoint(index,name) {
        if (index<0)
            index=this.points.length-1;
        if (index<0)
            return;
        var old=this.names[index];
        this.names[index]=name;
        if (!this.noundo) {
            this.undostack.addOperation( [ 'rename',index,this.names[index],old]);
        }
    }
    
    /** delete a point in the set
     * @param {number} index -- index of point to delete
     */
    deletepoint(index) {
        if (index<0)
            index=this.points.length-1;
        if (index<0)
            return;
        if (!this.noundo) {
            this.undostack.addOperation( [ 'delete',index, this.points[index].slice(0),this.names[index].slice(0) ]);
        }
        
        this.names.splice(index,1);
        this.points.splice(index,1);

    }
    
    /** deletes all points in the set */
    clear() {
        this.points = [];
        this.names = [];
        this.resetundo();
    }
    
    
    /** serializes the landmark set to a json string
     * @return {string} string - containing json formattted values
     */
    serialize()  {
        return JSON.stringify({ 
            bisformat : 'Landmarks',
            points : this.points,
            names  : this.names,
            color  : this.color,
            size   : this.size,
        });
    }
    
    /** serializes the landmark set to a string consistent 
     * with the legacy BioImage Suite .land format
     * @return {string} string - containing output
     */
    legacyserialize() {
        var np=this.getnumpoints();
        
        var outstring="#Landmark Data\n";
        outstring+="#Number of Landmarks Mode\n"+np+" 0\n";
        outstring+="#Origin\n 0.0 0.0 0.0\n";
        outstring+="#Spacing\n 1.0 1.0 1.0\n";
        outstring+="#Landmarks\n";
        for (var i=0;i<np;i++) {
            var p=this.points[i];
            outstring+=util.scaledround(p[0],100)+" "+util.scaledround(p[1],100)+" "+util.scaledround(p[2],100)+"\n";
        }
        return outstring;
    }
    
    /** deserializes the landmark set from a string consistent 
     * with the legacy BioImage Suite .land format
     * @param {string} inpstring - input string
     * @param {string} filename -  filename of original file
     * @param {callback} doerror -  function to call if error 
     * @return {boolean} val - true or false
     */
    legacydeserialize(inpstring,filename,doerror) {

        var cleanstring=function(s) {
            return s.trim().replace(/ +/g,' ');
        };

        
        var lines=inpstring.split("\n");
        if (lines[0].trim() !== "#Landmark Data") {
            doerror(filename+' is not a valid legacy .land file');
            return;
        }



        
        var np=lines[2].split(" ")[0];
        var origin=cleanstring(lines[4]).split(" ");
        var spacing=cleanstring(lines[6]).split(" ");
        for (var k=0;k<=2;k++) {
            origin[k]=parseFloat(origin[k]);
            spacing[k]=parseFloat(spacing[k]);
        }
        
        console.log('np=',np,' origin=',origin,' spa=',spacing);
        this.resetundo();
        this.points=new Array(np);
        this.names=new Array(np);
        for (var pt=0;pt<np;pt++) {
            var x=cleanstring(lines[8+pt]).split(" ");
            var newp = [ 0,0,0 ];
            for (var j=0;j<=2;j++) {
                newp[j]=parseFloat(x[j])*spacing[j]+origin[j];
            }
            this.points[pt] = newp;
            this.names[pt] = 'Pt';
        }

        return true;
    }
    
    /** deserializes the landmark set from a json string
     * @param {string} inpstring - input JSON string
     * @param {string} filename -  filename of original file
     * @param {callback} doerror -  function to call if error 
     * @return {boolean} val - true or false
     */
    deserialize(jsonstring,filename,doerror) {
        
        var ext=filename.split('.').pop();
        
        if (ext=="land") 
            return this.legacydeserialize(jsonstring,filename,doerror);
        
        var b;
        try {
            b=JSON.parse(jsonstring);
        } catch(e) {
            doerror(filename + " is not a valid JSON File --pick something with a .json extension");
            return false;
        }
        
        if (b.bisformat !== 'Landmarks') {
            doerror("Bad JSON File "+filename+" element bisformat does not equal \"Landmarks\"");
            return false;
        }
        this.resetundo();
        this.points=b.points.slice(0);
        this.names=b.names.slice(0);
        this.filename=filename;
        this.color = b.color || this.color;
        this.size = b.size || this.size;
        return true;
    }

    
    /** Perfrom undo operation (if undostack is enabled)
     * @param {boolean} verbose - print diagnostic messages
     */

    undo(verbose) {

        verbose = verbose || false;

        if (this.undostack===null) {
            if (verbose)
                console.log('can not undo');
            return false;
        }
        
        var elem=this.undostack.getUndo();
        if (verbose)
            console.log('undo =',elem);
        if (elem===null)
            return false;

        this.noundo=true;
        var out=true;
        if (elem[0] === 'rename') {
            this.renamepoint(elem[1],elem[3]);
        } else if (elem[0] === 'move' ) {
            this.movepoint(elem[1],elem[3]);
        } else if (elem[0] === 'add' ) {
            this.deletepoint(elem[1]);
        } else if (elem[0] === 'delete' ) {
            this.insertpoint(elem[1],elem[2],elem[3]);
        } else {
            out=false;
        }
        this.noundo=false;
        return out;
    }


    /** Perfrom redo operation (if undostack is enabled)
     * @param {boolean} verbose - print diagnostic messages
     */
    redo(verbose) {

        verbose = verbose || false;

        if (this.undostack===null) {
            if (verbose)
                console.log('can not redo');
            return false;
        }

        var elem=this.undostack.getRedo();
        if (verbose)
            console.log('redo =',elem);

        if (elem===null)
            return false;

        var out=true;
        this.noundo=true;
        if (elem[0] === 'rename') {
            this.renamepoint(elem[1],elem[2]);
        } else if (elem[0] === 'move' ) {
            this.movepoint(elem[1],elem[2]);
        } else if (elem[0] === 'add' ) {
            this.insertpoint(elem[1],elem[2],elem[3]);
        } else if (elem[0] === 'delete' ) {
            this.deletepoint(elem[1]);
        } else {
            out=false;
        }

        this.noundo=false;
        return out;
    }

    /** prints the landmark set using console.log
     */
    print() {
        var a= "";
        for (var i=0;i<this.getnumpoints();i++) {
            a=a+this.names[i]+"("+this.points[i][0]+","+this.points[i][1]+","+this.points[i][2]+")\n";
        }
        console.log('landmark set='+this.getnumpoints()+'\n'+a);
    }

}


// -------------------------------------------------------------------------------------------
// Module architecture
// -------------------------------------------------------------------------------------------

module.exports = LandmarkSet;
