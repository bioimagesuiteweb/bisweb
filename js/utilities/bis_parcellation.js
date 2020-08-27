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
 * @file Browser or Node.js module. Contains {@link Parcellation}.
 * @author Xenios Papademetris
 * @version 1.0
 */


"use strict";

const util=require('bis_util');
let webutil=null;
try {
    webutil=require('bis_webutil');
} catch(e) {
    console.log('.... running in commandline probably a regression test as I can not load bis_webutil.');
}

const DEBUG=false;

const computemode=function(array,debug) {
    debug= debug || false;
    if(array.length === 0)
        return null;
    var modeMap = {};
    var maxEl = array[0], maxCount = 1;
    for(var i = 0; i < array.length; i++) {
        var el = array[i];
        if(modeMap[el] === undefined)
            modeMap[el] = 1;
        else
            modeMap[el]++;      
        if(modeMap[el] > maxCount)
        {
            maxEl = el;
            maxCount = modeMap[el];
        }
    }
    if (debug)
        console.log(modeMap);
    return maxEl;
};

/** Compares two rois and returns -1,0,1 depending on their order.
    This is used to order the nodes of a parcellation
    @returns {number} -1,0,1
*/
const comparerois=function(a,b) {

    let computeroivalue=function(r) {

        let v=r.attr.length;
        if (v>4)
            v=4;
        
        let sum=r.index*0.001; // Add a small bias to existing order
        for (let i=0;i<v;i++)
            sum+=r.attr[i]*Math.pow(1000,(v-i));
        return sum;
    };


    
    var a1=computeroivalue(a);
    var b1=computeroivalue(b);
    if (a1<b1)
        return -1;
    else if (a1>b1)
        return 1;
    return 0;
};


// -------------------------------------------------------------------------
// First Parcellation Structure
// -------------------------------------------------------------------------

/** A class for storing and manipulating a parcellation.
 * @class BisParcellation 
 */


class BisParcellation {

    constructor(atlasspec = { }) {
        this.initialized=false;
        this.regions=null;
        
        this.normallength=70.0;
        this.linethickness=1;   
        
        this.scalefactor=1.0;
        this.radius=1.0;
        this.offset=80.0;
        this.thickness=20.0;
        
        this.points = [];
        this.atlasspec = {
            'name' : atlasspec.name || 'humanmni',
            'midlobe' : atlasspec.midlobe || 11,
            'origin'  : atlasspec.origin || [ 90, 126, 72 ],
        };
        
        this.maxlobe=-1;
        this.midpoint=-1;
        this.maxpoint=-1;
        this.actualnoderadius=1.0;
        this.viewport = { x0:0.0, y0:0.0, x1:0.99, y1:0.71 };
        
        // Region is object (x,y,z,attr,index,cx,cy,nx,ny)
        this.rois = [];
        this.lobeStats = [ ];
        this.indexmap = { }; // Maps old nodes to new nodes
        this.description = "";
        this.box=[0,0,100,100];
    }
    

    /** Returns the bounds for the canvas (context) and the with and the height as an array
     * in voxels.
     * @param {CanvasContext2D} context - context of canvas
     * @returns {array} [x0,y0,x1,y1,width,height ];
     */
    getCanvasBounds(context) {


        var ch=context.canvas.height;
        var cw=context.canvas.width;
        var width  = Math.floor((this.viewport.x1-this.viewport.x0)*cw);
        var height = Math.floor((this.viewport.y1-this.viewport.y0)*ch);
        
        var cnv={ width : width};
        var fnsize=webutil.getfontsize(cnv);

        var internal = {
            radius : 150.0,
            offset : 50.0,
            thickness : 20.0,
            paddingx : 130.0,
            paddingy :    3*fnsize,
            paddingybot : 3*fnsize, 
        };

        
        var maxw=2*(internal.radius+2.5*internal.thickness+internal.paddingx)+internal.offset;
        var maxh=2*(internal.radius+2.5*internal.thickness);
        var padh=internal.paddingy+internal.paddingybot;
        //console.log('Maxs='+[maxw,maxh,padh]+' actual='+[ ch,cw]);
        
        if (height<padh) {
            this.box[0]=0;
            this.box[1]=0;
            this.box[2]=0;
            this.box[3]=0;
            console.log('height is too small');
            return [0,0,0,0,0,0];
        }
        
        var sx=(width/maxw);
        var sy=((height-padh)/maxh);

        var scalefactor=sy;
        var leftoverx=0.0,leftovery=0.0;
        if (sx<sy) {
            scalefactor=sx;
            leftovery=((height-padh)/scalefactor-maxh)*scalefactor;
        } else {
            scalefactor=sy;
            leftoverx=(width/scalefactor-maxw)*scalefactor;
        }

        this.radius=  scalefactor*internal.radius;
        
        var paddingx=scalefactor*internal.paddingx+0.5*leftoverx;
        var paddingy=internal.paddingy+0.5*leftovery;
        
        this.thickness=scalefactor*internal.thickness;
        this.offset=scalefactor*internal.offset;
        this.scalefactor=scalefactor;

        this.box[0] = this.viewport.x0*cw+paddingx;
        this.box[1] = this.viewport.y0*ch+paddingy;
        this.box[2] = this.box[0]+(2.0*this.radius+this.offset+5.0*this.thickness);
        this.box[3] = this.box[1]+(2.0*this.radius+5.0*this.thickness);

        return [  cw*this.viewport.x0,
                  ch*this.viewport.y0,
                  cw*(this.viewport.x1-this.viewport.x0),
                  ch*(this.viewport.y1-this.viewport.y0) ];
    }

