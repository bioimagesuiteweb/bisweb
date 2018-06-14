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

/** Only one modules can be open at a time. This is stored in globalOpenDialog
 */
let globalOpenDialog=null;


/** Dialogs that are open are stored in the dock
 * If docked then the module is in the dock (for update purposes)
 */
let globalDockedDialogs=[];
let maxGlobalDockedDialogs=3;


/**
 * Non-Modal Dialog Class
 */

class BisWebDialogElement extends HTMLElement {

    constructor() {
        super();
        this.name="";
        this.closecallback=null;
        this.dialog=null;
        this.docked=false;
        this.placed=false;
        this.placedparent=null;
        this.widget=null;
        this.header=null;
        this.footer=null;
        this.visible=false;
        this.dimensions = {
            width : 100,
            height : 100,
            left : 10,
            top : 10,
        };

        this.mousedata= {
            moving: false,
            left : 0,
            top : 0,
            width : 100,
            height : 100,
            leftoffset : 0,
            topoffset : 0,
            firstmove : false,
        };

        this.docked=false;
        this.layoutController=null;
        this.dockWidget=null;
    }

    /** is dialog visible 
     * @returns {Boolean} - true if visible (open)
     */
    
    isVisible() { return this.visible;}

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

    /** returns the inner content of the dialog (main div that contains header,widget,footer);
     * @returns {JQueryElement} 
     */
    getContent() { return this.content; }
    
    /** sets a function to call when the dialog is closed
     * @param {function} clb - the function to call 
     */
    setCloseCallback(fn) { this.closecallback=fn;}

    /** remove the default close button at the bottom of the dialog  */
    removeCloseButton() { this.close.remove(); }


    /** Internal callback for mouseevents
     * @param{number} state - the state 0=press,1=move, 2=release
     * @param{Event} e - the mouse event
     */
    mouseCallback(state, e) {

        if (state === 0) {

            let arr=this.dialog.css(['left','top','width','height' ]);

            Object.keys(arr).forEach((key) => {
                arr[key]=parseFloat(arr[key].replace(/px/g,''));
            });
            
            this.mousedata.left= arr['left'];
            this.mousedata.top=arr['top'];
            this.mousedata.width=arr['width'];
            this.mousedata.height=arr['height'];
            this.mousedata.leftoffset=e.screenX-arr['left'];
            this.mousedata.topoffset=e.screenY-arr['top'];
            this.mousedata.moving=true;
            this.mousedata.firstmove=true;
            this.header.css({ 'background-color': webutil.getactivecolor() });
            return;
        }

        if (!this.mousedata.moving)
            return;
        
        if (state === 2)  {
            this.mousedata.moving = false;
            this.header.css({ 'background-color': webutil.getpassivecolor() });
            return;
        }


        
        if (state == 1) {
            let posx = e.screenX - this.mousedata.leftoffset;
            let posy = e.screenY - this.mousedata.topoffset;
            let oldposx=posx,oldposy=posy;
            if (posx < 2) 
                posx = 2;
            else if (posx > (window.innerWidth - (this.mousedata.width+2)))
                posx = window.innerWidth - (this.mousedata.width+2);

            if (posy < 45)
                posy = 45;
            else if (posy > (window.innerHeight - (this.mousedata.height+90)))
                posy = window.innerHeight - (this.mousedata.height+90);

            this.dialog.css({
                left: `${posx}px`,
                top: `${posy}px`
            });

            if (posx!==oldposx || posy!==oldposy) {
                if (!this.mousedata.firstmove)
                    this.mousedata.moving=false;
                this.header.css({ 'background-color': webutil.getpassivecolor() });
            }

            this.mousedata.firstmove=false;

        }
    }

    /** Removes mouse events -- called when window is closed */
    unbindMouseEvents() {
        this.header.mousedown();
        this.header.mousemove();
        this.header.mouseup();
        this.header.mouseleave();
        this.footer.mousedown();
        this.footer.mousemove();
        this.footer.mouseup();
        this.footer.mouseleave();
    }

    /** Binds mouse events -- called when window is opened */
    bindMouseEvents() {
        const self=this;
        
        this.header.mousedown( ((fe) => { self.mouseCallback(0,fe); }));
        this.header.mousemove( ((fe) => { self.mouseCallback(1,fe); }));
        this.header.mouseup(   ((fe) => { self.mouseCallback(2,fe); }));
        this.header.mouseleave(((fe) => { self.mouseCallback(2,fe); }));
        this.footer.mousedown( ((fe) => { self.mouseCallback(0,fe); }));
        this.footer.mousemove( ((fe) => { self.mouseCallback(1,fe); }));
        this.footer.mouseup(   ((fe) => { self.mouseCallback(2,fe); }));
        this.footer.mouseleave(((fe) => { self.mouseCallback(2,fe); }));
    }

