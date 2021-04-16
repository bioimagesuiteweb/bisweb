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
const bisconfig = require('bisConfigure.js');

const moduleImports = {
    
    smoothimage : require('smoothImage.js'),
//    qualitymeasures : require('qualityMeasures.js'),
    gradientimage : require('gradientImage.js'),
    thresholdimage : require('thresholdImage.js'),
    shiftscaleimage : require('shiftScaleImage.js'),
    changeimagespacing : require('changeImageSpacing.js'),
    binarythresholdimage : require('binaryThresholdImage.js'),
    extractslice : require('extractSlice.js'),
    extractframe : require('extractFrame.js'),
    normalizeimage : require('normalizeImage.js'),
    quantilenormalizeimage : require('quantileNormalizeImage.js'),
    clusterthreshold : require('clusterThreshold.js'),
    prepareregistration : require('prepareRegistration.js'),
    resampleimage : require('resampleImage.js'),
    flipimage : require('flipImage.js'),
    maskimage : require('maskImage.js'),
    combineimages : require('combineImages.js'),
    cropimage : require('cropImage.js'),
    morphologyfilter : require('morphologyFilter.js'),
    blankimage : require('blankImage.js'),
    circleblankimage : require('circleBlankImage.js'),
    process4dimage : require('process4DImage.js'),
    slicebiascorrect : require('sliceBiasFieldCorrect.js'),
    segmentimage : require('segmentImage.js'),
    regularizeobjectmap : require('regularizeObjectmap.js'),
    projectimage : require('projectImage.js'),
    projectaverageimage : require('projectAverageImage.js'),
    preprocessoptical : require('preprocessOptical.js'),
    diffspect : require('diffSpect.js'),
    backprojectimage : require('backProjectImage.js'),
    butterworthfilter : require('butterworthFilter.js'),
    butterworthfilterimage : require('butterworthFilterImage.js'),
    regressglobal : require('regressGlobal.js'),
    regressout : require('regressOut.js'),
    regressoutimage : require('regressOutImage.js'),
    driftcorrectimage : require('driftCorrectImage.js'),
    computecorrelation : require('computeCorrelation.js'),
    seedcorrelation : require('seedCorrelation.js'),
    computeroi : require('computeROI.js'),
    computevolume : require('computeVolume.js'),
//    bilateralfilter : require('bilateralfilter.js'),
    timeseriesnormalizeimage: require('timeseriesNormalizeImage'),
    patchreformatimage: require('patchReformatImage'),
    computeglm : require('computeGLM.js'),
    approximatefield : require('approximateField.js'),
    displacementfield : require('displacementField.js'),
    jacobianimage : require('jacobianImage.js'),
    inverttransformation : require('invertTransformation.js'),
    resliceimage : require('resliceImage.js'),
    projectresliceimage : require('projectResliceImage.js'),
    projectreslicemask : require('projectResliceMask.js'),
    permuteimage : require('permuteImage.js'),
    motionreslice : require('motionReslice.js'),
    manualregistration : require('manualRegistration.js'),
    linearregistration : require('linearRegistration.js'),
    linearpointregistration : require('linearPointRegistration.js'),
    nonlinearregistration : require('nonlinearRegistration.js'),
    nonlinearpointregistration : require('nonlinearPointRegistration.js'),
    motioncorrection : require('motionCorrection.js'),
    defaceimage:require('defaceImage.js'),
    reorientimage:require('reorientImage.js'),
    individualizedparcellation : require('individualizedParcellation.js'),
    makeconnmatrixfile : require('makeConnectivityMatrixFile.js'),
    transformelectrodes : require('transformElectrodes.js'),
    transformsurface : require('transformSurface.js'),
    joinmatrices : require('joinMatrices.js'),
    removematrixcols : require('removeMatrixCols.js'),

    // these are here so that can be accessed by electron
    dicomconversion : require('./dicommodule.js'),
    bidsconversion : require('./bidsmodule.js'),
};

// AFNI
if (bisconfig.usesafni === "ON") {
    moduleImports['afniblurimage'] = require('afniBlurImage.js');
}

// --------------------------------------------------------------

let createModuleNames=function(modules) {
    
    let names = { };
    let keys=Object.keys(modules);
    for (let i=0;i<keys.length;i++) {
        let key=keys[i];
        let name=key.toLowerCase();
        names[name]=key;
    }
    return names;
};

// --------------------------------------------------------------

let moduleNames=createModuleNames(moduleImports);

module.exports = {
    getModule : function(toolname) {
        
        let newmodulecommand=moduleImports[toolname.toLowerCase()];
        if (newmodulecommand===undefined) {
            //    console.log('Error: could not find module',toolname,' in getModule()');
            return null;
        }
    
        return new newmodulecommand();
    },

    getModuleNames : function() {
        return Object.keys(moduleNames);
    },

    createModuleNames : createModuleNames
};
