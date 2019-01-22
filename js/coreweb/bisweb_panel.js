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

/* global  HTMLElement */
"use strict";

const $=require('jquery');
const webutil=require('bis_webutil');

/** Panels that are open are stored in the dock
 * If docked then the module is in the dock (for update purposes)
 */

let globalDockedPanels=[];
let permanentPanels=[];
let maxGlobalDockedPanels=4;
let globalSidebarPanel=null;

/**
 * Non-Modal Panel Class
 */

class BisWebPanel {


    /** Creates a panel for the viewers
     * @param {LayoutController} layout controller - the viewer layoutcontroller
     * @param {Object} options - the options object
     * @param {String} options.name - the title string
     * @param {number} options.width - the width of the panel
     * @param {number} options.mode - the mode of the panel (one of "docked", "sidebar" )
     * @param {number} options.dual - if true , enable hopping from docked to sidebar
     * @param {number} options.permanent - if true and in docked, this does not get count towards globalDockedPanels max limits
     */
    constructor(layoutcontroller=null,options={}) {

        this.layoutController=layoutcontroller;
        this.options = { };
        this.options.name =options.name || 'Tool';

        this.options.width= parseInt(options.width) || 300;
        this.options.initialstate = options.mode || 'docked';
        this.options.dual = options.dual || false;
        this.options.hasfooter=options.hasfooter || false;
        this.options.permanent=options.permanent || false;

        if (this.options.permanent) {
            this.options.dual=false;
            this.options.initialstate="docked";
        }
        
        this.footer=webutil.creatediv({ css  : {
            'padding-bottom' : '5px',
            'margin-top' : '20px',
            'margin-bottom' : '5px',
            'margin-left' : '2px',
            'margin-right' : '2px',
            'border-width' : '2 0 0 0',
            'padding-top'  : '10px',
            'width' : '100%',
        }, classname : 'biswebpanel' });


        this.widgetbase=webutil.creatediv({
            css  : {
                'width' : '99%',
                'padding-top' : '5px',
                'margin-left' : '2px',
                'margin-right' : '2px',
                'margin-bottom' : '5px',
            },
            classname : 'biswebpanel' 
        });
        
        this.widget=webutil.creatediv({
            parent : this.widgetbase,
        });
        
        this.header=null;
        this.minimalHeader=null;
        this.titleNameBar=null;
        this.state="empty";
        this.dockWidget=null;
        this.dockWidgetHeader=null;

        this.dockToggleButton=null;
        this.dockCloseButton=null;
        
        this.sidebarToggleButton=null;
        this.sidebarMinimizeButton=null;
        this.sidebarMaximizeButton=null;
        this.sidebarCloseButton=null;
        this.dummyWidget=$('<div></div>');
        this.createHeader();
    }

    /** returns the main body of the dialog
     * @returns {JQueryElement} 
     */
    getWidget() { return this.widget; }

    /** returns the footer of the dialog
     * @returns {JQueryElement} 
     */
    getFooter() { return this.footer; }


    /** Shows the dialog and disables any drag and drop elements while it is open */
    show() {

        if (this.state==="empty") {
            if (this.options.initialstate!=="sidebar") {
                this.addToDock();
            } else {
                this.addToSidebar();
            }
        } else {
            if (this.state!=="sidebar")
                this.addToDock();
            else
                this.addToSidebar();
        }
    }
    /** Hides the dialog and renables any drag and drop elements present */
    hide() {

        if (this.state==="sidebar") {
            this.drawInSidebarWithWidth(0);
            return;
        }
    }


    /** Check if it is open 
     * @returns true or false
     */
    isOpen() {
        
        if (this.state==="docked") {
            if (webutil.isCollapseElementOpen(this.dockWidget))
                return true;
        }
        
        if (this.state==="sidebar")
            return true;

        return false;
    }

    /** Demonstrate that the widget in in use (active)
     * @param {Boolean} flag -- if true make background active else passive 
     */
    
