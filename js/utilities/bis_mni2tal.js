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
 * @file Browser or Node.js module. Contains {@link MNI2Tal}.
 * @author Xenios Papademetris
 * @version 1.0
 */


"use strict";

// ---------------------------------------------------------------------------------
//  GLOBAL UTILITIES
// ---------------------------------------------------------------------------------
const bismni2tal={   };

bismni2tal.MNI = [ 90, 126, 72 ];
bismni2tal.DIMENSIONS = [ 181,217,181];
bismni2tal.MNIMIN = [ -90, -108,-72 ];
bismni2tal.MNIMAX = [ 90, 90,108 ];
bismni2tal.MNIFLIP = [ false,false,false];

bismni2tal.convertMNIToSlice= function(plane, value) {
    
    var a=Math.round(value);
    if (bismni2tal.MNIFLIP[plane])
        a=-value;
    
    var b=a+bismni2tal.MNI[plane];
    return b;
};

bismni2tal.convertSliceToMNI=function(plane, value) {
    var mni=Math.round(value)-bismni2tal.MNI[plane];
    if (bismni2tal.MNIFLIP[plane])
        mni=-mni;
    return mni;
};


// ---------------------------------------------------------------------------------
//  O R T H O    V I E W E R
// ---------------------------------------------------------------------------------


var out = function() {

    var obj ={

        getMNICoordinates : function(mm) {
            
            var mni=[0,0,0];
            for (var i=0;i<=2;i++)
                mni[i]=bismni2tal.convertSliceToMNI(i,mm[i]);
            return mni;
        },
        
        getMMCoordinates : function(mni) {
            
            var mm=[0,0,0];
            for (var i=0;i<=2;i++)
                mm[i]=bismni2tal.convertMNIToSlice(i,mni[i]);
            return mm;
        },
    };
    return obj;
};



// ------------------------------------------------------------------------------------------
// Boilerplate at bottom
// ------------------------------------------------------------------------------------------
module.exports = out;