    /** Parse json  from text string -- this is called by loadrois if the filename has a .json
     * extension.
     * @param {string} inpstring - json input string
     * @param {string} filename -  filename of original file
     * @param {callback} doerror -  function to call if error 
     * @return {number} rois - the number of rois in parcellation
     */
    parsejson(jsonstring,filename,doerror) {
        var obj;
        try {
            obj=JSON.parse(jsonstring);
        } catch(e) {
            doerror(filename + " is not a valid JSON File --pick something with a .json extension");
            return 0;
        }

        if (obj.bisformat !== 'Parcellation') {
            doerror("Bad JSON File "+filename+" element bisformat does not equal \"Parcellation\"");
            return false;
        }
        
        var numpoints=obj.numpoints;
        var numattr=obj.numattr;
        this.description=obj.description;
        if (DEBUG) console.log('++++ Parcellation created from jsonfile:'+filename+', points='+numpoints+' attr='+numattr+' description='+this.description);

        this.rois= new Array(numpoints);
        var i,j;
        for (i=0;i<numpoints;i++) {
            var elem=obj.rois[i];
            var index=i;
            var attr=[];
            for (j=0;j<numattr;j++)
                attr[j]=elem.attr[j];
            this.rois[i] = {
                x : elem.x,
                y : elem.y,
                z : elem.z,
                index : Number(index),
                attr : attr,
                cx : 0.0,
                cy : 0.0,
                nx : 0.0,
                ny : 1.0,
                angle : 0.0,
            };
        }

        return numpoints;
    }
    /** Parse text string to create rois
     * @param {string} inpstring - input string
     * @param {string} filename -  filename of original file
     * @param {callback} doerror -  function to call if error 
     * @return {number} rois - the number of rois in parcellation
     */
    parsetext(inpstring,filename,doerror) {
        
        var lines=inpstring.split("\n");
        if (lines[0].trim() !== "#MapFile" ) {
            doerror(filename+' is not a valid node definition file');
            return 0;
        }
        
        var numpoints=parseInt(lines[1].trim().split(" ")[0]);
        var numattr=parseInt(lines[2].trim().split(" ")[0]);
        var n=lines.length;
        if ( (n-numpoints)<4) {
            doerror(filename+ ' file is too short');
            return 0;
        }
        
        this.rois= new Array(numpoints);
        var i,j;
        for (i=0;i<numpoints;i++) {
            
            var l2=lines[i+4].split(" ");
            var index=i;
            var attr=[];
            for (j=0;j<numattr;j++)
                attr[j]=Number(l2[3+j]);
            this.rois[i] = {
                x : Number(l2[0]),
                y : Number(l2[1]),
                z : Number(l2[2]),
                index : Number(index),
                attr : attr,
                cx : 0.0,
                cy : 0.0,
                nx : 0.0,
                ny : 1.0,
                angle : 0.0
            };
        }
        
        var testline=5+numpoints;
        if (testline<n)
            this.description=lines[testline];
        else
            this.description="unknown";

        if (DEBUG) console.log('++++ Node definition created from textfile:'+filename+', points='+numpoints+' attr='+numattr+' description='+this.description);
        return numpoints;
    }
    
    /** Load rois from either text string or json string and 
     * creates lobe statistics
     * @param {string} inpstring - json input string
     * @param {string} filename -  filename of original file
     * @param {callback} doerror -  function to call if error 
     * @return {number} rois - the number of rois in parcellation
     */
    loadrois(jsonstring,filename,doerror) {
        
        var ext=filename.split('.').pop();
        var numpoints=0;
        if (ext=="txt") 
            numpoints=this.parsetext(jsonstring,filename,doerror);
        else
            numpoints=this.parsejson(jsonstring,filename,doerror);
        if (numpoints===0)
            return 0;

        this.createLobeStats();
        return numpoints;
    }
    
