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
 * @file A Broswer and Node.js module. Contains {@link ColorMapper} and {@link Util}.
 * @author Xenios Papademetris
 * @version 1.0
 */

const numeric=require('numeric');
const CryptoJS = require('crypto-js');
numeric.largeArray = 50; 
numeric.precision = 3;

const objectmapcolormap=[ [ 0,0,0,0 ], [ 255,0,0,255 ],  [ 255,158,0,255 ],  [ 255,255,0,255 ],  [ 0,255,0,255 ],  [ 0,107,255,255 ],  [ 210,159,202,255 ],  [ 44,246,255,255 ],  [ 134,110,0,255 ],  [ 253,144,0,255 ],  [ 102,1,102,255 ],  [ 255,0,255,255 ],  [ 255,164,255,255 ],  [ 255,135,132,255 ],  [ 131,19,49,255 ],  [ 33,24,198,255 ],  [ 163,130,255,255 ],  [ 132,0,255,255 ],  [ 4,64,232,255 ],  [ 115,148,0,255 ],  [ 131,3,0,255 ],  [ 0,97,3,255 ],  [ 0,0,118,255 ],  [ 235,214,169,255 ],  [ 255,70,0,255 ],  [ 130,157,254,255 ],  [ 164,22,110,255 ],  [ 38,164,121,255 ],  [ 163,116,4,255 ],  [ 153,51,51,255 ],  [ 235,27,206,255 ],  [ 153,255,51,255 ],  [ 51,153,51,255 ],  [ 84,179,97,255 ],  [ 254,192,254,255 ],  [ 95,255,153,255 ],  [ 63,193,51,255 ],  [ 153,255,255,255 ],  [ 0,153,153,255 ],  [ 153,51,255,255 ],  [ 192,147,68,255 ],  [ 254,140,251,255 ],  [ 153,221,191,255 ],  [ 84,75,96,255 ],  [ 145,180,216,255 ],  [ 183,51,153,255 ],  [ 246,151,242,255 ],  [ 148,200,112,255 ],  [ 187,24,92,255 ],  [ 51,0,54,255 ],  [ 156,100,100,255 ],  [ 133,255,220,255 ],  [ 213,217,123,255 ],  [ 115,79,22,255 ],  [ 62,73,161,255 ],  [ 251,214,200,255 ],  [ 61,167,55,255 ],  [ 51,102,102,255 ],  [ 204,107,102,255 ],  [ 204,153,102,255 ],  [ 102,51,102,255 ],  [ 135,77,148,255 ],  [ 252,156,0,252 ],  [ 252,252,0,252 ],  [ 0,252,0,252 ],  [ 33,127,197,252 ],  [ 154,152,154,252 ],  [ 44,244,252,252 ],  [ 163,141,0,252 ],  [ 252,252,252,252 ],  [ 101,101,101,252 ],  [ 252,0,252,252 ],  [ 252,162,252,252 ],  [ 0,135,139,252 ],  [ 252,168,139,252 ],  [ 33,24,196,252 ],  [ 161,129,252,252 ],  [ 131,0,252,252 ],  [ 147,252,130,252 ],  [ 114,147,0,252 ],  [ 130,3,0,252 ],  [ 0,96,3,252 ],  [ 0,0,117,252 ],  [ 233,212,167,252 ],  [ 252,69,0,252 ],  [ 63,28,123,252 ],  [ 162,22,109,252 ],  [ 38,162,120,252 ],  [ 161,115,4,252 ],  [ 151,50,50,252 ],  [ 151,207,50,252 ],  [ 151,252,50,252 ],  [ 50,151,50,252 ],  [ 83,177,96,252 ],  [ 53,203,205,252 ],  [ 94,252,151,252 ],  [ 62,191,50,252 ],  [ 151,252,252,252 ],  [ 0,151,151,252 ],  [ 151,50,252,252 ],  [ 151,213,252,252 ],  [ 50,185,38,252 ],  [ 151,219,189,252 ],  [ 83,74,95,252 ],  [ 212,179,151,252 ],  [ 181,50,151,252 ],  [ 197,151,180,252 ],  [ 164,46,50,252 ],  [ 29,53,50,252 ],  [ 50,0,53,252 ],  [ 50,50,16,252 ],  [ 132,252,218,252 ],  [ 151,120,50,252 ],  [ 114,78,22,252 ],  [ 61,72,159,252 ],  [ 88,61,170,252 ],  [ 60,165,54,252 ],  [ 50,101,101,252 ],  [ 202,106,101,252 ],  [ 202,151,101,252] ];


