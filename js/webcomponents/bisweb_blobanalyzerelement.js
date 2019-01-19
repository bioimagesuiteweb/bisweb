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

/* global setTimeout,HTMLElement */


"use strict";

const webutil=require('bis_webutil');
const webfileutil = require('bis_webfileutil');
const $=require('jquery');
const BisWebPanel = require('bisweb_panel.js');
const genericio=require('bis_genericio');



// -------------------------------------------------------------------------

/** 
 * A web element to create and manage a GUI for a Atlas Control
 * that draws landmarks in an {@link OrthogonalViewer} viewer.
 *  The GUI for this appears inside a {@link ViewerLayoutElement}.
 *
 *
 *
 * @example
 *  <bisweb-atlastoolelement
 *      bis-layoutwidgetid="#viewer_layout"
 *      bis-viewerid="#viewer">
 *  </bisweb-atlastoolelement>
 *
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in 
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 */
class BlobAnalyzerElement extends HTMLElement {


    constructor() {

        super();
        this.clusterInfo=null;
        this.imageinfo=null;
        this.funcParams= {
            minth : 0.0,
            maxth : 0.0,
            clustersize : 0,
            cmode : -1,
        };
        this.cnames = [ 'minth', 'maxth', 'clustersize' , 'cmode'];
        this.outputstring='';
    }

    cleanCache() {
        this.clusterInfo=null;
        this.outputstring='';
        this.parentDomElement.empty();
        this.parentDomElement.append($(`<div style="font-size:12px"><p>No Clusters to Examine. Please create
an overlay as follows:</p> <OL> <LI> Load the underlying anatomical
image using the menu option File | Load Image</LI> <LI> Load the
functional overlay using the menu option Overlay | Load Overlay</LI>
<LI> Cluster the functional overlay by setting the Cluster Size
parameter (found under "Overlay Color Mapping" in the "Viewer
Controls" tool on the far right of this window) to a value greater
than zero.</LI> </OL></div>`));

    }
    
    

    handleViewerImageChanged() {
        this.cleanCache();
    }

    
    /** called from parent */
    updatecmap(mastercontroller,input) {
        
        if (!input.functionalparams) {
            return;
        }

        let cmapc=this.orthoviewer.getColormapController();
        let clinfo=cmapc.getClusterInfoData();
        
        if (clinfo === null) {
            this.cleanCache();
            return;
        }

        if (this.clusterInfo!==null) {
            let issame=true,i=0;
            while (i<this.cnames.length && issame===true) {
                let mine=this.funcParams[this.cnames[i]];
                let theirs=input.functionalparams[this.cnames[i]] || -100000;
                if (Math.abs(mine-theirs)>0.001)
                    issame=false;
                else
                    i=i+1;
            }
            
            if (issame) {
                console.log(".... No change");
                return;
            }
        }

        for (let i=0;i<this.cnames.length;i++) {
            this.funcParams[this.cnames[i]]=input.functionalparams[this.cnames[i]];
        }

        this.clusterInfo=clinfo;
        
        if (!this.panel.isOpen())
            return;
        this.updateDisplay();
    }
    
    updateDisplay() {

        if (!this.clusterInfo) {
            this.cleanCache();
            return;
        }
        
        // Next item ...
        // Compute max-t value for each cluster
        
        let clustdata= this.clusterInfo.clusterimage.getImageData();
        let clusterhist= this.clusterInfo.clusterhist;
        let numc= this.clusterInfo.numclusters;
        
    
        let clusterinfo_i= new Array(numc+1);
        let clusterinfo_t= new Array(numc+1);
        for (let i=0;i<=numc;i++) {
            clusterinfo_t[i]=0.0;
            clusterinfo_i[i]=-1;
        }

        let diffdata=this.orthoviewer.getobjectmap().getImageData();
        let cmode=this.funcParams.cmode;

        let volsize=clustdata.length;
        // First compute max t-value (and it's location) for each cluster
        for (let i=0;i<volsize;i++) {
            let clusterno=Math.floor(clustdata[i]);
            let v1=diffdata[i];
            let v2=clusterinfo_t[clusterno];
            if (cmode===2) {
                v1=-v1;
                v2=-v2;
            } else if (cmode===3) {
                v1=Math.abs(v1);
                v2=Math.abs(v2);
            }
            if (v1>v2) {
                clusterinfo_t[clusterno]=diffdata[i];
                clusterinfo_i[clusterno]=i;
            }
        }
        
        let outputdata = [];
        let dim=this.clusterInfo.clusterimage.getDimensions();
        let slicesize=dim[0]*dim[1];
        let cthr=this.funcParams.clustersize;

        for (let i=1;i<=numc;i++) {
            let kSize = clusterhist[i];
            
            if (clusterinfo_i[i]>0 && kSize>=cthr) {
                let ka=Math.floor(clusterinfo_i[i]/ slicesize);
                let t=clusterinfo_i[i]-ka*slicesize;
                let ja=Math.floor(t /dim[0]);
                let ia=t % dim[0];

                let tval  = clusterinfo_t[i];
                let add=true;
                if ( (cmode===1 && tval<0) || (cmode===2 && tval>0) )
                    add=false;
                if (add) 
                    outputdata.push({
                        size   : kSize,
                        coords : [ ia,ja,ka ],
                        maxt : tval,
                    });
            }
        }
        
        outputdata.sort( (a, b) => {
            if (a.size < b.size)
                return 1;
            if (a.size > b.size)
                return -1;
            return 0;
        });

        this.updateTable(outputdata);
        
    }