    /** Create Lobe Statistics
     */
    createLobeStats() {
        
        if (this.rois.length<2){
            console.log('--- bad rois cannot createLobeStats');
            return 0;
        }

        //console.log('Midlobe=',this.atlasspec['midlobe']);
        
        var i;
        var numpoints=this.rois.length;

        console.log('Attr length=',this.rois[0].attr);
        
        this.rois.sort(comparerois);
        this.indexmap = { };
        for (i=0;i<numpoints;i++) {
            var idx=this.rois[i].index;
            this.indexmap[idx]=i;
            if (i < 2 || i %80 === 0) {
                console.log('i=',i, 'idx=',idx);
            }
        }

        if (DEBUG) console.log("++++ Node definition mapping to lobes: Number of rois="+this.rois.length);
        var maxv=this.rois[0].attr[0];
        for (i=1;i<this.rois.length;i++) {
            var a=this.rois[i].attr[0];
            if (a>maxv)
                maxv=a;
        }

        var numrows=maxv+1;

        //        console.log('Numrows=',numrows);
        
        this.lobeStats=new Array(numrows);//new BisMatrix<int>(maxv+1,3,-1);
        for (i=0;i<numrows;i++) 
            this.lobeStats[i]=[ -1,-1,-1];
        
        for (i=0;i<this.rois.length;i++) {
            var lb=this.rois[i].attr[0];
            if (this.lobeStats[lb][0]<0) {
                this.lobeStats[lb][0]=i;
                this.lobeStats[lb][1]=i;
            } else {
                if (this.lobeStats[lb][0]>i)
                    this.lobeStats[lb][0]=i;
                if (this.lobeStats[lb][1]<i)
                    this.lobeStats[lb][1]=i;
            }
        }
        for (i=0;i<this.lobeStats.length;i++) { 
            if (this.lobeStats[i][0]>-1)
                this.lobeStats[i][2]=this.lobeStats[i][1]-this.lobeStats[i][0]+1;
        }
        // This has to do with the number of lobes
        //console.log('Lobestats=',this.lobeStats);

        this.midpoint=0;
        try {
            this.midpoint=this.lobeStats[this.atlasspec['midlobe']-1][1];
        } catch(e) {
            let found=false;
            let ia=this.atlasspec['midlobe']-1;
            while (ia>0 && found===false) {
                let v=this.lobeStats[ia] || null;
                if (v) {
                    found=true;
                    this.midpoint=this.lobeStats[ia][1];
                }
                ia=ia-1;
            }
        }
        var count=2;
        while (this.midpoint==-1 && (this.atlasspec['midlobe']-count)>0) {
            this.midpoint=this.lobeStats[this.atlasspec['midlobe']-count][1];
            count++;
        }
        this.maxpoint=this.lobeStats[this.lobeStats.length-1][1];


        let num=0;
        let keys=Object.keys(this.indexmap);
        for (let i=0;i<keys.length;i++) {
            let a=Math.floor(keys[i]);
            let b=this.indexmap[keys[i]];
            if (a!==b) {
                num++;
            }
        }
        console.log('**** Node rearrange order=',num,' >0 is OK if this is not the Shen atlas');
    }

    /** Get the location of the center of the "circles" as [x,y] array
     * @returns {array} [ x,y]
     */
    getCenterLocation(index) {
        var shiftx=-0.5*this.offset;
        if (index>this.midpoint) { 
            shiftx=0.5*this.offset;
        }
        
        return [ 0.5*(this.box[0]+this.box[2])+shiftx,
                 0.5*(this.box[1]+this.box[3]) ];
    }
    
    /** Returns the position and normal (on the circle) of node with internal rank index
     * @param {number} index - internal node order
     * @returns {array} [ x,y,nx,ny,angle]
     */
    getPointLocationAndNormal(index) {

        var angle=0.0;
        if (index<=this.midpoint) { 
            angle=270.0+index/this.midpoint*180.0;
        } else {
            angle=270.0-((index-(this.midpoint+1.0))/(this.maxpoint-(this.midpoint+1)))*180.0;
        }
        
        var rad=(angle)*Math.PI/180.0;
        var x=this.radius*(-Math.cos(rad));
        var y=this.radius*(Math.sin(rad));
        
        var cent=this.getCenterLocation(index);
        
        var n1=x,n2=y;
        x=x+cent[0];
        y=y+cent[1];
        
        var m=Math.sqrt(n1*n1+n2*n2);
        n2=n2/m; n1=n1/m;
        if (angle>360)
            angle-=360.0;
        //          console.log('point info='+[ x,y,n1,n2,angle]);
        return [ x,y,n1,n2,angle];
    }

    /** Returns the color for a lobe (for drawing a circle) and returns a color string
     * e.g. 'rgb(255,0,0)'
     * @param {number} lobe - index of lobe
     * @returns {string} color
     */
    getNonSidedLobeColor(lobe) {
        if (lobe>=this.atlasspec['midlobe'])
            lobe=lobe-this.atlasspec['midlobe']+1;
        var c=util.getobjectmapcolor(lobe);
        return 'rgb(' + Math.floor(c[0])+ ',' + Math.floor(c[1])+ ',' + Math.floor(c[2])+")";
    }

