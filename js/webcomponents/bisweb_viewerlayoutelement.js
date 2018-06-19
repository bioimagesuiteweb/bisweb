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

/* global window,document,Blob,FileReader,setTimeout,HTMLElement,Event */


"use strict";

const $=require('jquery');
const webutil=require('bis_webutil');
const THREE = require('three');

var detectWebGL = function() {
    try { 
        var canvas = document.createElement( 'canvas' ); 
        return !! ( window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) ); 
    } catch( e ) { 
        console.log("WEB GL is not available");
    }
    return false;
};


// ---------------- layout controller ----------------

// -----------------------------------------------------------------
/**
 *
 * A web element that creates a viewer layout set up (a main widget on the left with two canvases, a dockbar on the right and a sidebar on the left)
 *
 * to access simply include this file into your code and then add this as an element to your html page
 *
 * @example
 * <bisweb-viewerlayoutelement
 *    id="viewer_layout"
 *    bis-dockwidth="400"
 *    bis-coreopen="true"
 *    bis-minimizedockpanel="0"
 *    bis-defaulttext="">
 * </bisweb-viewerlayoutelement>
 *
 * later this is linked to a viewer so that the viewer can draw inside this e.g.
 *
 * <bisweb-orthogonalviewer
 *     id="viewer"
 *     bis-layoutwidgetid="#viewer_layout"
 *     bis-colormapeditorid="#viewer_cmap">
 * </bisweb-orthogonalviewer>
 *
 * Attributes
 *     bis-dockwidth : width of the dock panel in pixels
 *     bis-coreopen  : if true the core (top dock panel) is open else closed
 *     bis-minimizedockpanel : if 1 the dock panel is minimized to a narrow column
 *     bis-defaulttext : text to draw in. If length > 10 and first character is not space then sets "simple mode"
 *     bis-dualmode : if 1 then operates in dual mode
 */
class ViewerLayoutElement extends HTMLElement {

    constructor() {
        super();
        this.minimizedockpanel=false;
        this.panelgroup=null;
        this.sidebarwidth=0;
        this.viewerleft=0;
        this.elements={};
        this.sideelements={};
    }
    
