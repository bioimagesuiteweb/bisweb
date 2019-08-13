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

/*global window,document,setTimeout,HTMLElement */

"use strict";

const bis_webutil = require('bis_webutil.js');
const moduleIndex = require('moduleindex.js');
const Scatter = require('bisweb_scatterplot.js');

const connmatrixModule = moduleIndex.getModule('makeconnmatrixfile');

/**
 * 
 * @param {ViewerLayoutElement} layoutwidget 
 */
let cpmGuiManager = function(layoutwidget){
    let dims = [layoutwidget.viewerwidth / 3, layoutwidget.viewerheight / 3];
    let pos = [layoutwidget.viewerwidth * (1 / 3) , 10]
    let plot = new Scatter.scatterplot(layoutwidget, dims, pos);
};

class CPMElement extends HTMLElement {

    constructor() {
        super();
    }

    connectedCallback() {
        this.menubarid = this.getAttribute('bis-menubarid');
        this.layoutwidgetid = this.getAttribute('bis-layoutwidgetid');

        bis_webutil.runAfterAllLoaded( () => {
            let menubar = document.querySelector(this.menubarid).getMenuBar();
            this.createMenubarItems(menubar);

            let layoutwidget = document.querySelector(this.layoutwidgetid);
            this.guiManager = cpmGuiManager(layoutwidget);
        });

        
        
    }

    createMenubarItems(menubar) {
        let topmenu = bis_webutil.createTopMenuBarMenu('CPM', menubar);
        bis_webutil.createMenuItem(topmenu, 'Open Connectivity File Loader');

    }
}

bis_webutil.defineElement('bisweb-cpmelement', CPMElement);