    getInverseNonSidedLobeColor(lobe) {
        if (lobe>=this.atlasspec['midlobe'])
            lobe=lobe-this.atlasspec['midlobe']+1;
        if (lobe===1 || lobe===5 || lobe===8 || lobe===10)
            return "#ffffff";
        return "#000000";
    }

    /** clears the canvas and returns its bounds as [ x0,y0,x1,y1,width,height]
     * in voxels.
     * @param {CanvasContext2D} context - context of canvas
     * @returns {array} [x0,y0,x1,y1,width,height ];
     */
    clearCanvas(context) {
        var bd = this.getCanvasBounds(context);
        context.save();
        context.fillStyle="#ffffff";
        context.fillRect(bd[0],bd[1],bd[2],bd[3]);
        context.restore();
        return bd;
    }

    /** draws the core circles for the parcellation in a canvas whose context is passed as input
     * @param {CanvasContext2D} context - context of canvas
     */
    drawCircles(context) {

        if (this.box[0]>=this.box[2]) {
            console.log('draw circles, bad box'+this.box[0]+' '+this.box[2]);
            return;
        }
        
        this.clearCanvas(context);
        var maxlb=this.lobeStats.length;
        var lb,s;

        context.save();
        context.lineWidth=this.thickness;
        
        for (lb=1;lb<maxlb;lb++) {
            var minp=this.lobeStats[lb][0];
            var maxp=this.lobeStats[lb][1];

            if (minp>-1) {
                var angle1=0.0,angle2=0.0;
                
                var cx=this.getCenterLocation(minp);
                if (minp<=this.midpoint) { 
                    angle1=270-(maxp+0.5)/this.midpoint*180.0;
                    angle2=270-(minp-0.5)/this.midpoint*180.0;
                } else {
                    angle1=270+((minp-(this.midpoint+1)-0.5)/(this.maxpoint-(this.midpoint+1)))*180.0;
                    angle2=270+((maxp-(this.midpoint+1)+0.5)/(this.maxpoint-(this.midpoint+1)))*180.0;
                }
                
                angle1=angle1*Math.PI/180.0;
                angle2=angle2*Math.PI/180.0;
                var lobeindex=this.rois[minp].attr[0];
                s=this.getNonSidedLobeColor(lobeindex);
                context.strokeStyle=s;          
                context.beginPath();
                context.arc(cx[0],cx[1],(this.radius+1.5*this.thickness),
                            angle1,angle2,false);
                context.stroke();
            }
        }

        var halfperim=this.radius*3.1415;
        var diam=halfperim/(0.75*(this.maxpoint+1));
        var th=diam*0.5;
        this.actualnoderadius=th;
        for (var i=0;i<=this.maxpoint;i++) {
            var x=this.getPointLocationAndNormal(i);

            s=this.getNonSidedLobeColor(this.rois[i].attr[0]);
            // Store circle coordinates 
            this.rois[i].cx=x[0]; this.rois[i].cy=x[1];
            this.rois[i].nx=x[2]; this.rois[i].ny=x[3];
            this.rois[i].angle=x[4];
            
            context.fillStyle=s;
            context.beginPath();
            context.arc(x[0],x[1],th,2.0*Math.PI,false);
            context.fill();
            context.closePath();
        }
        this.drawNumbers(context);
        context.strokeStyle="#cccccc";
        context.lineWidth=1;

        var ch=context.canvas.height;
        var cw=context.canvas.width;

        context.beginPath();
        context.moveTo(this.viewport.x0*cw,this.viewport.y0*ch);
        context.lineTo(this.viewport.x0*cw,this.viewport.y1*ch);
        context.lineTo(this.viewport.x1*cw,this.viewport.y1*ch);
        context.lineTo(this.viewport.x1*cw,this.viewport.y0*ch);
        context.lineTo(this.viewport.x0*cw,this.viewport.y0*ch);
        context.stroke();
        context.restore();
        
    }

    
    /** draws sample lines for the parcellation in a canvas whose context is passed as input
     * @param {CanvasContext2D} context - context of canvas
     */
    drawLines(context) {

        context.save();
        context.lineWidth=this.linethickness;

        var midlobe=Math.floor((this.lobeStats.length+1)/2);
        var midpoint=this.lobeStats[midlobe-1][1];
        if (midpoint===-1)
            midpoint=this.lobeStats[midlobe-2][1];
        var maxlb=this.lobeStats.length;
        
        var thislobe=1;
        var node=Math.floor(0.5*(this.lobeStats[thislobe][1]-this.lobeStats[thislobe][0]));
        var x1=this.rois[node].cx, y1=this.rois[node].cy;
        var n1=this.rois[node].nx, n2=this.rois[node].ny;
        var XX=[ x1-this.normallength*n1,
                 y1-this.normallength*n2 ];
        var nextlobe;
        for (nextlobe=2;nextlobe<maxlb;nextlobe++) { 
            var s="rgb(255,0,0)";
            //            var thick=1.0;
            if (nextlobe%2===1) {
                s="rgb(0,0,255)";
                //              thick=2.0;
            }
            
            var othernode=this.lobeStats[nextlobe][0];
            var x4=this.rois[othernode].cx, y4=this.rois[othernode].cy;
            var n3=this.rois[othernode].nx, n4=this.rois[othernode].ny;
            var YY=[ x4-this.normallength*n3,
                     y4-this.normallength*n4 ];

            context.strokeStyle=s;
            context.beginPath();
            context.moveTo(x1,y1);
            context.bezierCurveTo(XX[0], XX[1], YY[0], YY[1], x4, y4);
            context.stroke();
        }
        context.lineWidth=1;
        context.restore();
        
    }
    
