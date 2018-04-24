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

const util=require('bis_util');
const bisweb_image = require('bisweb_image');
const bisbruker=require('bis_readbruker');
const webutil=require('bis_webutil');
const bisgenericio=require('bis_genericio');
const $=require('jquery');
const bootbox=require('bootbox');
const userPreferences = require('bisweb_userpreferences.js');
const path=bisgenericio.getpathmodule();
const fs=bisgenericio.getfsmodule();
const misac=require('../node/misac_util');

// -------------------------------------------------------------------------

/** 
 * A class to create and manage a GUI to import Paravision Images from a Directory. Electron Only!
 * This is access through the {@link ParavisionImportElement} component.
 * @constructs ParavisionImportElementInternal
 * @param {JQueryElement} parent -  element to put GUI in
 * @param {BisGUIOrthogonalViewer} viewer - parent viewer 
 */

/** 
 * A web (electron only) element to create and manage a GUI for importing and converting Bruker Paravision Files.
 * This is a wrapper around a {@link ParavisionImportElementInternal} object.
 *
 *
 * @example
 *   <bisweb-paravisionimportelement
 *    id="connimport"
 *    bis-layoutwidgetid="#viewer_layout"
 *    bis-viewerid="#viewer">
 *   </bisweb-paravisionimportelement>
 *
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in 
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 */

const imagelabels=['None','3DAnatomical','2DAnatomical','EPI','FieldMap','Angio','AngioAnatomical','DTI','DTIResult' ,'Computed' ];

class ParavisionImportElement extends HTMLElement {

    constructor() {
        super();

        this.internal = {
            
            // global stuff
            initialized : false,
            this : null,
            viewers  : [],
            table : null,
            buttonpairs : {},
            showdialog : null,
            joblist : [],
            lastfilename : '',
        };

        

    }

        /** actual GUI creation when main class is ready
     * The parent element is internal.parentDomElement
     * @alias ParavisionImportElementInternal~onDemandCreateGUI
     */
    onDemandCreateGUI() {

        const internal=this.internal;
        
        if (internal.parentDomElement===null)
            return;
        
        internal.showdialog=webutil.createdialog("Converted Images",600,500,100,50 );
        let widget=internal.showdialog.widget;
        widget.css({ "overflow-y" : "hidden"});
        let templates=webutil.getTemplates();

        
        
        
        internal.parentDomElement.empty();
        let basediv0=webutil.creatediv({ parent : internal.parentDomElement});
        let basediv1=webutil.creatediv({ parent : internal.parentDomElement});
        internal.domElement=basediv1;
        
        
        let newid=webutil.createWithTemplate(templates.bisscrolltable,
                                             widget);
        let stable=$('#'+newid);
        let t1 = $(".bistscroll",stable);
        let dim=internal.showdialog.getdimensions();
        console.log('dim=',dim);
        $(t1).css({
            height: `${dim.height-150}px`
        });
        
        
        let thead = $(".bisthead",stable);
        let tbody = $(".bistbody",stable);
        thead.empty();
        tbody.empty();
        tbody.css({'font-size':'12px',
                   'user-select': 'none'});
        thead.css({'font-size':'12px',
                   'user-select': 'none'});
        
        let hd=$('<tr>'+
                 ' <td width="9%">#</th>'+
                 ' <td width="70%">Image</th>'+
                 ' <td width="10%"></th>'+
                 ' <td width="10%"></th>'+
                 '</tr>');
        thead.append(hd);
        thead.css({ font: "Arial 12px"});
        internal.table=tbody;
        
        let hd2=$('<tr>'+
                  ' <td width="9%"></th>'+
                  ' <td width="70%">Nothing imported yet!</th>'+
                  ' <td width="10%"></th>'+
                  ' <td width="10%"></th>'+
                  '</tr>');
        tbody.append(hd2);

        const self=this;
        

        
        webutil.createbutton({ type : "info",
                               name : "Show Results",
                               tooltip : "Show Converted Images",
                               parent : basediv1,
                               css : { 'width' : '90%' , 'margin' : '3px' },
                               callback : function() {
                                   internal.showdialog.show();},
                             });
        
        webutil.createbutton({ type : "info",
                               name : "Compute Averages",
                               position : "danger",
                               parent : basediv1,
                               css : { 'width' : '90%' , 'margin' : '3px' },
                               callback : function() {
                                   self.computeAverageImages1();
                               }
                             });
        

	    webutil.createfilebutton({ type : "danger",
		                           name : 'Import Images from Paravision Study',
				                   parent : basediv0,
                                   css : { 'width' : '90%' , 'margin' : '3px' },
				                   callback : function(f) {
                                       self.importfiles(f);
                                   },
				                   accept : ".json",
				                 },{
                                     title: 'Directory to import study from',
                                     filters:  'DIRECTORY',
		                             save : false,
                                 });
        
        webutil.createfilebutton({ type : "default",
		                           name : 'Load Existing Job',
				                   parent : basediv0,
                                   css : { 'width' : '90%' , 'margin' : '3px' },
				                   callback : function(f) {
                                       self.importjob(f);
                                   },
				                   accept : "",
				                 },{
                                     title: 'Json formatted file',
                                     filters:  [ { name: 'JSON Files', extensions: ['json' ]}],
		                             title    : 'Select the file to load from',
		                             save : false,
                                 });
        
        
        webutil.createfilebutton({ type : "primary",
			                       name : "Save",
			                       parent : basediv0,
                                   css : { 'width' : '90%' , 'margin' : '3px' },
			                       callback : function(f) {
                                       self.savejob(f);
                                   }
                                 },{
                                     title: 'Json formatted file',
                                     filters:  [ { name: 'JSON Files', extensions: ['json' ]}],
		                             title    : 'Select the file to save to',
		                             save : true,
                                 });
        
    }

