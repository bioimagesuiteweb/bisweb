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
let globalSidebarPanel=null;
let globalDockedPanels=[];
let maxGlobalDockedPanels=3;


/**
 * Non-Modal Panel Class
 */

class BisWebPanel {


    /** Creates a panel for the viewers
        * @param {LayoutController} layout controller - the viewer layoutcontroller
        * @param {Object} options - the options object
        * @param {String} options.name - the title string
        * @param {number} options.width - the width of the panel
        * @param {number} options.height - the height of the panel
        * @param {number} options.mode - the mode of the panel (one of "docked", "sidebar" )
        * @param {number} options.dual - if true , enable hopping from docked to sidebar
        */
       
    
    constructor(layoutcontroller=null,options={}) {

        this.previousPanel=null;

        this.layoutController=layoutcontroller;
        this.options = { };
        this.options.name =options.name || 'Tool';

        this.options.width=options.width || 400;
        this.options.height=options.height || 400;
        this.initialstate = options.mode || 'docked';
        this.options.dual = options.dual || false;
        this.options.hasfooter=options.hasfooter || false;

        this.widgetbase=webutil.creatediv({ css : { 
            'width' : `${this.options.width}px`,
            'max-height' : `${this.options.height}px`,
            'overflow-y': "auto"
        }});
                                              
        this.footer=webutil.creatediv({ css  : {
            'margin-bottom' : '5px',
            'margin-top' : '5px',
            'margin-left' : '2px',
            'margin-right' : '2px',
            'width' : '100%',
        }});
        
        this.widget=webutil.creatediv({ parent : this.widgetbase,
                                        css  : {
                                            'width' : '100%',
                                            'margin-top' : '0px',
                                            'margin-left' : '2px',
                                            'margin-right' : '2px',
                                            'margin-bottom' : '0px'
                                            
                                        }});
        this.header=null;
        this.titleNameBar=null;
        this.state="empty";
        this.dockWidget=null;
        this.dockWidgetHeader=null;
        this.backButton=null;
        this.dockToggleButton=null;
        this.sidebarToggleButton=null;
        this.closeButton=null;

        this.createElements();
    }