    /** draws key text for the parcellation in a canvas whose context is passed as input
     * @param {CanvasContext2D} context - context of canvas
     */
    drawNumbers(context) {

        if (this.box[0]<=this.box[2])
            return;
        var cl=[ "rgb(64,64,64)", "rgb(32,32,32)"];
        var clindex=0;
        var l=0;
        var th=this.thickness;

        context.save();
        
        for (l=9;l<=this.maxpoint;l+=10) {
            var x=this.rois[l].cx;
            var y=this.rois[l].cy;
            var nx=this.rois[l].nx;
            var ny=this.rois[l].ny;
            var X1= [ x+3.0*this.actualnoderadius*nx , y+3.0*this.actualnoderadius*ny ];
            var X2= [ x+2.0*th*nx , y+2.0*th*ny ];
            

            context.strokeStyle=cl[clindex];
            context.lineWidth=2*this.linethickness;
            context.beginPath();
            context.moveTo(X1[0],X1[1]);
            context.lineTo(X2[0],X2[1]);
            context.stroke();
            clindex=1-clindex;
        }

        var cnv={ width : (this.viewport.x1-this.viewport.x0)*context.canvas.width || context.canvas.width  };
        var fnsize=webutil.getfontsize(cnv);
        var x0=this.box[0];
        var x1=this.box[2];
        var y0=this.box[1];
        var y1=this.box[3];
        var minsize=fnsize*10;
        if ( (x1-x0) > minsize && (y1-y0)>minsize) {
            var sl=[ "Right", "Left"];
            context.fillStyle = cl[1];
            context.font=fnsize+"px Arial";
            context.textAlign="start";
            context.fillText(sl[0],x0+10,y0+20);
            context.textAlign="end";
            context.fillText(sl[1],x1-10,y0+20);
        }

        context.lineWidth=1;
        context.restore();
    }

    /** find the closest node (drawn  in a canvas whose context is passed as input)
     * @param {CanvasContext2D} context - context of canvas
     * @returns {number} nodeindex -- in original order (not after sort!)
     */
    findPoint(x,y,context) {

        var cw=context.canvas.width;
        if (x< this.box[0] ||
            x> this.box[2] ||
            y< this.box[1] ||
            y> this.box[3] )
            return -1;

        var bestpoint=-1,bestdist=1000000;
        var diffangle=180.0/this.rois.length;
        var midx=0.5*cw*(this.viewport.x1+this.viewport.x0);
        var center;
        var mini=0,maxi=this.midpoint;
        if (x<midx) {
            center=this.getCenterLocation(0);
            if (x>center[0])
                x=center[0];
        } else {
            center=this.getCenterLocation(this.rois.length-1);
            if (x<center[0])
                x=center[0];
            mini=this.midpoint+1;
            maxi=this.rois.length-1;
        }
        
        var dy=y-center[1],dx=center[0]-x;
        var newangle=Math.atan2(dy,dx)*180.0/Math.PI;
        if (newangle<0)
            newangle+=360.0;

        
        for (var n=mini;n<=maxi;n++) {
            var angle=this.rois[n].angle;
            var dangle=Math.abs(angle-newangle);
            if (dangle<diffangle) {
                var px=this.rois[n].cx-x;
                var py=this.rois[n].cy-y;
                var d=Math.abs(px*this.rois[n].nx+py*this.rois[n].ny);
                
                if (d<bestdist || bestpoint===-1) {
                    bestpoint=n;
                    bestdist=d;
                }
            }
        }

        if (bestdist<0.5*midx && bestpoint>=0) {
            return this.rois[bestpoint].index;
        }

        return -1;
    }
    /** set the viewport (part of canvas that will be used to draw parcellation)
     * @param {number} x1 - minimum x (in voxels)
     * @param {number} y1 - minimum y (in voxels)
     * @param {number} x2 - maximum x (in voxels)
     * @param {number} y2 - maximum y (in voxels)
     */
    setViewport(x1,y1,x2,y2) {

        this.viewport={ x1:x1, y1:y1, x2:x2, y2:y2 };
    }

