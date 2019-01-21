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

/* global document */


"use strict";

const BisWebDataObjectCollection = require('bisweb_dataobjectcollection.js');
const BisWebLinearTransformation = require('bisweb_lineartransformation.js');
const webutil=require('bis_webutil');
const bisgenericio=require('bis_genericio');
const $=require('jquery');
const bootbox=require('bootbox');
const util = require('bis_util.js');
const numeric=require('numeric');
const webfileutil = require('bis_webfileutil');
const BisWebPanel = require('bisweb_panel.js');

/** 
 * A web element to create and manage a GUI for an Object Collection
 *
 * @example
 *  <bisweb-collectionelement
 *      bis-layoutwidgetid="#viewer_layout"
 *      bis-viewerid="#viewer">
 *  </bisweb-collectionelement>
 *
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in 
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 */
class CollectionElement extends HTMLElement {


    constructor() {

        super();
        this.dataCollection=new BisWebDataObjectCollection();
        this.panel=null;
        this.internal = { 
            initialized : false,
            parentDomElement : null,
            domElement : null,
            currentIndex  : -1,
            currentInfo : null,
            currentSelect : null,
            currentSelectParent : null,
            inlineForm : null,
        };

        this.counter=0;
    }

    createObjectTypeSpecificInfo(type) {

        if (type==="transform") {
            this.specific = {
                name : "Transformation",
                type : "transform",
                extensions : [ ".bisxform",".matr",".grd" ],
                title : "Transformation Manager"
            };
            this.dataCollection.addItem(new BisWebLinearTransformation(0),{ "name" : "0.identity" });
            this.counter=1;
            
        } else if (type==="matrix") {
            this.specific = {
                name : "Matrix",
                type : "matrix",
                extensions : [ ".bismatr" , ".matr" ],
                title : "Matrix Manager"
            };
        }
    }
    
    // -------------------------------------------------------------------------

    getItemIndexByName(name) {

        let num=this.dataCollection.getNumberOfItems();
        let i=0,index=-1;
        while (i<num && index<0) {
            let objname=this.dataCollection.getItemMetaData(i).name || "";
            if (name === objname) {
                index=i;
            }
            i=i+1;
        }
        return index;
    }
    

    /** Get Current item -- the ful database item with data and metadata */
    getCurrentItem() {
        this.dataCollection.getItem(this.internal.currentIndex);
        return this.dataCollection.getItem(this.internal.currentIndex);
    }

    /**
     * @returns {BisWebDataObject} - the object inside the current item 
     */
    getCurrentObject() {
        return this.dataCollection.getItemData(this.internal.currentIndex);
    }

    /** Rename Current object -- pops up a dialog to ask user for a new name */
    renameCurrentItem() {

        if (this.internal.currentIndex===0) {
            bootbox.alert('The first item may not be changed.');
            return;
        }
        
        
        let obj=this.getCurrentItem();
        if (!obj)
            return false;
        
        let name = obj.metadata.name || `Item${this.internal.currentIndex+1}`;
        let index=name.indexOf(".");
        if (index>0)
            name=name.substr(index+1,name.length);

        
        const self=this;
        bootbox.prompt({
            title: "Enter new name for object",
            value: name,
            callback: function(result) {
                if (result !== null) {
                    obj.metadata.name = `${self.counter}.${result}`;
                    obj.data.setFilename(result);
                    self.counter=self.counter+1;
                    self.updateGUI();
                }
            }
        });
        return false;
    }


    /** Rename Current object -- pops up a dialog to ask user for a new name */
    invertCurrentItem() {

        let item=this.getCurrentItem();
        if (!item)
            return false;

        let obj=item.data;
        
        if (obj.constructor.name!=="BisWebLinearTransformation") {
            bootbox.alert('Invert only works on linear transformations for now');
            return;
        }

        let minv=numeric.inv(obj.getMatrix());
        obj.setMatrix(minv);

        let fname=obj.getFilename() || 'matrix.matr';
        let rindex=name.lastIndexOf(".");
        fname=fname.substr(0,rindex-1) || 'matrix';
        fname+='_inverse.matr';

        item.metadata.name = `${this.counter}.${fname}`;
        obj.setFilename(fname);
        this.counter=this.counter+1;
        this.updateGUI();
    }