    makeActive(flag=true) {

        let w=this.widgetbase;
        
        if (flag) {
            w.addClass('biswebactive');
        } else {
            w.removeClass('biswebactive');
        }
    }

    
    createHeader() {

        if (this.sidebarCloseButton!==null)
            return;

        const self=this;

        if (this.options.initialstate==="sidebar" || this.options.dual) {
            this.sidebarCloseButton=$(`<button type="button" class="bistoggle"><span class="glyphicon glyphicon-remove-circle"></span></button>`);
            this.sidebarCloseButton.click( (e) => {
                e.preventDefault();
                e.stopPropagation();
                self.hide();
            });
        }

        if ( (this.options.initialstate==="docked" && !this.options.permanent) || (this.options.dual)) {
            this.dockCloseButton=$(`<button type="button" class="bistoggle"><span class="glyphicon glyphicon-remove-circle"></span></button>`);
            this.dockCloseButton.click( (e) => {
                e.preventDefault();
                e.stopPropagation();
                self.remove();
            });
        }


        if (this.options.initialstate === "docked" && this.options.dual===false) {
            return;
        }
        
        this.dockToggleButton=$(`<button type="button" class="bistoggle bisflip"><span class="glyphicon glyphicon-log-out"></span></button>`);
        
        this.dockToggleButton.click( (e) => {
            e.preventDefault();
            e.stopPropagation();
            self.remove();
            self.addToSidebar();
            self.drawInSidebarWithWidth(this.options.width+15);
            return false;
        });

        if (this.options.dual) {
            this.sidebarToggleButton=$(`<button type="button" class="bistoggle"><span class="glyphicon glyphicon-log-out"></span></button>`);
            this.sidebarToggleButton.click( (e) => {
                e.preventDefault();
                e.stopPropagation();
                self.addToDock();
                return false;
            });
        }


        this.sidebarMinimizeButton=$(`<button type="button" class="bistoggle"><span class="glyphicon glyphicon-resize-small"></span></button>`);
        this.sidebarMinimizeButton.click( (e) => {
            e.preventDefault();
            e.stopPropagation();
            self.drawInSidebarWithWidth(60);
            return false;
        });

        this.sidebarMaximizeButton=$(`<button type="button" class="bistoggle"><span class="glyphicon glyphicon-resize-full"></span></button>`);
        this.sidebarMaximizeButton.click( (e) => {
            e.preventDefault();
            e.stopPropagation();
            self.drawInSidebarWithWidth(self.options.width+15);
            return false;
        });

        this.header=$('<div></div>');
        if (this.options.name.length>10)
            this.header.css({'height' : '80px'});
        else
            this.header.css({'height' : '50px'});

        this.minimalHeader=$('<div></div>');
        this.header.addClass('biswebpanel2');

        let buttonbar=webutil.creatediv({
            parent : this.header,
            css  : {
                'margin-bottom' : '5px',
                'padding-top' : '5px',
                'margin-left' : '2px',
                'padding-right' : '2px',
            }});

        this.titleNameBar=webutil.creatediv({
            parent : this.header,
            css  : {
                'padding-bottom' : '5px',
                'padding-top' : '0px',
                'padding-left' :'5px',
            }});
        

        buttonbar.append(this.sidebarCloseButton);
        buttonbar.append(this.sidebarMinimizeButton);
        if (this.options.dual) {
            buttonbar.append(this.sidebarToggleButton);
        }

        this.minimalHeader.append(this.sidebarMaximizeButton);

        this.titleNameBar.append(`<H4 style="margin-top:0px;margin-left:5px;line-height:1.5">${this.options.name}</H4>`);

    }

