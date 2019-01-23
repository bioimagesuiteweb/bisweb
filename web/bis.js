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

/* global window */

"use strict";

/** 
 * @file Browser ONLY module.Contains {@link BisF}. It is only used in development mode and to define
 * structures for JSDOC. It is not included in the output builds.
 * @author Xenios Papademetris
 * @version 1.0
 */

/** Collection of Function Types
 * @interface BisF
 */

// THis is just a flag in development mode so that the webassembly code
// is found in ../build/
window.BIS={
    internal : false,
};

/**
 * Interface for classes that handle mouse events from viewers (editors)
 *
 * @interface BisMouseObserver
 */

/**
 * Initializes control (called by viewer when image is changed)
 * @function
 * @name BisMouseObserver#initialize
 * @param {Bis_SubViewer} subviewers - scene objects (to place extra info in)
 * @param {BisImage } image - new image
 * @param {Boolean} samesize - if new image has identical dimensions,orientation and spacing as previous
 */

/**
 * Handles mouse coordinates event 
 * @function
 * @name BisMouseObserver#updatemousecoordinates
 * @param {array} mm - [ x,y,z ] array with current point
 * @param {number} plane - 0,1,2 to signify whether click was on YZ,XZ or XY image plane (-1,3 mean 3D click)
 * @param {number} mousestate - 0=click 1=move 2=release
 *
 */


/**
 * Interface for classes that handle colormap update events from viewers (or are viewers!)
 *
 * @interface BisColormapObserver
 */

/**
 * Initializes control (called by viewer when image is changed)
 * @function
 * @name BisMouseObserver#updatecmap
 * @param {BisGUIColormapController} controller - to copy parameters from
 * @param {BisF.ColorMapControllerPayload } input - new transfer functions
 */



/**
 * Interface for classes that handle window resize events
 *
 * @interface BisResizeObserver
 */

/**
 * Handles resize event 
 * @function
 * @name BisResizeObserver#handleresize
 * @param {array} dim -- [width,height ] of the sender
 *
 */

/**
 * Interface for classes that handle window image events
 *
 * @interface BisImageObserver
 */

/**
 * Handles image event 
 * @function
 * @name BisImageChangedObserver#handleViewerImageChanged
 * @param {Object} viewer --  a pointer to the calling object
 * @param {String} name -- name of changed image (either 'image' or 'overlay')
 * @param {String} colortype -- colortype of viewer as set
 *
 */

/** This is a type of function that maps raw image scalars to colors. Used by extensively by the viewers.
 * @function 
 * @name BisF.ImageSetCallback
 * @param {BisWebImage} image - the image that is read
 */

//console.log('.... Loaded bis.js -- operating in development mode ');