    /** call when the window is resized to adjust the proportions */
    handleresize() {
        
        let dockwidth=this.dockpanelwidth;
        if (this.minimizedockpanel)
            dockwidth=50;
        let topheight=this.topheight;
        let fullwidth=0;

        if (window.innerWidth<2*dockwidth)
            dockwidth=Math.round(0.5*window.innerWidth);
        
        this.viewerheight=window.innerHeight-topheight-100;
        fullwidth=window.innerWidth;
        
        let docktop=0,dockleft=0;
        let sidewidth=this.sidebarwidth;
        if (sidewidth<10) {
            sidewidth=1;
        }

        this.viewerwidth= fullwidth-dockwidth-sidewidth;
        this.dockbarheight=this.viewerheight;
        let sidetop=0;

        let sideleft=0;
            
        if ( (sidewidth< 10) && ((this.viewerwidth<400 && this.minimizedockpanel===0) || (fullwidth<770))) {
            this.viewerwidth=fullwidth;
            if (this.viewerheight<600) {
                this.viewerheight=this.viewerheight-100;
                docktop=this.viewerheight;
                sidetop=this.viewerheight*2;
                sidewidth=this.viewerwidth;
                this.viewerwidth=this.viewerwidth-10;
                dockwidth=this.viewerwidth;
            } else {
                this.viewerheight=600;
                this.viewerwidth=this.viewerwidth-10;
                docktop=this.viewerheight;
                dockwidth=this.viewerwidth;
            }

        } else {
            sideleft=this.viewerwidth;
            dockleft=this.viewerwidth+this.sidebarwidth;
        }

        let vleft=sidewidth;
        sideleft=0;
        this.viewerleft=vleft;
        
        // Viewer
        let canvascss={
            'left' : `${vleft}px`,
            'top'  : '0px',
            'width': `${this.viewerwidth}px`,
            'height':`${this.viewerheight}px`,
        };

        // Dockbar
        let dockbarcss = {
            'width' : `${dockwidth}px`,
            'top'   : `${docktop-4}px`,
            'height': `${this.dockbarheight+12}px`,
            'left'  : `${dockleft}px`
        };

        if (sidewidth<2)
            sidewidth=2;
        let sidebarcss = { 
            'left' : `${sideleft}px`,
            'top'  : `${sidetop-4}px`,
            'width': `${sidewidth-10}px`,
        //    'height':`${this.viewerheight+12}px`,
            'opacity' :'1.0',
        };
        
        
        if (this.minimizedockpanel) {
            this.elements.toolbase.css({ 'opacity' : '0.05' });
            this.elements.newpanel.css({ 'opacity' : '0.05' });
            this.elements.dockbar.css({ 'overflow-x' : 'hidden'});
        } else {
            this.elements.toolbase.css({ 'opacity' : '1.0' });
            this.elements.newpanel.css({ 'opacity' : '1.0' });
            this.elements.dockbar.css({ 'overflow-x' : 'auto'});
        }

        this.elements.rendererbase.css(canvascss);
        this.elements.canvasbase.css(canvascss);
        this.elements.dockbar.css(dockbarcss);
        
        if (sidewidth<10) {
            this.elements.sidebar.css({ 'opacity' :'0.01',
                                       });
        } else {
            this.elements.sidebar.css(sidebarcss);
            let a=parseInt(this.sideelements.widget.attr('nofooter'));
            if (a) {
                this.sideelements.header.css( { 'height' : `70px`,'max-height' : '70px'});
                this.sideelements.widget.css( { 'height' : `${this.viewerheight-72+12}px`});
                this.sideelements.footer.css( { 'height' : `2px`});
            } else {
                this.sideelements.header.css( { 'height' : `70px`,'max-height' : '70px'});
                this.sideelements.widget.css( { 'height' : `${this.viewerheight-170+12}px`});
                this.sideelements.footer.css( { 'height' : `100px`,'max-height' : '100px'});
            }
        }
        
        this.renderer.setSize(this.viewerwidth,this.viewerheight);
        this.canvas.width=this.viewerwidth;
        this.canvas.height=this.viewerheight;
        this.overlaycanvas.width=this.viewerwidth;
        this.overlaycanvas.height=this.viewerheight;
        this.context.clearRect(0,0,this.viewerwidth,this.viewerheight);
        this.overlaycontext.clearRect(0,0,this.viewerwidth,this.viewerheight);
    }
    
    
    connectedCallback() {
        this.viewerwidth=800;
        this.viewerheight=800;
        this.elements= null;
        this.canvas=null;
        this.context=null;
        this.overlaycanvas=null;
        this.overlaycontext=null;
        this.domElement=$(this);
        
        
        $(this).css({
            '-webkit-user-select': 'none',
            '-moz-user-select': 'none',
            '-ms-user-select': 'none',
            'user-select': 'none',
            '-webkit-app-region': 'no-drag',
            'background-color': webutil.getpassivecolor()
        });
        
        // Initialize defaults
        // Query Properties
        this.dockpanelwidth=parseInt(this.getAttribute('bis-dockwidth')) ||
            parseInt(this.getAttribute('bis-sidewidth')) || 300;
        this.topheight=parseInt(this.getAttribute('bis-topheight')) || 0;
        this.dualmode=parseInt(this.getAttribute('bis-dualmode')) || 0;
        
        this.minimizedockpanel=parseInt(this.getAttribute('bis-minimizedockpanel') || 0 );
        if (this.minimizedockpanel!==0)
            this.minimizedockpanel=1;
        
        this.defaulttext = this.getAttribute('bis-defaulttext') || '';
        if (this.defaulttext===" ")
            this.defaulttext="";
        
        let coreopen=this.getAttribute('bis-coreopen');
        if (coreopen!=="true" && coreopen!==true)
            coreopen=false;
        else
            coreopen=true;
        
        if (detectWebGL() === false) {
            var a=$("<div><B> Your Browser does not support WebGL or it is not enabled.<BR> <BR> This viewer can not function without WebGL support.</B><BR><HR><BR></div>");
            var b=$("<div>If using Safari on MacOS do: <BR><BR><OL><LI>Open the Safari menu and select Preferences.</LI><LI>Click the Advanced tab in the Preferences window.</LI><LI>Then, at the bottom of the window, check the Show Develop menu in menu bar checkbox.</LI><LI>Then, open the Develop menu in the menu bar and select Enable WebGL.</LI></OL></div>");
            this.domElement.append(a);
            this.domElement.append(b);
            return null;
        }
        
        this.elements = {
            rendererbase :   webutil.creatediv({ parent : this.domElement ,
                                                 css: { 'position' : 'absolute',
                                                        'z-index': '2',
                                                        'margin' : '0 0 0 0',
                                                        'padding' : '0 0 0 0',
                                                      }
                                               }),
            canvasbase   :   webutil.creatediv({ parent : this.domElement,
                                                 css: { 'position' : 'absolute',
                                                        'top':'0px',
                                                        'background-color': '#000000',
                                                        'z-index': '1',
                                                        'margin' : '0 0 0 0',
                                                        'padding' : '0 0 0 0',
                                                      }
                                               }),
            dockbar      :   webutil.creatediv({ parent : this.domElement,
                                                 css : {'position':'absolute',
                                                        'overflow-y': 'auto',
                                                        'border-width' : '0px 0px 0px 0px',
                                                        'border-color' : '#888888',
                                                        'border-style' : 'solid',
                                                        'padding-left' : '2px',
                                                        'background-color': webutil.getpassivecolor()
                                                       }
                                               }),
            sidebar     :   webutil.creatediv({ parent : this.domElement,
                                                 css : {'position':'absolute',
                                                        'top' : '0px',
                                                        'left' : '0px',
                                                        'z-index' : '4',
                                                        'margin-top' : '0px',
                                                        'padding-right' : '2px',
                                                        'margin-bottom' : '0px',
                                                        'opacity' : '0.01',
                                                        'border-width' : '0px 0px 0px 0px',
                                                        'border-color' : '#888888',
                                                        'border-style' : 'solid',
                                                        'width' : `${this.sidebarwidth}px`,
                                                        'background-color':  webutil.getpassivecolor()
                                                       }
                                               }),
        };
        
        let b1=this.defaulttext.substr(0,1) || "";
        if (this.defaulttext.length>10 && b1!=" ")
            this.elements.canvasbase.css({'background-color' : "#fefefe"});
        
        let zt=webutil.creatediv({ parent : this.elements.dockbar,
                                   css : { 'height' : '40px' }});
        
        let top=webutil.creatediv({ parent : zt,
                                    css : {
                                        'z-index' : 4000,
                                        'width' : '100%',
                                    }
                                  });
        

        let minimizebutton=$(`<button type="button" class="bistoggle"><span class="glyphicon glyphicon-resize-small"></span></button>`);
        minimizebutton.css({'margin' : '2px'});
        top.append(minimizebutton);
        
        
        let newpanel=webutil.createpanelgroup(this.elements.dockbar);
        newpanel.css({ 'margin-top' : '10px'});
        this.elements.newpanel=newpanel;
        if (this.dualmode > 0) {
            this.elements.corecontrols=webutil.createCollapseElement(newpanel,'Viewer 1 Controls',coreopen);
            this.elements.secondviewercontrols=webutil.createCollapseElement(newpanel,'Viewer 2 Controls',false);
        } else {
            this.elements.corecontrols=webutil.createCollapseElement(newpanel,'Viewer Controls',coreopen);

        }
        
        this.elements.toolbase=webutil.createpanelgroup(this.elements.dockbar);
        
        // canvas then renderer
        //  create 2d canvas
        this.canvas = document.createElement('canvas');
        $(this.canvas).css({'z-index': '500',
                            'position':'absolute',
                            'top': '0px',
                            'left': '0px'});
        
        this.context=this.canvas.getContext("2d");
        this.overlaycanvas = document.createElement('canvas');
        $(this.overlaycanvas).css({'z-index': '502',
                                   'position':'absolute',
                                   'top': '0px',
                                   'left': '0px'});
        
        this.overlaycontext=this.canvas.getContext("2d");
        
        this.elements.canvasbase.append(this.canvas);
        this.elements.canvasbase.append(this.overlaycanvas);
        // create 3d renderer
        this.renderer = new THREE.WebGLRenderer({alpha:true});
        this.renderer.shadowMap.Enabled = true;
        this.renderer.setClearColor(0x000000, 0.0);
        
        this.renderer.autoClear = false;
        this.elements.rendererbase.append(this.renderer.domElement);
        
        
        this.handleresize();
        this.context.font="28px Arial";
        this.context.fillStyle = "#888888";
        this.context.clearRect(0,0,this.viewerwidth,this.viewerheight);
        
        if (this.defaulttext === "") {
            this.context.fillText('Load (or Drag) an Image (.nii.gz or .nii)',100,100);
            this.context.fillText(' or an application viewer file (.biswebstate)',100,180);
            this.context.fillText('and it will appear here!',120,260);
        } else {
            let ch=this.context.canvas.height;
            let cw=this.context.canvas.width;
            this.context.textAlign="center";
            this.context.fillText(this.defaulttext,cw/2,ch/2);
        }
        
        const self=this;
        minimizebutton.click(function(e) {
            e.preventDefault(); // cancel default behavior
            minimizebutton.empty();
            if (self.minimizedockpanel) {
                self.minimizedockpanel=0;
                minimizebutton.append(`<span class="glyphicon glyphicon-resize-small"></span>`);
            } else {
                self.minimizedockpanel=1;
                minimizebutton.append(`<span class="glyphicon glyphicon-resize-full"></span>`);            }
            
            window.dispatchEvent(new Event('resize'));
        });


        // Create sidebar elements
        this.sideelements.header=webutil.creatediv({ parent : this.elements.sidebar,
                                                      css : { 'width' : '99%',
                                                              'padding-bottom' : '10px',
                                                              'height' : '5px',
                                                              'background-color': webutil.getpassivecolor()
                                                            }
                                                    });
        
        this.sideelements.widget=webutil.creatediv({ parent : this.elements.sidebar,
                                                      css : {
                                                          'width' : '99%',
                                                          'height' : '5px',
                                                          "max-height" : "2000px",
                                                          "overflow-y": "auto",
                                                          'background-color': webutil.getpassivecolor2()
                                                      }
                                                    });
        
        this.sideelements.footer=webutil.creatediv({ parent : this.elements.sidebar,
                                                      css : { 'width' : '99%',
                                                              'height' : '5px',
                                                              'background-color': webutil.getpassivecolor(),
                                                              'padding-top' : '10px',
                                                            }
                                                    });
        
    }
    