    /** Shows the dialog and disables any drag and drop elements while it is open */
    show() {

        if (this.dialog===null)
            return;
        
        if (this.docked === true || this.placed===true) {
            return this.showDockedDialog();
        }

        
        let previous=null;
        if (globalOpenDialog!==null)  {
            previous=globalOpenDialog.dialog.dialog.css(['left','top']);
            globalOpenDialog.hideDialog();
        }

        if (previous!==null) {
            this.dialog.css({'left' : previous.left,
                             'top'  : previous.top
                            });
        } else {
            let w=window.innerWidth;
            let arr=this.dialog.css(['width','height' ]);
            Object.keys(arr).forEach((key) => {
                arr[key]=parseFloat(arr[key].replace(/px/g,''));
            });
            
            let left=w-arr['width']-320;
            if (left<10)
                left=10;
            let l=`${left}px`;
            let top=60;
            let t=`${top}px`;
            this.dialog.css({ "left" : l, "top" : t});
            
            let a={ 
                "top": `${this.dimensions.top}px`,
                "left": `${this.dimensions.left}px`,
            };
            
            this.dialog.css(a);
        }
        

        globalOpenDialog=this;
        this.visible=true;
        let drag=$("bisweb-draganddropelement") || null;
        if (drag!==null)   {
            if (drag.length>0) {
                drag[0].addBlock();
            }
        }
        this.dialog.css({ "visibility": "visible" });
    }

    /** Hides the dialog and renables any drag and drop elements present */
    hide() {

        if (this.placed) {
            this.layoutController.setextrabarwidth(0);
            return;
        }
        
        if (this.docked)
            return;

        if (this.dialog===null)
            return;
        this.dialog.css({ "visibility": "hidden" });
        this.visible=false;
        let drag=$("bisweb-draganddropelement") || null;
        if (drag !== null)  {
            if (drag.length>0) {
                drag[0].removeBlock();
            }
        }

        if (globalOpenDialog===this)
            globalOpenDialog=null;

    }

    /** Removes mouse events and hides */
    cleanup() {
        this.unbindMouseEvents();
        this.hide();
    }

    /** Returns the dimensions of the dialog
     * @returns {Object} - { left, top, width, height }
     */
    getdimensions() { return this.dimensions; }

    // -------------------- heavy code ------------------------------------
    /**
     * creates a popup dialog -- this is really the constructor in some ways
     * @param{String} name - the name on the title bar
     * @param{number} w - the width of the dialog (default 400)
     * @param{number} h - the height of the dialog. IF NEGATIVE then this is a growable scrollable dialog with max-height =-h
     * @param{number} x - the left initial position of the dialog  (default=100)
     * @param{number} y - the top initial position of the dialog  (default 100)
     * @param{number} zindex - the zindex for stacking (default=500)
     * @param{boolean} motion - if true then the dialog can move
     * @param{function} callback - if not null the closecallback function 
     */
    create(name, w=400, h=400, x=100, y=100, zindex=500,motion=true,closecallback=null) {

        if (y<100)
            y=100;
        if (x<40)
            x=40;

        let grow=false;
        if (h<0) {
            h=-h;
            grow=true;
        }

        this.name=name;
        
        const self=this;
        this.dimensions.left = x || 100;
        this.dimensions.top = y || 100;
        this.dimensions.width = Math.round(w || 400);
        this.dimensions.height = Math.round(h || 400);

        var newid = webutil.createWithTemplate(webutil.getTemplates().bisdialog, $('body'));
        var div = $('#' + newid);
        div.find('.modal-title').text(name);

        this.dialog=div.find('.modal-dialog');
        this.content=div.find('.modal-content');
        this.widgetbase=div.find('.modal-body');
        this.footerbase=div.find('.modal-footer');
        this.header=div.find('.modal-header');
        this.headerbase=this.header.parent();
        this.close=div.find('.btn-default');
        this.secondclose=div.find('.close');

        this.widget = webutil.creatediv({ parent: this.widgetbase });
        this.footer = webutil.creatediv({ parent: this.footerbase });
        
        webutil.disableDrag(this.header,true);
        webutil.disableDrag(this.footer,true);
        webutil.disableDrag(this.widget,true);
        webutil.disableDrag(this.dialog,true);

        this.dialog.css({
            "visibility": "hidden",
            "z-index": zindex,
            "position" : "absolute",
            "width": `${this.dimensions.width}px`,
            "min-width": `${this.dimensions.width}px`,
        });
        
        this.content.css({  "width" : "100%"});

        if (!grow) {
            this.dialog.css({ "height": `${this.dimensions.height}px` });
            this.content.css({ "height" : "100%" });
            this.widgetbase.css({ "height" : `${this.dimensions.height-120}px`, "overflow-y": "auto"  });
        } else {
            this.widgetbase.css({ "max-height" : `${this.dimensions.height}px`, "overflow-y": "auto"  });
        }
        
        this.footer.css({
            "width" : "100%",
            "padding" : "10px",
        });
        

        this.header.css({
            'background-color': "#303030",
            "color": "#ffffff",
            "margin": "0px",
        });

        this.closecallback=closecallback || null;
        
        let clb=function (e) {
            e.preventDefault(); // cancel default behavior
            if (self.closecallback)
                self.closecallback();
            else
                self.hide();
        };

        $(this.close).click(clb);
        $(this.secondclose).click(clb);

        if (motion)
            this.bindMouseEvents();
    }


    
    /** add dock abilities 
     * @param {LayoutController} layout controller to put the dialog in (in sidebar)
     * @param {Boolean} createarrowbutton -- if true create extra button for docking on the fly
     */
    makeDockable(lcontroller,extrabutton=true) {

        if (this.layoutController!==null)
            return;
        
        this.layoutController=lcontroller;
        if (!extrabutton)
            return;
        
        let but2=this.header.find('.close');
        let but=$(`<button type="button" class="close"><span aria-hidden="true">&rarr;</span></button>`);
        but.css({ 'margin-right' : '10px'});
        but2.after(but);
        const self=this;
        but.click( (e) => {
            e.preventDefault();
            e.stopPropagation();
            self.dockDialog();
            return false;
        });

    }