    /** find the closest node and optionally draw crosshairs (drawn  in a canvas whose context is passed as input)
     * @param {number} x - MNI x coordinate to look close to.
     * @param {number} y - MNI y coordinate to look close to.
     * @param {number} z - MNI z coordinate to look close to.
     * @param {CanvasContext2D} context - context of canvas
     * @returns {number} nodeindex -- in original order (not after sort!)
     */
    findMNIPoint(x,y,z,context) {

        context = context || 0;

        
        var n=0;
        var threshold=10.0;
        
        var bestpoint=-1,bestn=-1;
        var bestdist=1000.0;
        
        for (n=0;n<this.rois.length;n++) {
            var px=this.rois[n].x;
            var py=this.rois[n].y;
            var pz=this.rois[n].z;
            var dist=Math.sqrt(Math.pow(x-px,2.0)+Math.pow(y-py,2.0)+Math.pow(z-pz,2.0));
            if (dist<bestdist) {
                bestdist=dist;
                bestn=n;
            }
        }
        
        if (bestdist>threshold)  {
            bestn=-1;
        } else {
            bestpoint=this.rois[bestn].index;
        }

        //          console.log("Looked bestpoint HUMAN="+(bestpoint+1)+" ("+bestn+") bestdist="+bestdist+"input = "+[ x,y,z]);
        
        if (context !== 0) {
            this.drawPoint(bestpoint,context);
        }
        return bestpoint;

    }

    /** draw the cross hairs on node=bestpoint (original indexing)
     * @param {number} bestpoint - Node Index
     * @param {CanvasContext2D} context - context of canvas
     */
    drawPoint(bestpoint,context) {

        if (this.box[0]>=this.box[2])
            return;
        
        if (this.viewport.x0 === this.viewport.x1 )
            return;
        
        var x0=this.box[0];
        var x1=this.box[2];
        var y0=this.box[1];
        var y1=this.box[3];
        context.save();
        context.clearRect(x0,y0,x1-x0,y1-y0);
        if (bestpoint>=0) {
            var actual=this.indexmap[bestpoint];
            var cx=this.rois[actual].cx;
            var cy=this.rois[actual].cy;

            var cent=this.getCenterLocation(actual);
            
            context.lineWidth=2;
            context.strokeStyle = "#000000";
            context.beginPath();
            context.moveTo(0.5*(x0+x1),0.5*(y0+y1));
            context.bezierCurveTo(0.5*cent[0]+0.5*cx,0.5*cent[1]+0.5*cy,
                                  cx,cy,
                                  cx+2.0*this.thickness*this.rois[actual].nx,
                                  cy+2.0*this.thickness*this.rois[actual].ny);
            //              context.lineTo(cx,cy);
            //              context.lineTo(cx+2.0*this.thickness*this.rois[actual].nx,
            //                             cy+2.0*this.thickness*this.rois[actual].ny);
            context.stroke();
            context.beginPath();
            context.arc(0.5*(x0+x1),0.5*(y0+y1),3.0,2.0*Math.PI,false);
            context.stroke();
            context.lineWidth=1;
        }
        context.restore();
    }