    // ------------------------------------------------------------------------
    // addTableRow
    // ------------------------------------------------------------------------
    
    addTableRow(name,fname,infoname,tagvalue=null) {


        const internal=this.internal;

        // button callback
        const buttonCallback=function(e) {


            console.log('Viewers = ',internal.viewers);
            let id=e.target.id;
            let arr=internal.buttonpairs[id];
            let fname=arr[0];
            let index=arr[1];
            
            let ext=fname.split('.').pop();
            if (ext==="gz") {
                const img=new bisweb_image();
                img.load(fname,false)
                    .then(function() {
                        webutil.createAlert('Image loaded from '+img.getDescription());
                        internal.viewers[index].setimage(img);
                    })
                    .catch( (e) => { webutil.createAlert(e,true); });
            } else {
                let info = fname+"\n"+fs.readFileSync(fname,'utf-8');
                let modal=webutil.createmodal("Imported File Properties","modal-lrg");
                let a2=$('<pre>'+info+'</pre>');
                modal.body.append(a2);
                modal.dialog.modal('show');
            }
        };


        // ------------------ Reminder

        let getDimensionsFromName=function(name) {
            let i=name.indexOf("(");
            let j=name.indexOf(")");
            if (i>0 && j>0) {
                let shortname=name.substr(i+1,j-i-1);
                let dim=shortname.split(',');
                for (let k=0;k<dim.length;k++)
                    dim[k]=parseInt(dim[k]);
                return dim;
            }
            return [0,0,0];
        }
            
        
        //const imagelabels=['None','3DAnatomical','2DAnatomical','EPI','FieldMap','Angio','AngioAnatomical','DTI','DTIResult'  ];
        if (!tagvalue) {
            if (name.indexOf("EPI")>0) {
                tagvalue="EPI";
            } else if (name.indexOf("FLASH")>0) {
                let dim=getDimensionsFromName(name);
                if (dim[0]>=200)
                    tagvalue="Angio";
                else
                    tagvalue="AngioAnatomical";
            } else if (name.indexOf("FieldMap")>0) {
                tagvalue="FieldMap";
            } else if (name.indexOf("MSME")>0) {
                let dim=getDimensionsFromName(name);
                if (dim[2]<0.5*dim[0])
                    tagvalue="2DAnatomical";
                else
                    tagvalue="3DAnatomical";
            } else {
                tagvalue="None";
            }
        }

        
        let details={ name  : name,
                      filename : path.basename(fname),
                      details : path.basename(infoname),
                      tag : tagvalue,
                    }
        
        internal.joblist.push(details);
        
        let keys=Object.keys(internal.buttonpairs);
        
        let counter=internal.joblist.length+1;
        let s1=(name);
        s1=s1.substr(0,5)+"...";
        let s2="|";
        try { 
            let stats = fs.statSync(fname);
            s2 = stats["size"];
        } catch(e) {
            
        }
        let nid0=webutil.getuniqueid();
        let nid1=webutil.getuniqueid();
        let nid2=webutil.getuniqueid();
        let nid3=webutil.getuniqueid();
        let w0=`<tr>
                <td width="5%">${counter}</td>
                <td width="70%">${name}</td>
                <td width="10%" id="${nid3}"></td>
                <td width="4%"><button type="button" class="btn-info btn-sm" style="padding: 0px, font-size: 10px"
                id="${nid0}">Show1</button></td>
                <td width="4%"><button type="button" class="btn-info btn-sm" style="padding: 0px, font-size: 10px"
                id="${nid1}">Show2</button></td>
                 <td width="6%"><button type="button" class="btn-success  btn-sm" style="padding: 1px, font-size: 10px" id="${nid2}">Info</button></td>
                </tr>`;

        internal.table.append($(w0));        
        let index=imagelabels.indexOf(tagvalue);
        if (index<0)
            index=0;
        
        let a=webutil.createselect(
            {
                parent : $('#'+nid3),
                values : imagelabels,
                index : index,
                callback : function(e) {
                    details.tag=imagelabels[e.target.value];
                }
            });

        let btn=$('#'+nid0);
        btn.click(buttonCallback);
        internal.buttonpairs[nid0]=[ fname, 0 ];

        btn=$('#'+nid1);
        btn.click(buttonCallback);
        internal.buttonpairs[nid1]=[ fname ,1 ];

        let btn2=$('#'+nid2);
        if (infoname.length>2) {
            btn2.click(buttonCallback);
            internal.buttonpairs[nid2]=infoname;
        } else {
            btn2.remove();
        }
    }
    