    /** is dialog visible 
     * @returns {Boolean} - true if visible (open)
     */
    isVisible() { return this.state !== "empty";}

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
            if (this.initialstate!=="sidebar") {
                this.addToDock();
            } else {
                console.log('adding to sidebar');
                this.addToSidebar(true);
            }
        } else {
            if (this.state!=="sidebar")
                this.addToDock();
            else
                this.addToSidebar(true);
        }
    }
    /** Hides the dialog and renables any drag and drop elements present */
    hide() {

        if (this.state==="sidebar") {
            this.setSidebarWidth(0);
            return;
        }
    }

    getDimensions() {
            return [ this.width, this.height];
    }


    createElements() {

        if (this.closeButton!==null)
            return;

        const self=this;
        this.closeButton=$(`<button type="button" class="bistoggle">&times;</button>`);
        this.closeButton.click( (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Hiding',self.state);
            self.hide();
        });

        if (this.initialstate === "docked" && this.options.dual===false) {
            console.log('No extra buttons');
            return;
        }
        
        this.dockToggleButton=$(`<button type="button" class="bistoggle"><span class="glyphicon glyphicon-pushpin"></span></button>`);


        
        this.dockToggleButton.click( (e) => {
            e.preventDefault();
            e.stopPropagation();
            self.remove();
            self.addToSidebar();
            self.setSidebarWidth(this.options.width+10);
        });

        this.sidebarToggleButton=$(`<button type="button" class="bistoggle"><span class="glyphicon glyphicon-resize-small"></span></button>`);
        this.sidebarToggleButton.click( (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Toggle callback',e,self.state);
            let w=self.layoutController.getextrabarwidth();
            console.log('In Side bar',w);
                
            if (w<100) {
                self.setSidebarWidth(self.options.width+10);
                self.sidebarToggleButton.empty();
                self.sidebarToggleButton.append(`<span class="glyphicon glyphicon-resize-small"></span>`);
            } else {
                self.setSidebarWidth(99);
                self.sidebarToggleButton.empty();
                self.sidebarToggleButton.append(`<span class="glyphicon glyphicon-resize-full"></span>`);
            }
            
            return false;
        });

        this.backButton=$(`<button type="button" class="bistoggle"><span class="glyphicon glyphicon-triangle-left"></span></button>`);
        this.backButton.click( (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('previous=',self.previousPanel);
            if (self.previousPanel) {
                self.previousPanel.addToSidebar();
                self.previousPanel.previousPanel=self;
            }
        });

        this.header=$('<div></div>');
        this.header.css({
            'background-color' : webutil.getactivecolor(),
        });
        let buttonbar=webutil.creatediv({
            parent : this.header,
            css  : {
                'margin-bottom' : '5px',
                'margin-top' : '5px',
                'margin-left' : '2px',
                'margin-right' : '10px',
                'height' : '30px',
                'width' : '${this.options.width-20}px',
            }});

        this.titleNameBar=webutil.creatediv({
            parent : this.header,
            css  : {
                'margin-bottom' : '5px',
                'margin-top' : '2px',
                'margin-left' :'5px',
                'font-size' : '17px',
                'font-weight' : '400',
                'margin-right' : '5px',
                'width' : '${this.options.width-20}px',
            }});
    

        buttonbar.append(this.closeButton);
        buttonbar.append(this.sidebarToggleButton);
        buttonbar.append(this.backButton);
        this.titleNameBar.append(`<H4>${this.options.name}</H4>`);

    }

    /** add dock abilities 
     * @param {LayoutController} layout controller to put the dialog in (in sidebar)
     * @param {Boolean} createarrowbutton -- if true create extra button for docking on the fly
     */
    addToDock(show=true) {

        if (this.state==="docked") {
            return webutil.activateCollapseElement(this.dockWidget);
        }

        if (this.state==="sidebar") {
            this.remove();
        } else if (globalDockedPanels.length===maxGlobalDockedPanels) {
            let toremove=globalDockedPanels.shift();
            toremove.remove();
        }

        if (this.dockWidget===null) {
            this.dockWidget=this.layoutController.createToolWidget(`${this.options.name}`);
            if (this.dockToggleButton) {
                let t = webutil.creatediv({ parent: this.dockWidget,
                                            css : { 'margin-bottom' : '5px',
                                                    'width' : '100%'
                                                  }
                                          });
                t.append(this.dockToggleButton);
            }
        }
        this.widget.css({'opacity' : '1.0'});
        this.dockWidget.append(this.widget);
        if (this.options.hasfooter) {
            this.dockWidget.append('<HR>');
            this.footer.css({'opacity' : '1.0'});
            this.dockWidget.append(this.footer);
        }
        this.state="docked";
        globalDockedPanels.push(this);
        if (show)
            webutil.activateCollapseElement(this.dockWidget);
        return true;
    }

    /** hidePlaced dialog */
    setSidebarWidth(wd) {

        this.layoutController.setextrabarwidth(wd);
        this.titleNameBar.empty();

        if (wd<100) {
            this.widget.css({'opacity' : '0.05' });
            this.header.css({'border-bottom' : '0px','background-color' : webutil.getpassivecolor()});
            this.closeButton.css({'opacity' : '005', 'font-size' : '1px' });
            this.backButton.css({'opacity' : '005', 'font-size' : '1px' });
            this.footer.css({'opacity' : '0.05'});
        } else {
            this.widget.css({'opacity' : '1.0'});
            this.titleNameBar.append(`<H4>${this.options.name}</H4>`);
            this.header.css({'border-bottom' : '1px','background-color' : webutil.getpassivecolor()});
            this.closeButton.css({'opacity' : '1.0', 'font-size' : '19px'  });
            this.backButton.css({'opacity' : '1.0', 'font-size' : '19px'  });
            this.footer.css({'opacity' : '1.0'});
        }
    }
    
    /** place the dialog inside the this.layoutController's extrabar
     * @param {Boolean} show - if true then show
     */
    addToSidebar(show=true) {

        if (this.state==="sidebar") {
            this.setSidebarWidth(this.options.width+10);
            return;
        }

        if (this.state==="docked")
            this.remove();


        if (globalSidebarPanel!==null) {
            console.log('In add to sidebar removing global');
            globalSidebarPanel.remove();
            this.previousPanel=globalSidebarPanel;
            globalSidebarPanel=null;

        }

        let elements=this.layoutController.getextraelements();
        elements.header.empty();

        
        elements.header.append(this.header);
        elements.widget.empty();
        elements.widget.append(this.widget);
        elements.footer.empty();
        
        if (this.options.hasfooter) {
            elements.footer.append(this.footer);
            elements.widget.attr('nofooter','0');
        } else {
            elements.widget.attr('nofooter','1');
        }
        this.state="sidebar";
        globalSidebarPanel=this;

        console.log('Global=',this.options.name,'global=',globalSidebarPanel,' prev=',this.previousPanel);
        
        if (show) {
            this.setSidebarWidth(this.options.width+10);
        }
        return true;
    }
    
    /** Call to move dialog GUI from dock back to dialog */
    remove() {

        if (this.state==="docked") {
            this.dockWidget.parent().parent().remove();
            this.dockWidget=null;
        } else if (this.state==="sidebar") {
            this.header.remove();
            this.widget.remove();
            this.footer.remove();
            this.layoutController.setextrabarwidth(0);
        }
        this.state="empty";
        return true;
    }

    static setMaxDockedPanels(n) {
        maxGlobalDockedPanels=n;
    }

    static getActivePanels() {
        console.log('globalDocked=',globalDockedPanels.join(' '));
        return globalDockedPanels;
    }

    
}

module.exports=BisWebPanel;