    /** returns the main renderer 
     * @returns{THREE.WebGLRenderer} main renderer */
    getrenderer() {
        return this.renderer;
    }
    
    /** returns the main canvas 
     * @returns{Canvas} */
    getcanvas() {
        return this.canvas;
    }
    
    /** returns the overlay canvas 
     * @returns{Canvas} */
    getoverlaycanvas() {
        return this.overlaycanvas;
    }

    /** returns the core controls in which the viewer draws its own controls (sliders etc.)
     * @returns{JQueryElement} */
    getcorecontrols(slave=false) {
        if (slave===true && this.dualmode>0)
            return this.elements.secondviewercontrols;
        return this.elements.corecontrols;
    }
    
    /** Return the dock bar where new tools can be added
     * @returns {JQueryElement} div to draw additional tools (e.g. snapshot, paint, landmark etc.)
     */
    getdockbar() {
        return this.elements.toolbase;
    }

    getsidebar() {
        return this.elements.sidebar;
    }

    getsideelements() {
        return this.sideelements;
    }

    setsidebarwidth(n) {
        if (n<10)
            n=0;
        if (n>500)
            n=500;
        this.sidebarwidth=n;
        window.dispatchEvent(new Event('resize'));
    }

    getsidebarwidth() {
        return this.sidebarwidth;
    }
                                               
    getviewerwidth() { 
        return this.viewerwidth;
    }

    getviewerheight() { 
        return this.viewerheight;
    }


    getviewerleft() { 
        return this.viewerleft;
    }

    
    /** create Tool Widget 
     * @returns {JQueryElement} div to draw additional tools (e.g. snapshot, paint, landmark etc.)
     */
    createDockWidget(name,open=false) {
        return webutil.createCollapseElement(this.elements.toolbase,name,open);
    }
}


webutil.defineElement('bisweb-viewerlayoutelement', ViewerLayoutElement);


