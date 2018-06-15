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
        * @param {number} options.mode - the mode of the panel (one of "docked", "sidebar", "docksidebar"  )
        */
       
    
    constructor(layoutcontroller=null,options={}) {

        this.previousSidebarPanel=null;

        this.layoutController=layoutcontroller;
        this.options = { };
        this.options.name =options.name || 'Tool';
        this.options.width=options.width || 400;
        this.options.height=options.height || 400;
        this.mode = options.mode || 'docked';
        this.options.hasfooter=options.hasfooter || false;

        this.widgetbase=webutil.creatediv({ css : { 
            'width' : `${this.options.width}px`,
            'max-height' : `${this.options.height}px`,
            'overflow-y': "auto"
        }});
                                              
        this.header=webutil.creatediv({ css  : {
            'width' : '100%',
            'height' : '80px',
            'margin-bottom' : '10px',
            'margin-top' : '0px',
            'margin-left' : '2px',
            'margin-right' : '2px',
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

        this.headerTitle=$(`<H4>${this.options.name}</H4>`);
        this.state="hidden";
        this.dockWidget=null;
        this.dockWidgetHeader=null;
        this.backButton=null;
        this.minimizeButton=null;
        this.closeButton=null;

        this.createElements();

        console.log('this.mode=',this.mode);
        
        if (this.mode === "sidebar" ) {
            console.log('adding sidebar=',this.mode);
            this.addToSidebar();
        } else {
            console.log('adding dock=',this.mode);
            this.addToDock();
        }
    }

    /** is dialog visible 
     * @returns {Boolean} - true if visible (open)
     */
    isVisible() { return this.state !== "hidden";}

    /** returns the main body of the dialog
     * @returns {JQueryElement} 
     */
    getWidget() { return this.widget; }

    /** returns the header of the dialog
     * @returns {JQueryElement} 
     */
    getHeader() { return this.header; }

    /** returns the footer of the dialog
     * @returns {JQueryElement} 
     */
    getFooter() { return this.footer; }


    /** Shows the dialog and disables any drag and drop elements while it is open */
    show() {

        console.log('this.mode=',this.mode);
        
        if (this.mode==="docked") {            
            return webutil.activateCollapseElement(this.dockWidget);
        }

        if (this.mode==="sidebar") {
            if (globalSidebarPanel!==this) 
                this.addPanelToSidebar(true);
            this.setSidebarWidth(this.dimensions.width+10);
        }
    }

    /** Hides the dialog and renables any drag and drop elements present */
    hide() {

        if (this.mode==="sidebar") {
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
            self.hide();
        });

        if (this.mode === "docked") {
            return;
        }
        
        this.minimizeButton=$(`<button type="button" class="bistoggle"><span class="glyphicon glyphicon-pushpin"></span></button>`);
        this.backButton=$(`<button type="button" class="bistoggle"><span class="glyphicon glyphicon-triangle-left"></span></button>`);
        
        this.minimizeButton.click( (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (self.state==="docked") {
                this.remove();
                this.addToSidebar();
                this.setSidebarWidth(this.dimensions.width+10);
                self.minimizeButton.empty();
                self.minimizeButton.append(`<span class="glyphicon glyphicon-resize-small"></span>`);
            } else if (self.state==="sidebar") {
                if (this.layoutController.getextrabarwidth()<=100) {
                    this.setSidebarWidth(this.dimensions.width+10);
                    self.minimizeButton.empty();
                    self.minimizeButton.append(`<span class="glyphicon glyphicon-resize-small"></span>`);
                } else {
                    this.setSidebarWidth(99);
                    self.minimizeButton.empty();
                    self.minimizeButton.append(`<span class="glyphicon glyphicon-resize-full"></span>`);
                }
                
            }
            return false;
        });


        this.backButton.click( (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.previousSidebarPanel!==null) {
                this.previousPlacedPanel.addToSidebar();
            }
        });
    }

    /** add dock abilities 
     * @param {LayoutController} layout controller to put the dialog in (in sidebar)
     * @param {Boolean} createarrowbutton -- if true create extra button for docking on the fly
     */
    addToDock(show=true) {

        console.log('adding to dock state=',this.state);
        
        if (this.state==="docked") {
            this.show();
            return;
        }

        if (this.state==="sidebar")
            this.removeFromSidebar();

        if (globalDockedPanels.length===maxGlobalDockedPanels) {
            let toremove=globalDockedPanels.shift();
            toremove.remove();
        }


        if (this.dockWidget===null) {
            this.dockWidget=this.layoutController.createToolWidget(`${this.options.name}`);
            if (this.minimizeButton) {
                let t = webutil.creatediv({ parent: this.dockWidget,
                                            css : { 'margin-bottom' : '5px',
                                                    'width' : '100%'
                                                  }
                                          });
                let but=this.minimizeButton;
                but.empty();
                but.append(`<span class="glyphicon glyphicon-pushpin"></span>`);
                t.append(but);
            }
        }
        this.widget.css({'opacity' : '1.0'});
        this.dockWidget.append(this.widget);
        if (this.options.hasfooter) {
            this.dockWidget.append('<HR>');
            this.footer.css({'opacity' : '1.0'});
            this.dockWidget.append(this.footer);
        }
        this.docked=true;
        console.log('Adding',this.options.name,'to globalDockedPanels');
        globalDockedPanels.push(this);
        if (show)
            this.show();
        return true;
    }

    /** hidePlaced dialog */
    setSidebarWidth(wd) {

        this.layoutController.setextrabarwidth(wd);
        
        if (wd<100) {
            this.widget.css({'opacity' : '0.05' });
            this.headerTitle.text('');
            this.header.css({'border-bottom' : '0px','background-color' : webutil.getpassivecolor()});
            this.headerTitle.css({'opacity' : '0.05' });
            this.closeButton.css({'opacity' : '005', 'font-size' : '1px' });
            this.backButton.css({'opacity' : '005', 'font-size' : '1px' });
            this.footer.css({'opacity' : '0.05'});
        } else {
            this.widget.css({'opacity' : '1.0'});
            this.headerTitle.text(this.options.name);
            this.header.css({'border-bottom' : '1px','background-color' : webutil.getpassivecolor()});
            this.headerTitle.css({'opacity' : '1.0' });
            this.closeButton.css({'opacity' : '1.0', 'font-size' : '19px'  });
            this.backButton.css({'opacity' : '1.0', 'font-size' : '19px'  });
            this.footer.css({'opacity' : '1.0'});
        }
    }
    
    /** place the dialog inside the this.layoutController's extrabar
     * @param {Boolean} show - if true then show
     */
    addToSidebar(show=true) {
        
        if (this.mode==="sidebar") {
            this.show();
            return;
        }

        if (this.mode==="docked")
            this.remove();


        if (globalSidebarPanel!==null) {
            globalSidebarPanel.remove();
            this.previousPlacedPanel=globalSidebarPanel;
            globalSidebarPanel=null;

        }
        
        let elements=this.layoutController.getextraelements();
        elements.header.empty();

        this.header.empty();
        this.header.append(this.closeButton);
        this.header.append(this.minimizeButton);
        this.header.append(this.backButton);
        this.header.append(this.headerTitle);
        
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

        let but=this.minimizeButton;
        but.empty();
        but.append(`<span class="glyphicon glyphicon-resize-small"></span>`);
        
        if (show) {
            window.dispatchEvent(new Event('resize'));
            this.show();
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
        this.state="hidden";
        return;
    }

    static setMaxDockedPanels(n) {
        maxGlobalDockedPanels=n;
    }

    static getActivePanels() {
        return [ globalSidebarPanel].concat(globalDockedPanels);
    }

    
}

module.exports=BisWebPanel;
