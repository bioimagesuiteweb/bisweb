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


require("__BISWEB_CUSTOM");
require("__BISWEB_EXTERNAL");
require("bisweb_regressiontestelement.js");
require("bisweb_displayregressionelement.js");
require("bisweb_components.js");
require("bisweb_awsmodule.js");
require("bisweb_fileserverclient.js");
require("bisweb_misactool.js");
require("bisweb_filetreepanel.js");
require("bisweb_dicomimportelement.js");

const webutil = require('bis_webutil');
const webfileutil = require('bis_webfileutil');

// ES6 Imports for modules that need that

import ConnectivityControlElement from "bisweb_connectivitycontrolelement.js";
import LandmarkControlElement from "bisweb_landmarkcontrolelement.js";
import MosaicViewerElement from "bisweb_mosaicviewerelement.js";
import OrthogonalViewerElement from "bisweb_orthogonalviewerelement.js";
import PaintToolElement from "bisweb_painttoolelement.js";

const Elements = {
    DialogElement : require("bisweb_dialogelement.js"),
    CollectionElement : require("bisweb_collectionelement.js"),
    DragAndDropElement : require("bisweb_draganddropelement.js"),
    ViewerLayoutElement : require("bisweb_viewerlayoutelement.js"),
    ColormapControllerElement : require("bisweb_colormapcontrollerelement.js"),
    AtlasToolElement : require("bisweb_atlastoolelement.js"),
    BlobAnalyzerElement : require("bisweb_blobanalyzerelement.js"),
    SnapshotElement : require("bisweb_snapshotelement.js"),
    ConsoleElement : require("bisweb_console.js"),
    GrapherElement : require("bisweb_grapherelement.js"),
    SimpleAlgorithmControllerElement : require('bisweb_simplealgorithmcontroller.js'),
    ModuleManagerElement : require("bisweb_modulemanagerelement.js"),
    ParavisionImportElement: require("bisweb_paravisionimportelement.js"),
    MNI2TalElement : require("bisweb_mni2talelement.js"),
    ParavisionApplicationElement : require("bisweb_paravisionapplicationelement.js"),
    MainViewerApplicationElement : require("bisweb_mainviewerapplication.js"),
    ConnectivityApplicationElement : require("bisweb_connectivityapplicationelement.js"),
    DualViewerApplicationElement : require("bisweb_dualviewerapplication.js"),
    WebWorkerControllerElement : require("bisweb_webworkercontroller.js"),
    DiffSPECTElement : require("bisweb_diffspectelement.js"),
    ConnectivityControlElement:    ConnectivityControlElement,
    LandmarkControlElement :     LandmarkControlElement,
    MosaicViewerElement :    MosaicViewerElement,
    OrthogonalViewerElement : OrthogonalViewerElement,
    PaintToolElement :    PaintToolElement,

    
};



let exportobj=require('bisweb_exportobject');
exportobj.webutil=webutil;
exportobj.webfileutil=webfileutil;
exportobj.Elements=Elements;


exportobj.setDarkMode=function(f) {
    webutil.setDarkMode(f);
};

exportobj.setAutoColorMode=function() {
    webutil.setAutoColorMode();
};


export default exportobj;