const f2map=[ [ 255, 0, 255 ], [ 247, 0, 255 ], [ 239, 0, 255 ], [ 230, 0, 255 ], [ 222, 0, 255 ], [ 214, 0, 255 ], [ 206, 0, 255 ], [ 197, 0, 255 ], [ 189, 0, 255 ], [ 181, 0, 255 ], [ 173, 0, 255 ], [ 165, 0, 255 ], [ 156, 0, 255 ], [ 148, 0, 255 ], [ 140, 0, 255 ], [ 132, 0, 255 ], [ 123, 0, 255 ], [ 115, 0, 255 ], [ 107, 0, 255 ], [ 99, 0, 255 ], [ 90, 0, 255 ], [ 82, 0, 255 ], [ 74, 0, 255 ], [ 66, 0, 255 ], [ 58, 0, 255 ], [ 49, 0, 255 ], [ 41, 0, 255 ], [ 33, 0, 255 ], [ 25, 0, 255 ], [ 16, 0, 255 ], [ 8, 0, 255 ], [ 0, 0, 255 ], [ 255, 0, 0 ], [ 255, 32, 0 ], [ 255, 64, 0 ], [ 255, 96, 0 ], [ 255, 128, 0 ], [ 255, 159, 0 ], [ 255, 191, 0 ], [ 255, 223, 0 ], [ 255, 255, 0 ], [ 255, 255, 7 ], [ 255, 255, 14 ], [ 255, 255, 21 ], [ 255, 255, 28 ], [ 255, 255, 35 ], [ 255, 255, 43 ], [ 255, 255, 50 ], [ 255, 255, 57 ], [ 255, 255, 64 ], [ 255, 255, 71 ], [ 255, 255, 78 ], [ 255, 255, 85 ], [ 255, 255, 92 ], [ 255, 255, 99 ], [ 255, 255, 106 ], [ 255, 255, 113 ], [ 255, 255, 120 ], [ 255, 255, 128 ], [ 255, 255, 135 ], [ 255, 255, 142 ], [ 255, 255, 149 ], [ 255, 255, 156 ], [ 255, 255, 163 ] ];

const f4map = [ [ 51, 204, 255 ], [ 68, 187, 255 ], [ 85, 170, 255 ], [ 102, 153, 255 ], [ 119, 136, 255 ], [ 136, 119, 255 ], [ 153, 102, 255 ], [ 170, 85, 255 ], [ 187, 68, 255 ], [ 175, 0, 0 ], [ 204, 0, 0 ], [ 255, 0, 0 ], [ 255, 51, 0 ], [ 255, 102, 0 ], [ 255, 158, 0 ], [ 255, 204, 0 ], [ 255, 255, 0 ], [ 255, 255, 68 ] ];




/**
 * A set of utility functions. <BR>
 * If using from node.js/webpack it is the output of <B>require('bis_util')</B>.<BR>
 * Util namespace.
 * @namespace Util
 */