    saveTextResults(fobj) {

        fobj=genericio.getFixedSaveFileName(fobj,"results.csv");
        genericio.write(fobj, this.outputstring).then((f) => {
            webutil.createAlert('Results saved in '+f);
        }).catch((e) => {
            webutil.createAlert('Failed to save results '+e,true);
        });

    }
    
    updateTable(outputdata) {

        const atlastoolid=this.getAttribute('bis-atlastoolid') || null;
        let atlascontrol=null,spa=null;
        if (atlastoolid)  {
            atlascontrol=document.querySelector(atlastoolid);
            spa=this.orthoviewer.getobjectmap().getSpacing();
        }
        
        this.parentDomElement.empty();
        let templates=webutil.getTemplates();
        let newid=webutil.createWithTemplate(templates.bisscrolltable,$('body'));
        let stable=$('#'+newid);
        this.table=stable;

        let des=this.orthoviewer.getobjectmap().getDescription();

        
        this.parentDomElement.append(stable);
        let thead = stable.find(".bisthead");
        let tbody = stable.find(".bistbody",stable);
        
        thead.empty();
        tbody.empty();
        tbody.css({'font-size':'12px',
                   'user-select': 'none'});
        thead.css({'font-size':'14px',
                   'user-select': 'none'});

        const self=this;

        this.parentDomElement.append($('<HR>'));
        this.parentDomElement.append($(`<p style="font-size:12px"> Image:${des}</p>`));
        this.parentDomElement.append($('<HR>'));
        webfileutil.createFileButton({ name : 'Save Table',
                                       parent : this.parentDomElement,
                                       type : "success",
                                       callback : (f) => { self.saveTextResults(f); },
                                       css : { 'position' : 'right' },
                                     },
                                     {
                                         title: 'Save ClusterAnalysis Results',
                                         save: true,
                                         filters : [ { name: 'CSV File', extensions: ['csv']}],
                                         suffix : "csv",
                                         initialCallback : () => {
                                             return "results.csv";
                                         }
                                     });
        


        

        thead.append($(`<tr>
                       <td width="5%">#</td>
                       <td width="45%">Coordinates of Peak</td>
                       <td width="20%">Size (voxels)</td>
                       <td width="30%">Value At Peak</td></tr>`));

        tbody.empty();

        this.outputstring=`,${des}\n#, ,Coordinates of Peak, , Size (voxels), Value at Peak\n`;
        
        let max=outputdata.length;
        if (max>25)
            max=25;

        let buttoncoords=[];

        let callback = (e) => {
            let id=e.target.id;
            if (!id) {
                id=e.target.parentElement.id;
                if (!id)
                    id=e.target.parentElement.parentElement.id;
            }
            let coordinate=buttoncoords[id];
            self.orthoviewer.setcoordinates([coordinate[0], coordinate[1], coordinate[2]]);
        };

        
        for (let i=0;i<max;i++) {

            let elem=outputdata[i];
            let nid=webutil.getuniqueid();

            let cstring=elem.coords.join(', ');
            let dstring='';
            if (atlascontrol) {
                let mm=[ 0, 0, 0];

                for (let i=0;i<=2;i++)
                    mm[i]=elem.coords[i]*spa[i];
                let results=atlascontrol.queryAtlas(mm);
                //                console.log(JSON.stringify(results.data,null,2));
                //console.log(results.data[0]);
                if (results.data[0].name==="MNI Coordinates") {
                    cstring=`MNI: ${results.data[0].desc}`;
                    dstring=results.data[0].desc;
                }
            }
            let w=$(`<tr>
                    <td width="5%">${i+1}</td>
                    <td width="45%"><span id="${nid}" class="btn-link">${cstring}</span></td>
                    <td width="20%">${elem.size}</td>
                    <td width="30%">${Number.parseFloat(elem.maxt).toFixed(3)}</td>
                    </tr>`);
            this.outputstring+=`${i+1},${dstring},${elem.size},${elem.maxt}\n`;

            tbody.append(w);
            $('#'+nid).click(callback);
            buttoncoords[nid]=elem.coords;
        }

        if (outputdata.length>max) {
            let w=$(`<tr>
                    <td width="5%"></td>
                    <td width="95%">${(outputdata.length-max)} smaller clusters not shown</td>
                    </tr>`);
            tbody.append(w);
        }
        
    }

    


    
    /** initialize (or reinitialize landmark control). Called from viewer when image changes. This actually creates (or recreates the GUI) as well.(This implements a function from the {@link BisMouseObserver} interface.)
     * @param {Bis_SubViewer} subviewers - subviewers to place info in
     * @param {BisImage} volume - new image
     */
    connectedCallback() {

        let viewerid=this.getAttribute('bis-viewerid');
        let layoutid=this.getAttribute('bis-layoutwidgetid');
        
        let layoutcontroller=document.querySelector(layoutid);
        this.panel=new BisWebPanel(layoutcontroller,
                                   {  name  : 'Cluster Analyzer',
                                      permanent : false,
                                      width : '290',
                                      dual : false,
                                      mode : 'sidebar',
                                   });
        this.parentDomElement=this.panel.getWidget();
        this.cleanCache();
        
        this.orthoviewer=document.querySelector(viewerid);
        this.orthoviewer.addColormapObserver(this);
        this.orthoviewer.addImageChangedObserver(this);
    }

    
    show() {
        this.panel.show();
        this.updateDisplay();
    }

    isOpen() {
        return this.panel.isOpen();
    }

}


module.exports=BlobAnalyzerElement;
webutil.defineElement('bisweb-blobanalyzerelement', BlobAnalyzerElement);