    /** Delete Current object -- no dialog as undo can fix this */
    deleteCurrentItem() {

        let num=this.dataCollection.getNumberOfItems();
        if ( num<2) {
            bootbox.alert('The only ' + this.specific.name.toLowerCase()+ ' may not be deleted.');
            return;
        }

        let obj=this.getCurrentItem();
        if (!obj)
            return false;
        let name = obj.metadata.name || `Item${this.internal.currentIndex+1}`;

        const self=this;
        
        bootbox.confirm("Are you sure you want to delete the current transformation ("+name+")", ( (result) => {
            if (result)  {
                self.dataCollection.removeItem(this.internal.currentIndex);
                self.updateGUI();
            }
            return;
        }));
        
        return false;
    }

    /** Get the initial filename to save to (for use in the File|Save dialog)
        @return {string} - the initial filename
    */
    getInitialFilename()  {
        let obj=this.getCurrentObject();
        return obj.getFilename();
    }
    
    /** Save Item. */
    saveCurrentItem(fobj) {

        let obj=this.getCurrentObject();
        if (!obj)
            return;

        fobj=bisgenericio.getFixedSaveFileName(fobj,obj.getFilename());
        obj.setFilename(fobj);
        
        let txt=obj.serializeToText(obj.getFilename());
        bisgenericio.write(fobj,txt);
        return false;
    }

    /** addItem
     *@param {BisWebDataObject} obj - the object to add
     *@param {string} name - the name of the object
     */
    addItem(obj,name=null) {
        name =name || obj.getFilename();
        this.dataCollection.addItem(obj,{ name : `${this.counter}.${name}`});
        this.counter=this.counter+1;
        this.updateGUI(true);
    }

    
    /** addItemFromFile
     * @param {string} filename - filename
     */
    addItemFromFile(file) {
        
        const self=this;
        BisWebDataObjectCollection.loadObject(file,self.specific.type).then( (obj) => {
            if (obj) {
                self.addItem(obj, `${self.counter}.${obj.getFilename()}`);
            } else {
                let fname=bisgenericio.getFixedLoadFileName(file);
                webutil.createAlert('Failed to load '+self.specific.type+' from '+fname+' ',true);
            } 
        }).catch( (e) => {
            if (file.name)
                file=file.name;
            let ext =  file.split('.').pop();
            if (ext==='matr')
                webutil.createAlert('Failed to load '+self.specific.type+' from '+file+'. This is probably a general (non 4x4) matrix file.',true);
            else
                webutil.createAlert(e,true);
        });
        return false;
    }

    /** Set Current object set.
     * @param {number} ind - index of set to use as current
     */
    setCurrentItem(ind,force=false) {

        let num=this.dataCollection.getNumberOfItems();
        ind=util.range(ind||0,0,num);
        if (ind==this.internal.currentIndex && !force)
            return;
        
        this.internal.currentIndex=ind;
        this.internal.currentInfo.empty();
        let obj=this.dataCollection.getItemData(this.internal.currentIndex);
        let name=this.dataCollection.getItemMetaData(this.internal.currentIndex).name;
        if (name.length>20)
            name=name.substr(0,19)+'...';
        this.internal.currentInfo.append(obj.getDetailedDescription(name));
    }
    
    /** update the current GUI */
    updateGUI(selectlast=false) {

        const self=this;

        if (this.internal.currentSelect)
            this.internal.currentSelect.remove();

        let num=this.dataCollection.getNumberOfItems();
        if (num<1) {
            this.internal.currentIndex=-1;
            return;
        }
        
        if (this.internal.currentIndex>=num)
            selectlast=true;
        
        let data=[];
        let current=this.internal.currentIndex || 0;
        if (selectlast) {
            current=num-1;
        }
        
        for (let i=0;i<num;i++)  {

            let nm=this.dataCollection.getItemMetaData(i).name || `${i+1}.${this.specific.name}`;
            data.push(nm);
        }

        if (this.internal.currentSelectParent===null) {
            let elem1=webutil.creatediv({ parent : this.internal.inlineForm,  css : {'margin-top':'3px', 'margin-left':'10px'}});
            let elem1_label=$("<span>Current: </span>");
            elem1_label.css({'padding':'5px'});
            elem1.append(elem1_label);
            this.internal.currentSelectParent=elem1;
        }

        this.internal.currentSelect=webutil.createselect(
            {
                parent : this.internal.currentSelectParent,
                values : data,
                index : current,
                tooltip :
                "Select the current "+this.specific.name,
                callback : function(e) {
                    self.setCurrentItem(e.target.value);
                }
            });

        this.setCurrentItem(current,true);
    }

