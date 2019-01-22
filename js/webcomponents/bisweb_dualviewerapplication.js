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

const webutil = require('bis_webutil');
const $ = require('jquery');
const ViewerApplicationElement = require('bisweb_mainviewerapplication');

/**
 * A Application Level Element that creates a Dual Viewer Application using two underlying viewer elements.
 *
 * @example
 *
 * <bisweb-dualviewerapplication
 *    bis-tabset="#viewers"
 *    bis-tab1="#tab1"
 *    bis-tab2="#tab2"
 *    bis-menubarid="#viewer_menubar"
 *    bis-viewerid1="#viewer1"
 *    bis-viewerid2="#viewer2">
 * </bisweb-dualviewerapplication>
 *
 *
 * Attributes
 *     bis-menubarid : theid a <bisweb-topmenubar> element
 *     bis-tabset    : the id of the tabset element that contains two divs in which the two viewers live (optional)
 *     bis-tab1  : the id of the 1st tabset element
 *     bis-tab2  : the id of the 2nd tabset element
 *     bis-viewerid1 : the id of the first <bisweb-orthogonalviewer> or <bisweb-mosaicviewer> element
 *     bis-viewerid2 : the id of the second <bisweb-orthogonalviewer> or <bisweb-mosaicviewer> element
 */
class DualViewerApplicationElement extends ViewerApplicationElement {


    getElementState(storeImages=false) {

        let obj=super.getElementState(storeImages);
        obj.activeViewer=this.getVisibleTab();
        return obj;
    }

    setElementState(dt=null,name="") {

        if (dt===null)
            return;

        this.setVisibleTab(dt.activeViewer || 1);
        super.setElementState(dt,name);
    }


    connectedCallback() {

        this.syncmode = true;
        super.connectedCallback();
        this.VIEWERS[0].addImageChangedObserver(this.VIEWERS[1]);

        this.VIEWERS[0].addColormapObserver(this.VIEWERS[1]);
        this.VIEWERS[1].addColormapObserver(this.VIEWERS[0]);

        this.VIEWERS[0].addFrameChangedObserver(this.VIEWERS[1]);
        this.VIEWERS[1].addFrameChangedObserver(this.VIEWERS[0]);


        const self = this;
        let tabset = this.getAttribute('bis-tabset') || null;
        if (tabset !== null) {
            let tab1link = this.getAttribute('bis-tab1');
            let tab2link = this.getAttribute('bis-tab2');
            this.tab1name = tabset + ' a[href="' + tab1link + '"]';
            this.tab2name = tabset + ' a[href="' + tab2link + '"]';
            $(this.tab1name).tab('show');
            $(this.tab1name).on('shown.bs.tab', () => self.VIEWERS[0].handleresize());
            $(this.tab2name).on('shown.bs.tab', () => self.VIEWERS[1].handleresize());
        }

        setTimeout( () => {
            this.getElementState(false);
        },300);
    }
}

webutil.defineElement('bisweb-dualviewerapplication', DualViewerApplicationElement);
module.exports=DualViewerApplicationElement;

