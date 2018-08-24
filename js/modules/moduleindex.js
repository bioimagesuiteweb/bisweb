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

exports.smoothImage = require('smoothImage.js');
exports.gradientImage = require('gradientImage.js');
exports.thresholdImage = require('thresholdImage.js');
exports.changeImageSpacing = require('changeImageSpacing.js');
exports.binaryThresholdImage = require('binaryThresholdImage.js');
exports.extractSlice = require('extractSlice.js');
exports.extractFrame = require('extractFrame.js');
exports.normalizeImage = require('normalizeImage.js');
exports.clusterThreshold = require('clusterThreshold.js');
exports.prepareRegistration = require('prepareRegistration.js');
exports.resampleImage = require('resampleImage.js');
exports.flipImage = require('flipImage.js');
exports.maskImage = require('maskImage.js');
exports.combineImages = require('combineImages.js');
exports.cropImage = require('cropImage.js');
exports.morphologyFilter = require('morphologyFilter.js');
exports.blankImage = require('blankImage.js');
exports.process4DImage = require('process4DImage.js');
exports.sliceBiasFieldCorrect = require('sliceBiasFieldCorrect.js');
exports.segmentImage = require('segmentImage.js');
exports.regularizeObjectmap = require('regularizeObjectmap.js');
exports.projectImage = require('projectImage.js');
exports.backProjectImage = require('backProjectImage.js');

exports.butterworthFilter = require('butterworthFilter.js');
exports.regressGlobal = require('regressGlobal.js');
exports.regressOut = require('regressOut.js');
exports.computeCorrelation = require('computeCorrelation.js');
exports.computeROI = require('computeROI.js');
exports.functionalConnectivityPreprocessing= require('functionalConnectivityPreprocessing');

exports.computeGLM = require('computeGLM.js');
exports.approximateField = require('approximateField.js');
exports.displacementField = require('displacementField.js');
exports.resliceImage = require('resliceImage.js');
exports.motionReslice = require('motionReslice.js');
exports.manualRegistration = require('manualRegistration.js');
exports.linearRegistration = require('linearRegistration.js');
exports.nonlinearRegistration = require('nonlinearRegistration.js');
exports.motionCorrection = require('motionCorrection.js');

exports.defaceImage=require('defaceImage.js');
exports.reorientImage=require('reorientImage.js');

exports.moduleNamesArray = {
    'approximatefield': exports.approximateField,
    'backprojectimage': exports.backProjectImage,
    'binarythresholdimage': exports.binaryThresholdImage,    
    'blankimage' : exports.blankImage,
    'butterworthfilter': exports.butterworthFilter,
    'changeimagespacing' : exports.changeImageSpacing,
    'clusterthreshold': exports.clusterThreshold,
    'combineimages' : exports.combineImages,
    'computecorrelation': exports.computeCorrelation,
    'computeglm': exports.computeGLM,
    'computeroi': exports.computeROI,
    'cropimage' : exports.cropImage,
    'defaceimage' : exports.defaceImage,
    'displacementfield': exports.displacementField,
    'extractframe': exports.extractFrame,
    'extractslice': exports.extractSlice,
    'flipimage' : exports.flipImage,
    'functionalconnectivitypreprocessing' : exports.functionalConnectivityPreprocessing,
    'gradientimage': exports.gradientImage,
    'linearregistration': exports.linearRegistration,
    'manualregistration': exports.manualRegistration,
    'maskimage' : exports.maskImage,
    'morphologyfilter' : exports.morphologyFilter,
    'motioncorrection' : exports.motionCorrection,
    'motionreslice': exports.motionReslice,
    'nonlinearregistration': exports.nonlinearRegistration,
    'normalizeimage': exports.normalizeImage,
    'prepareregistration': exports.prepareRegistration,
    'process4dimage' : exports.process4DImage,
    'projectimage': exports.projectImage,
    'regressglobal': exports.regressGlobal,
    'regressout': exports.regressOut,
    'reorientimage': exports.reorientImage,
    'resampleimage': exports.resampleImage,
    'resliceimage': exports.resliceImage,
    'segmentimage': exports.segmentImage,
    'regularizeobjectmap': exports.regularizeObjectmap,
    'slicebiascorrect': exports.sliceBiasFieldCorrect,
    'smoothimage': exports.smoothImage,
    'thresholdimage': exports.thresholdImage,
};


exports.getModule = function(toolname) {
    
    let newmodulecommand=this.moduleNamesArray[toolname.toLowerCase()];
    if (newmodulecommand===undefined) {
        //    console.log('Error: could not find module',toolname,' in getModule()');
        return null;
    }
    
    return new newmodulecommand();
};