    /** add dock abilities 
     * @param {LayoutController} layout controller to put the dialog in (in sidebar)
     * @param {Boolean} createarrowbutton -- if true create extra button for docking on the fly
     */
    addToDock() {

        if (this.state==="docked") {
            return webutil.activateCollapseElement(this.dockWidget);
        }

        if (this.state==="sidebar") {
            this.remove();
        }

        if (this.options.permanent===false) {
            while (globalDockedPanels.length>=maxGlobalDockedPanels) {
                let toremove=globalDockedPanels.shift();
                toremove.remove();
            }
        }

        if (this.dockWidget===null) {
            this.dockWidget=this.layoutController.createDockWidget(`${this.options.name}`);
            let t=this.dockWidget.parent().parent().find('.panel-heading');
            if (this.dockToggleButton) {
                this.dockToggleButton.css({'border' : '0px', 'font-size' : '17px'});
                t.prepend(this.dockToggleButton);
            }
            if (this.dockCloseButton) {
                this.dockCloseButton.css({'border' : '0px', 'font-size' : '17px'});
                t.prepend(this.dockCloseButton);
            }
         
        }
        this.widgetbase.css({'opacity' : '1.0'});
        this.dockWidget.append(this.widgetbase);
        if (this.options.hasfooter) {
            this.dockWidget.append('<HR>');
            this.footer.css({'opacity' : '1.0'});
            this.dockWidget.append(this.footer);
        }
        this.state="docked";
        if (!this.options.permanent)
            globalDockedPanels.push(this);
        else
            permanentPanels.push(this);
        
        webutil.activateCollapseElement(this.dockWidget);
        return true;
    }

    /** hidePlaced dialog */
    drawInSidebarWithWidth(wd) {

        this.layoutController.setsidebarwidth(wd);
        let elements=this.layoutController.getSidebarElements();
        
        if (wd<100 && this.state!=="empty") {

            this.dummyWidget.append(this.header);
            this.dummyWidget.append(this.footer);
            this.dummyWidget.append(this.widgetbase);
            if (wd>10)
                elements.header.append(this.minimalHeader);
            else
                this.dummyWidget.append(this.minimalHeader);
            this.state="empty";
            return;
        }

        if (this.state==="sidebar")
            return;
        
        this.dummyWidget.append(this.minimalHeader);

        elements.header.empty();
        elements.header.append(this.header);
        elements.widget.empty();
        elements.widget.append(this.widgetbase);
        if (this.options.hasfooter) {
            elements.widget.append('<HR>');
            elements.widget.append(this.footer);
        }
        this.state="sidebar";
    }
    
    /** place the dialog inside the this.layoutController's sidebar
     * @param {Boolean} show - if true then show
     */
    addToSidebar() {

        if (this.state==="sidebar") {
            this.drawInSidebarWithWidth(this.options.width+15);
            return;
        }

        if (this.state==="docked")
            this.remove();

        if (globalSidebarPanel)
            globalSidebarPanel.remove();
        
        globalSidebarPanel=this;
        this.drawInSidebarWithWidth(this.options.width+15);
        return true;
    }
    
    /** Call to move dialog GUI from dock back to dialog */
    remove() {

        if (this.state==="docked") {
            if (this.dockToggleButton)
                this.dummyWidget.append(this.dockToggleButton);
            if (this.dockCloseButton)
                this.dummyWidget.append(this.dockCloseButton);

            this.dummyWidget.append(this.widgetbase);
            this.dummyWidget.append(this.footer);
            this.dockWidget.parent().parent().remove();
            this.dockWidget=null;
        } else if (this.state==="sidebar") {
            this.drawInSidebarWithWidth(0);
            globalSidebarPanel=null;
        }

        let index=globalDockedPanels.indexOf(this);

        if (index>=0)
            globalDockedPanels.splice(index,1);

        this.state="empty";
        return true;
    }

    static setMaxDockedPanels(n) {
        maxGlobalDockedPanels=n;
    }

    static getActivePanels() {
        return globalDockedPanels.concat(permanentPanels);
    }

    
}

module.exports=BisWebPanel;