const util = {

    
    objectmapcolormap : objectmapcolormap,
    f2map : f2map,
    f4map : f4map,

    /**
     * This function rounds a number to a fixed number of decimal places.
     * Set scale to 10 to use 1, 100 to use 2 etc.
     @alias Util.scaledround
     @param {number} t - number to round
     @param {number} scale - essentially multiply t*scale, round and then divide by scale
     @returns {number} 
    */
    scaledround : function (t,scale) {
        t=t || 0.0;
        scale = scale || 1;
        return Math.round(t*scale)/scale;
    },
    
    
    /** 
     * This function resticts a variable t to have value between min and max
     * @alias Util.range
     * @param {number} t - any number
     * @param {number} minv - lower bound
     * @param {number} maxv - upper bound
     */
    range : function (t,minv,maxv) {
        if (t<minv)
            return minv;
        if (t>maxv)
            return maxv;
        return t;
    },
    
    /** 
     * This function resticts a variable t to have value between 0 and maxv-1
     * if greater than maxv-1 then we subtract maxv until below. 
     * Use this for things like angles e.g. cyclicrange(500,360) = 140
     * @alias Util.cyclicrange
     * @param {number} t - any number
     * @param {number} maxv - periodic upper bound (maxv-1)
     */
    cyclicrange : function(t,maxv) {
        
        if (t>=0 && t<maxv)
            return t;
        
        while (t<0)
            t+=maxv;
        while (t>=maxv)
            t-=maxv;
        return t;
    },
    
    
    /** 
     * This function is matlab-like zero function. It creates a numericjs matrix
     * and fills it with zeros. It is really a shortcut.
     * @alias Util.zero
     * @param {number} sx,sy - size of matrix (2d array)
     * @returns {Matrix}
     */

    zero : function(sx,sy) {
        return numeric.rep([sx,sy],0.0);
    },

    // -------------------------
    // Spline Stuff
    // -------------------------
    /** 
     * This function computes the B-spline basis function
     * @alias Util.value
     * @param {number} i - kernel index (0 to 3)
     * @param {number} t - cordinate
     * @returns {number}
     */

    value : function(i,t) {
        
        if (i===0)
            return (1-t)*(1-t)*(1-t)/6.0;
        if (i===1)
            return (3*t*t*t - 6*t*t + 4)/6.0;
        if (i===2)
            return (-3*t*t*t + 3*t*t + 3*t + 1)/6.0;
        if (i===3)
            return (t*t*t)/6.0;
        return 0.0;
    },
    
    /** 
     * This function computes the B-spline derivative basis function
     * @alias Util.value
     * @param {number} i - kernel index (0 to 3)
     * @param {number} t - cordinate
     * @returns {number}
     */
    der : function(i,t) {
        if (i===0)
            return -(1-t)*(1-t)/2.0;
        if (i===1)
            return (9*t*t - 12*t)/6.0;
        if (i===2)
            return (-9*t*t + 6*t + 3)/6.0;
        if (i===3)
            return (t*t)/2.0;
        return 0.0;
    },
    

    /** This functions converts rgb to hex. 
     * See {@link http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb}
     * @alias Util.rgbToHex
     * @param {number} r,g,b - values 0 to 255 for each color
     * @returns {string}
     */
    rgbToHex : function (r, g, b) {

        function componentToHex(c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    },

    /** This functions converts hex to rgb. 
     * @alias Util.hexToRgb
     * @param {string} hex - color value as string 
     * @returns {object} object - object where object.r, object.g and object.b are the individual colors
     */
    hexToRgb : function (hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },


    /** This functions converts a float/integer array to a nice looking string with fixed decimal places
     * @alias Util.arrayToString
     * @param {array} array - the input array
     * @param {number} decimal - the number of decimal places
     * @returns {string} - pretty print string
     */
    arrayToString : function(arr,decimal)  {

        if (decimal !==0)
            decimal = parseInt(decimal || 2);
        if (decimal<0)
            decimal=0;
        else if (decimal>4)
            decimal=4;
        var s="[ ";
        for (var i=0;i<arr.length;i++) {
            s=s+parseFloat(arr[i].toFixed(decimal));
            if (i!== arr.length-1)
                s=s+', ';
        }
        return s+" ]";
    },
    

    
    // -------------------------
    // BioImage Suite colormaps
    // -------------------------

    
    /** Colormap factory. 
     * This creates a function that maps the BioImage Suite objectmap colormap where values 1-118 are mapped to colors.
     * @alias Util.mapobjectmapfactory
     * @param {number} opacity - a value from 0 to 255 to set the opacity
     * @returns {BisF.ColorMapperFunction} - function to perform colormapping
     */
    mapobjectmapfactory : function(opacity) {

        if (opacity!==0)
            opacity = opacity || 255;

        var mapobjectmap = function(data,index,map) {
            
            var v=Math.round(data[index]);
            if (v<0)
                v=0;
            while (v>118)
                v=v-117;
            
            var cindex=v;//util.range(Math.round(v),0,118);
            for (var i=0;i<=2;i++)
                map[i]=objectmapcolormap[cindex][i];
            if (cindex>0)
                map[3]=opacity;
            else
                map[3]=0;
        };
        return mapobjectmap;
    },

    /** Colormap factory. 
     * This creates a function to perform step colormap mapping.
     * @alias Util.mapstepcolormapfactory
     * @param {number} minint - any intensity below this is set to minint
     * @param {number} maxint - any intensity above this is set to maxint
     * @param {number} opacity - a value from 0 to 255 to set the opacity
     * @param {number} mode - defines which colors to use 1=red,2=green,4=blue and combinations (e.g. 7=grayscale)
     * @returns {BisF.ColorMapperFunction} - function to perform colormapping
     */
    mapstepcolormapfactory : function(minint,maxint,opacity,mode) {

        if (opacity!==0)
            opacity = opacity || 255;
        opacity=util.range(opacity,0,255);
        mode=util.range(mode||7,1,7);
        

        if (maxint==minint) {
            maxint=maxint+1.0;
        } else if (maxint<minint) {
            var a=maxint;
            maxint=minint;
            maxint=a;
        }
        
        var params = {
            shift : minint,
            scale : 255.0/(maxint-minint),
            opacity : opacity,
            mode : mode,
        };

        var internalmapfunction = function(data,index,map) {
            var v=data[index];
            var c=util.range(Math.round(params.scale*(v-params.shift)),0.0,255.0);
            map[0]=c;  map[1]=c;   map[2]=c; map[3]=params.opacity;
            if (v<params.shift)
                map[3]=0;
        };

        var internalmapfunction2 = function(data,index,map) {
            var v=data[index];
            var c=util.range(Math.round(params.scale*(v-params.shift)),0.0,255.0);
            if (params.mode===1 || params.mode===3 || params.mode ===5) 
                map[0]=c;
            else 
                map[0]=0;
            
            if (params.mode===2)
                map[1]=c;
            else if (params.mode===3  || params.mode === 6)
                map[1]=c*0.5;
            else
                map[1]=0;
            
            if (params.mode>3)
                map[2]=c;
            else
                map[2]=0;
            
            map[3]=params.opacity;
            if (v<params.shift)
                map[3]=0;
        };
        
        if (params.mode===7)
            return internalmapfunction;
        return internalmapfunction2;
    },
    
    /** Colormap factory. 
     * This creates a function to perform mapping of functional overlays using BioImage Suite colormaps
     * @alias Util.mapoverlayfactory
     * @param {number} minthreshold - any intensity below this is set to be fully transparent
     * @param {number} maxthreshold - any intensity above this is set to maxthreshold
     * @param {number} opacity - a value from 0 to 255 to set the opacity
     * @param {boolean} usef4 - if true use the BioImage Suite ``F4'' colormap else use f2
     * @param {typedarray} internalarray - if set this is used to perform masking using an additional array. One example of this is when using cluster filtering which creates a mask array to filter out valid values in small clusters.
     * @returns {BisF.ColorMapperFunction} - function to perform colormapping
     */
    mapoverlayfactory : function (minthreshold,maxthreshold,opacity,mode,usef4,internalarray) {

        if (opacity!==0)
            opacity=opacity || 255;
        usef4= usef4 || false;
        mode = mode  || 3; // 1=pos,2=neg,3=both
        if (mode<1)
            mode=1;
        else if (mode>3)
            mode=3;
        
        var cmap=f2map;
        if (usef4)
            cmap=f4map;
        
        var params = {
            cmap : cmap,
            numcolors : cmap.length/2,
            minth : Math.abs(minthreshold),
            maxth : Math.abs(maxthreshold),
            opacity : opacity,
            internalarray : internalarray || null,
        };

        if (params.minth>params.maxth) {
            var a=params.maxth;
            params.maxth=params.minth;
            params.minth=a;
        }
        params.range=params.maxth-params.minth;
        if (params.range<0.0001)
            params.range=1.0;

        var fun=function(data,index,map) {

            var val;
            if (params.internalarray!==null)
                val=params.internalarray[index];
            else
                val=data[index];
            var donothing=false;
            if (val>-params.minth && val<params.minth) {
                donothing=true;
            } else if (mode==1  && val<0) {
                donothing=true;
            } else if (mode==2 && val>0) {
                donothing=true;
            }

            if (donothing) {
                map[0]=0; map[1]=0;map[2]=0;map[3]=0;
                return;
            }

            map[3]=opacity;
            var color=(Math.abs(val)-params.minth)/params.range;
            if (color>1)
                color=1;
            
            if (val>0)
                color=Math.floor(params.numcolors+(params.numcolors-1)*color);
            else
                color=Math.floor((params.numcolors-1)*(1-color));

            try {
                map[0]=params.cmap[color][0];
                map[1]=params.cmap[color][1];
                map[2]=params.cmap[color][2];
            } catch(e) {
                // TODO:
                // There is a bug here somewhere
                // When transitioning.
                // Keep Try for now
                map[0]=0;
                map[1]=0;
                map[2]=0;
                map[3]=0;
            }
        };
        return fun;
    },


    /** Colormap factory. 
     * This parses a matrix from a text file
     * @param {string} textstring to parse -- either number of columns (e.g. 3) or 'square'
     * @param {string} filename -- name of original file (useful for error messages)
     * @param {boolean} square  -- if true only accept square matrices
     * @param {number} numcolumns  -- if not -1 then ensure matrix has numcolumns columns
     * @alias Util.parseMatrix
     */
    parseMatrix : function(textstring,filename,square,numcolumns) {

        square = square || false;
        numcolumns =numcolumns || -1;
        
        
        var cleanstring=function(s) {
            return s.trim().replace(/ /g,',').replace(/\t/g,',').replace(/,+/g,',');
        };

        var in_lines=textstring.split("\n");
        var numrows=in_lines.length;
        var i=0;
        
        var out_lines=[],goodfound=false,badfound=false;
        for (i=0;i<numrows;i++) {
            if (in_lines[i].indexOf('#')!==0) {
                var s=cleanstring(in_lines[i]).split(',');
                if (goodfound===false) {
                    if ((numcolumns===-1 && s.length>1) || s.length===numcolumns) {
                        goodfound=true;
                        out_lines.push(s);
                        numcolumns=s.length;
                    }
                } else if (badfound===false) {
                    if (s.length===numcolumns) {
                        out_lines.push(s);
                    } else {
                        badfound=true;
                        console.log('----- First non matrix line in line '+i+', numcols='+s.length);
                    }
                } else {
                    i=numrows; // skip to end, bad found
                }
            } else {
                console.log('----- Skipping line '+in_lines[i]+' (starts with #)');
            }
        }

        if (out_lines.length===0) 
            throw new Error('Cannot parse matrix from '+filename+' no rows of appropriate width present');
        if (square && out_lines.length!==numcolumns)
            throw new Error('Cannot parse matrix from '+filename+' as it is not square '+out_lines.length+'*'+numcolumns);
        
        return out_lines;
    },

    /**
     * This function computes the  has of an Uint8Array
     * @alias Util.SHA256
     * @param {Uint8Array} array - the input data
     * @returns {String} hash
     */
    SHA256 : function(array) {
        
        if (array instanceof Uint8Array) {
            return CryptoJS.SHA256(CryptoJS.lib.WordArray.create(array)).toString();
        }
        
        let newarray=null;
        // array.buffer could undefined, or 0 or false or ...
        let d=array.buffer || false;
        if (d!==false) {
            // We have a different array
            newarray=new Uint8Array(array.buffer);
        } else {
            // Let's hope we have a buffer
            newarray=new Uint8Array(array);
        }
        
        return CryptoJS.SHA256(CryptoJS.lib.WordArray.create(newarray)).toString();
    },

    /** 
     * This function computes the correlation coefficient between two arrays (of same length)
     * @alias Util.computeCC
     * @param {array} input1 - the first  array
     * @param {array} input2 - the second array
     * @returns {number} - cross correlation between the arrays
     */
    computeCC : function(input1,input2) {

        if (input1.length < 2 || input1.length!==input2.length) 
            throw new Error('Bad arrays for CC'+input1.length+','+input2.length);

        var length=input1.length;
        var sum=[0,0],sum2=[0,0],sumprod=0.0;
        var mean=[0,0],variance=[0,0];

        for (var i=0;i<length;i++) {
            var v0=input1[i];
            sum[0]+=v0;
            sum2[0]+=v0*v0;
            
            var v1=input2[i];
            sum[1]+=v1;
            sum2[1]+=v1*v1;
            sumprod+=v0*v1;
        }
        
        for (var j=0;j<=1;j++) {
            mean[j]=sum[j]/length;
            variance[j] =sum2[j]/length-mean[j]*mean[j];
            if (variance[j]<0.00001)
                variance[j]=0.00001;
        }

        var covar=Math.pow(sumprod/length-mean[0]*mean[1],2.0);
        var covar2=covar/(variance[0]*variance[1]);
        return covar2;
    },
    

    
    
    /** 
     * This function translates a filename from Windows to a unix style
     * for use with the fileserver
     * @alias Util.filenameWindowsToUnix
     * @param {String} filename
     * @returns {String} - tranlated filename
     */
    filenameWindowsToUnix(fname) {

        let a=fname.trim().replace(/\\/g,'/');
        if (fname.indexOf('/')!==0 && fname.indexOf(":")==1) // ":" is for drive name
            a='/'+a;
        return a;
    },
    
    /** 
     * This function translates a filename from unix to Windows style
     * for use with the fileserver
     * @alias Util.filenameUnixToWindows
     * @param {String} filename
     * @returns {String} - tranlated filename
     */

    filenameUnixToWindows(fname) {

        let a=fname.trim().replace(/\//g,'\\');
        if (fname.indexOf('/')==0)
            a=a.substr(1,a.length);
        return a;

        
    }


};


module.exports = util;