    // -------------------------------------------------------------------------------------------
    // create GUI
    // -------------------------------------------------------------------------------------------
    /** actual GUI creation when main class is ready
     * The parent element is this.internal.parentDomElement
     */
    createGUI(elementtype) {
        
        if (this.internal.parentDomElement===null)
            return;

        const self=this;
        this.internal.parentDomElement.empty();
        let basediv=webutil.creatediv({ parent : this.internal.parentDomElement,
                                        css : {
                                            'width' : '100%',
                                        },
                                        'classname' : 'biswebpanel'
                                      });

        this.internal.domElement=basediv;
        
        // --------------------------------------------
        let sbar=webutil.creatediv({ parent: basediv});
        this.internal.inlineForm=webutil.creatediv({ parent: sbar});
        
        const console_html=`<div class="biswebelement" style="margin:5px; margin-top:10px; overflow: auto; position:relative; width:95%; height:97%;"></div>`;

        this.internal.currentInfo=$(console_html);
        sbar.append(this.internal.currentInfo);
        this.internal.currentInfo.append("No "+this.specific.name+" in memory.");

        let itembar=webutil.createbuttonbar({ parent :basediv,  css : {"margin-top":"10px"}});


        webfileutil.createFileButton({ type : "warning",
                                       name : "Add",
                                       position : "bottom",
                                       tooltip : "Click this to add a new "+self.specific.name,
                                       parent : itembar,
                                       callback : function(f) { self.addItemFromFile(f); },
                                     },{
                                         filename : '',
                                         title    : 'Select file to add a new '+self.specific.name+' from',
                                         filters  : [ { name: self.specific.name+' Files', extensions: self.specific.extensions }],
                                         save : false,
                                         suffix : self.specific.extensions.join(','),
                                     });

        
        
        webfileutil.createFileButton({ type : "primary",
                                       name : "Save",
                                       position : "bottom",
                                       parent : itembar,
                                       callback : function(f) {
                                           self.saveCurrentItem(f);
                                       },
                                     },{
                                         filename : '',
                                         title    : 'Select file to add a new '+self.specific.name+' from',
                                         filters  : [ { name: self.specific.name+' Files', extensions: self.specific.extensions }],
                                         save : true,
                                         suffix : self.specific.extensions.join(','),
                                         initialCallback : () => {
                                             return self.getInitialFilename();
                                         }
                                     });
        

        
        webutil.createbutton({ type : "danger",
                               name : "Delete",
                               position : "bottom",
                               tooltip : "Click this to delete the current object",
                               parent : itembar,
                               callback : function() {
                                   self.deleteCurrentItem(); },
                             });
        
        webutil.createbutton({ type : "primary",
                               name : "Rename",
                               position : "right",
                               tooltip : "Click this to rename the current object",
                               parent : itembar,
                               callback : function() { self.renameCurrentItem(); },
                             });

        if (elementtype==="transform") {
            webutil.createbutton({ type : "danger",
                                   name : "Invert",
                                   position : "right",
                                   tooltip : "Invert the current transform",
                                   parent : itembar,
                                   callback : function() { self.invertCurrentItem(); },
                                 });
        }
        
        //        webutil.createDropdownMenu(' ',itembar);
        
        /*  webutil.createbutton({ type : "danger",
            name : "Delete All",
            position : "left",
            tooltip : "Click this to delete all objects in this set",
            parent : bbar0,
            callback : clear_cb,
            });*/
    }
    
    // -------------------------------------------------------------------------
    
    /** initialize (or reinitialize object control). Called from viewer when image changes. This actually creates (or recreates the GUI) as well.(This implements a function from the {@link BisMouseObserver} interface.)
     */
    connectedCallback() {

        let elementtype=this.getAttribute('bis-elementtype') || 'matrix';

        this.createObjectTypeSpecificInfo(elementtype);
        this.internal.parentDomElement=$('<div></div>');
        this.createGUI(elementtype);
        if (this.dataCollection.getNumberOfItems()>0)
            this.updateGUI(true);

    }

    show() {

        if (!this.panel) {
            let layoutid=this.getAttribute('bis-layoutwidgetid');
            let layoutcontroller=document.querySelector(layoutid);
            this.panel=new BisWebPanel(layoutcontroller,{
                name : this.specific.title,
                width : 320,
                height : 400,
                hasfooter : false,
                mode : 'docked',
                dual : 'true',
            });
            this.panel.getWidget().append(this.internal.parentDomElement);
        }

        this.panel.show();
    }

        
}

module.exports=CollectionElement;
webutil.defineElement('bisweb-collectionelement', CollectionElement);