    /** Create Parcellation file from image 
     */
    createParcellationFromImage (parcimage,atlas,description) {

        
        description = description || "unknown";

        var dim_p=parcimage.getDimensions();
        var dim_a=atlas.getDimensions();

        console.log('Dim=',dim_p,dim_a);
        
        var sum=0,i=0,j=0;
        for (i=0;i<=2;i++)
            sum+=Math.abs(dim_p[i]-dim_a[i]);
        if (sum!==0) {
            throw new Error('---- Cannot create node definition from parcellation image. Image is not RAS 181x217x181 1mm');
        }

        var dt=parcimage.getDataType();
        parcimage.computeIntensityRange();
        var r=parcimage.getIntensityRange();
        
        if (r[1]>999 || r[0] < 0 || r[1]<2) 
            throw new Error('Bad Node definition image. It has largest value > 999 (max='+r[1]+') or max value < 2 or min value <0 ( min='+r[0]+')');

        if (DEBUG) console.log('++++ Image range ='+r+' data type='+dt);
        var maxvoi=r[1];

        var volsize=dim_a[0]*dim_a[1]*dim_a[2];
        var numattr=dim_a[3];

        //console.log('Number of attributes=',numattr,parcimage.getDimensions(),atlas.getDimensions());
        
        var cx=new Array(maxvoi+1);
        var cy=new Array(maxvoi+1);
        var cz=new Array(maxvoi+1);
        var Nv=new Array(maxvoi+1);
        var attr=new Array(maxvoi+1);
        for (i=0;i<=maxvoi;i++) {
            cx[i]=0.0;
            cy[i]=0.0;
            cz[i]=0.0;
            Nv[i]=0.0;
            attr[i]=new Array(numattr);
            for (j=0;j<numattr;j++)
                attr[i][j]=[];
        }
        
        var ia,ja,ka,index=0;
        var atlasdata= atlas.getImageData();
        var roidata= parcimage.getImageData();
        for (ka=0;ka<dim_a[2];ka++) {
            for (ja=0;ja<dim_a[1];ja++) {
                for (ia=0;ia<dim_a[0];ia++) {
                    var roi=Math.round(roidata[index]);
                    if (roi>0 && roi<=maxvoi) {
                        cx[roi]+=ia;
                        cy[roi]+=ja;
                        cz[roi]+=ka;
                        Nv[roi]+=1;
                        for (j=0;j<numattr;j++) {
                            var fval=Math.round(atlasdata[j*volsize+index]);
                            if (fval>0.5) {
                                attr[roi][j].push(fval);
                            }
                        }
                    }
                    ++index;
                }
            }
        }

        var numvoi=0;
        var bad=[];
        for (i=1;i<=maxvoi;i++) {
            if (Nv[i]>0) {
                cx[i]/=Nv[i];
                cy[i]/=Nv[i];
                cz[i]/=Nv[i];
                for (ia=0;ia<numattr;ia++) {
                    var v=0.0;
                    if (attr[i][ia].length>0) {
                        v=computemode(attr[i][ia]);
                        attr[i][ia]=v;
                    } else {
                        attr[i][ia]=0;
                    }
                }
                numvoi+=1;
            }
            
            if (attr[i][0]===0) {
                bad.push(i);
                //                  console.log('++++ voi '+i+' lies outside lobe map. Need to project by finding closest other node');
            }
        }
        
        // Fix bad lobes
        for (i=0;i<bad.length;i++) {
            var badnode=bad[i];
            var bestnode=-1;
            var bestdist=0.0;
            for (j=1;j<=maxvoi;j++) {
                if (attr[j][0]!==0) {
                    var dist=
                        Math.pow(cx[badnode]-cx[j],2.0)+
                        Math.pow(cy[badnode]-cy[j],2.0)+
                        Math.pow(cz[badnode]-cz[j],2.0);
                    if (dist < bestdist || bestnode==-1) {
                        bestdist=dist;
                        bestnode=j;
                    }
                }
            }
            if (bestnode!==-1)  {
                console.log('+++++ \t\t\t Mapped voi '+badnode+' to lobe '+attr[bestnode][0] +
                            ' by using the value from its closest good node ('+bestnode+' dist='+Math.sqrt(bestdist)+')');
                attr[badnode][0]=attr[bestnode][0];
                //                  if (attr[badnode][1]===0)
                //                      attr[badnode][1]=attr[bestnode][1];
            } else {
                throw new Error('Cannot create node definition, no good nodes.');
            }
        }
        var obj={};
        obj.bisformat="Parcellation";
        obj.numpoints=numvoi;
        obj.numattr=numattr;
        obj.description=description;
        obj.baseatlas=this.atlasspec['name'];
        obj.rois=[];

        let MNI = this.atlasspec['origin'];
        
        for (i=1;i<=maxvoi;i++) {
            if (Nv[i]>0) {
                var elem = { };
                elem.x=Math.round(100.0*(cx[i]-MNI[0]))/100.0;
                elem.y=Math.round(100.0*(cy[i]-MNI[1]))/100.0;
                elem.z=Math.round(100.0*(cz[i]-MNI[2]))/100.0;
                elem.attr=[];
                for (ia=0;ia<numattr;ia++)
                    elem.attr[ia]=attr[i][ia];
                obj.rois.push(elem);
            }
        }
        //console.log('Midlobe=',this.atlasspec['midlobe']);
        
        return JSON.stringify(obj);
    }

    /** Debugging function matrix
     */
    creatematrix() {
        var numpoints=this.rois.length;
        var numattr=this.rois[0].attr.length;
        var matrix = util.zero(numpoints,numattr+3);
        
        
        for (var i=0;i<numpoints;i++) {
            var index=this.indexmap[i];
            matrix[i][0]=this.rois[index].x;
            matrix[i][1]=this.rois[index].y;
            matrix[i][2]=this.rois[index].z;
            matrix[i][3]=this.rois[index].index;
            for (var j=0;j<numattr;j++)
                matrix[i][3+j]=this.rois[index].attr[j];
        }
        return matrix;
    }