    /** import files
     * @param {String} fname - directory name to import files from
     * @param {String} outpath - directory name to store files in
     */
    internalimportfiles2(f,outpath) {

        const self=this;
        const internal=this.internal;
        
        webutil.createAlert("Importing files from "+f+"-->"+outpath);
        window.BISELECTRON.ipc.send('showconsole','');
        window.BISELECTRON.ipc.send('clearconsole','');
        internal.table.empty();
        internal.showdialog.show();
        internal.buttonpairs={};
        internal.joblist=[];

        let addT=function(name,fname,infoname) {
            self.addTableRow(name,fname,infoname);
        };

        let forceorient=userPreferences.getImageOrientationOnLoad();

        
        let out=bisbruker.readMultiple(f,outpath,forceorient,addT,false);
        let status=out[0];
        if (status===true)
            webutil.createAlert('Job saved in '+out[1]);
        else
            webutil.createAlert(out[1],true);
    }
    
    /** import files
     * @memberof ParavisionImportElementInternal.prototype
     * @param {String} fname - directory name to import files from
     */
    importfiles(f) {


        const internal=this.internal;
        
        if (!fs.lstatSync(f).isDirectory())
            f=path.dirname(path.normalize(f));
        
        let fnames=bisbruker.getMatchingFilenames(f).names;
        if (fnames.length<1) {
            webutil.createAlert("No matching files (2dseq) in "+f +" or its subdirectories",true);
            return;
        }
        
        let clb=function(fout) {
            internal.this.internalimportfiles2(f,fout);
        };
        
        webutil.electronFileCallback({filters : "DIRECTORY",
                                      title : "Select Directory to store output files",
                                     },clb);
        
    }
    
    /** import completed job
     * @param {String} fname - name of json file containing previous output of this tool
     */
    importjob(f) {

        const self=this;
        const internal=this.internal;
        let dirname=path.resolve(path.dirname(f));
            
        
        let loaderror = function(e) {
            webutil.createAlert('Failed to read job from' +f + " ("+e+")");
            return;
        };
            
        bisgenericio.readJSON(f,"ParavisionJob").then( (obj) => {
            obj=obj.data;
            let data=obj.job;
            self.internal.lastfilename=f;

            internal.buttonpairs=[];
            internal.joblist=[];
            let n=data.length;
            internal.showdialog.show();
            internal.table.empty();
            for (let ic=0;ic<n;ic++) {
                if (path.isAbsolute(data[ic].filename)) {
                    self.addTableRow(data[ic].name,
                                     data[ic].filename,
                                     data[ic].details,
                                     data[ic].tag,
                                    );
                } else {
                    self.addTableRow(data[ic].name,
                                     path.join(dirname,data[ic].filename),
                                     path.join(dirname,data[ic].details),
                                     data[ic].tag,
                                    );
                }
            }
        }).catch( (e) => {
            loaderror(e);
        });
    }

    savejob(f) {

        console.log('f=',f);
        let obj = {
            "bisformat" : 'ParavisionJob',
            "job" : this.internal.joblist
        };
        let out=JSON.stringify(obj,null,2);
        bisgenericio.write(f,out).then( () => {
            console.log('Saved job in',f);
        });
    }

    // -----------------------------------------------------------------------------------
    // Processing
    // -----------------------------------------------------------------------------------
    computeAverageImages(outdir) {

        console.log('Reading last=',this.internal.lastfilename,outdir);

        const self=this;
        
        misac.createAverageAnatomical(this.internal.joblist,path.join(path.dirname(this.internal.lastfilename),'result')).then( (results) => {

            let objlist=results.objlist;
            let outname=results.outnamelist;
            for (let i=0;i<=2;i++) {
                objlist[i].save(outname[i]);
                if (i<2)
                    self.addTableRow(results.names[i],outname[i],'','Computed');
            }
        });
    }
    
    computeAverageImages1() {

        if (this.internal.lastfilename) {
            return this.computeAverageImages(path.dirname(this.internal.lastfilename));
        }


        webutil.createAlert("No Job in Memory",true);
    }

    
    // -----------------------------------------------------------------------------------
    // Main Function effectively
    // ---------------------------------------
    connectedCallback() {
        
        let viewerid=this.getAttribute('bis-viewerid');
        let viewerid2=this.getAttribute('bis-viewerid2');
        let layoutid=this.getAttribute('bis-layoutwidgetid');

        this.internal.viewers = [
            document.querySelector(viewerid),
            document.querySelector(viewerid2)
        ];

        
        let layoutcontroller=document.querySelector(layoutid);
        let basegui=layoutcontroller.createToolWidget('Paravision Import',true);

        const self=this;
        
        this.internal.this=self;
        this.internal.parentDomElement=basegui;
        let basediv=$("<div>To appear...</div>");
        this.internal.parentDomElement.append(basediv);
        this.onDemandCreateGUI();
    }

}

webutil.defineElement('bisweb-paravisionimportelement', ParavisionImportElement);