    /** place the dialog inside the this.layoutController's extrabar
     * @param {Boolean} show - if true then show
     */
    placeDialog(show=true,footer=true) {

        if (!this.layoutController || this.docked)
            return false;
        
        if (this.placed) {
            this.showDockedDialog();
            return true;
        }
        
        this.hide();
        this.dockWidget=this.layoutController.getextrabar();
        this.dockWidget.append(this.header);
        this.dockWidget.append(this.widget);

        if (footer) {
            this.dockWidget.append('<HR>');
            this.dockWidget.append(this.footer);
        } else {
            this.widget.css({ 'max-height ':'2000px'});
        }
        this.placed=true;
        if (show)
            this.showDockedDialog();
        return true;
    }
    /** dock the dialog inside the this.layoutController 
     * @param {Boolean} show - if true then show
     */
    dockDialog(show=true,footer=true) {

        if (!this.layoutController || this.placed)
            return false;
        
        if (this.docked) {
            this.showDockedDialog();
            return true;
        }

        if (globalDockedDialogs.length===maxGlobalDockedDialogs) {
            let toremove=globalDockedDialogs.shift();
            toremove.unDockDialog();
        }

        this.hide();
        this.dockWidget=this.layoutController.createToolWidget(`${this.name}`);
        this.dockWidget.append(this.widget);
        if (footer) {
            this.dockWidget.append('<HR>');
            this.dockWidget.append(this.footer);
        }
        this.docked=true;
        globalDockedDialogs.push(this);
        if (show)
            this.showDockedDialog();
        return true;
    }
    
    /** Call to show docked dialog, i.e. make the panel visible and open */
    showDockedDialog() {
        if (this.docked)
            webutil.activateCollapseElement(this.dockWidget);
        else if (this.placed) 
            this.layoutController.setextrabarwidth(this.dimensions.width+5);
        
    }

    /** Call to move dialog GUI from dock back to dialog */
    unDockDialog() {
        if (!this.placed && !this.docked)
            return;

        this.headerbase.append(this.header);
        this.widgetbase.append(this.widget);
        this.footerbase.append(this.footer);
        this.widgetbase.css({ "max-height" : `${this.dimensions.height}px`});
        
        this.dockWidget.parent().parent().remove();
        if (this.placed) 
            this.layoutController.setextrabarwidth(0);
        this.placed=false;
        this.docked=false;
    }

    static getOpenDialogs() {
        return [ globalOpenDialog].concat(globalDockedDialogs);
    }

    static setMaxDockedDialogs(n) {
        maxGlobalDockedDialogs=n;
    }
    
}


webutil.defineElement('bisweb-dialogelement', BisWebDialogElement);
module.exports=BisWebDialogElement;