    /** Create json file
     */
    serialize(description=null) {
        var numpoints=this.rois.length;
        var numattr=this.rois[0].attr.length;
        var obj={};
        obj.bisformat="Parcellation";
        obj.numpoints=numpoints;
        obj.numattr=numattr;
        obj.description= description || this.description;
        obj.baseatlas=this.atlasspec['name'];
        obj.rois=[];

        for (var i=0;i<numpoints;i++) {
            var index=this.indexmap[i];
            var elem = { };
            elem.x=this.rois[index].x;
            elem.y=this.rois[index].y;
            elem.z=this.rois[index].z;
            elem.attr=[];
            for (var ia=0;ia<numattr;ia++)
                elem.attr[ia]=this.rois[index].attr[ia];
            obj.rois.push(elem);
        }
        return JSON.stringify(obj,null,4);
    }

    /** Create Parcellation from text file
     */
    createParcellationFromText(textstring,filename,atlas,description) {

        description = description || "unknown";         
        var out_lines=null;
        try {
            out_lines=util.parseMatrix(textstring,filename,false,3);
        } catch(e) {
            throw new Error(e);
        }
        var i,j;
        console.log('+++++ Loaded Point Matrix from '+filename+' of size ='+out_lines.length+'*3');

        var atlasdata= atlas.getImageData();
        var dim_a=atlas.getDimensions();
        var volsize=dim_a[0]*dim_a[1]*dim_a[2];
        var numpoints=out_lines.length;

        var MNI = [ 90, 126, 72 ];

        var bad = [];

        var cx=new Array(numpoints);
        var cy=new Array(numpoints);
        var cz=new Array(numpoints);
        var attr=new Array(numpoints);
        var numattr=dim_a[3];
        for (var pt=0;pt<out_lines.length;pt++) {
            attr[pt]=new Array(numattr);
            cx[pt]=parseFloat(out_lines[pt][0]);
            cy[pt]=parseFloat(out_lines[pt][1]);
            cz[pt]=parseFloat(out_lines[pt][2]);
            var x=Math.round(util.range(cx[pt]+MNI[0],1.0,179.0));
            var y=Math.round(util.range(cy[pt]+MNI[1],1.0,216.0));
            var z=Math.round(util.range(cz[pt]+MNI[2],1.0,179.0));
            var index=x+y*dim_a[0]+z*dim_a[0]*dim_a[1];
            //              console.log('Node '+pt+' mni='+[cx[pt],cy[pt],cz[pt]]+' (x,y,z)='+[x,y,z]+' index='+index);
            for (j=0;j<numattr;j++) {
                var fval=Math.round(atlasdata[j*volsize+index]);
                if (fval>0.5) {
                    attr[pt][j]=fval;
                } else {
                    attr[pt][j]=0.0;
                }
            }
            if (attr[pt][0]===0) 
                bad.push(pt);
            //            console.log('attr',pt,'=',attr[pt]);
        }
        
        // Fix bad lobes
        for (i=0;i<bad.length;i++) {
            var badnode=bad[i];
            var bestnode=-1;
            var bestdist=0.0;
            for (j=0;j<numpoints;j++) {
                if (attr[j][0]!==0) {
                    var dist=
                        Math.pow(cx[badnode]-cx[j],2.0)+
                        Math.pow(cy[badnode]-cy[j],2.0)+
                        Math.pow(cz[badnode]-cz[j],2.0);
                    if (dist < bestdist || bestnode==-1) {
                        bestdist=dist;
                        bestnode=j;
                    }
                }
            }
            if (bestnode!==-1)  {
                console.log('+++++ \t\t\t Mapped voi '+badnode+' to lobe '+attr[bestnode][0] +
                            ' by using the value from its closest good node ('+bestnode+' dist='+Math.sqrt(bestdist)+')');
                for (let i=0;i<attr[badnode].length;i++) {
                    if (attr[badnode][i]<1)
                        attr[badnode][i]=attr[bestnode][i];
                }
                //                  if (attr[badnode][1]===0)
                //                      attr[badnode][1]=attr[bestnode][1];
            } else {
                throw new Error('Cannot create node definition, no good nodes.');
            }
        }
        var obj={};
        obj.bisformat="Parcellation";
        obj.numpoints=numpoints;
        obj.numattr=numattr;
        obj.description=description;
        obj.baseatlas=this.atlasspec['name'];
        obj.rois=[];

        for (i=0;i<numpoints;i++) {
            var elem = { };
            elem.x=cx[i];
            elem.y=cy[i];
            elem.z=cz[i];
            elem.attr=[];
            for (var ia=0;ia<numattr;ia++)
                elem.attr[ia]=attr[i][ia];
            obj.rois.push(elem);
        }
        return JSON.stringify(obj);
    }

}

module.exports = BisParcellation;
