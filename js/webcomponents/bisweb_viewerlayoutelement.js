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
 * A web element that creates a viewer layout set up (a main widget on the left with two canvases and a sidebar on the right)
 *
 * to access simply include this file into your code and then add this as an element to your html page
 *
 * @example
 * <bisweb-viewerlayoutelement
 *    id="viewer_layout"
 *    bis-sidewidth="400"
 *    bis-coreopen="true"
 *    bis-minimizesidepanel="0"
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
 *     bis-sidewidth : width of the side panel in pixels
 *     bis-coreopen  : if true the core (top side panel) is open else closed
 *     bis-minimizesidepanel : if 1 the side panel is minimized to a narrow column
 *     bis-defaulttext : text to draw in. If length > 10 and first character is not space then sets "simple mode"
 *     bis-dualmode : if 1 then operates in dual mode
 */
class ViewerLayoutElement extends HTMLElement {

    constructor() {
        super();
        this.minimizesidepanel=false;
        this.panelgroup=null;
        this.extrabarwidth=0;
    }
    
    /** call when the window is resized to adjust the proportions */
    handleresize() {
        
        let sidewidth=this.sidepanelwidth;
        if (this.minimizesidepanel)
            sidewidth=40;
        let topheight=this.topheight;
        let fullwidth=0;

        if (window.innerWidth<2*sidewidth)
            sidewidth=Math.round(0.5*window.innerWidth);
        
        this.viewerheight=window.innerHeight-topheight-100;
        fullwidth=window.innerWidth;
        
        let sidetop=0,sideleft=0;
        let extrawidth=this.extrabarwidth;
        if (extrawidth<10) {
            extrawidth=0;
        }

        this.viewerwidth= fullwidth-sidewidth-extrawidth;
        this.sidebarheight=this.viewerheight;
        let extratop=0;

        let extraleft=0;
            
        if ((this.viewerwidth<400 && this.minimizesidepanel===0) || (fullwidth<770)) {
            this.viewerwidth=fullwidth;
            if (this.viewerheight<600) {
                this.viewerheight=this.viewerheight-100;
                sidetop=this.viewerheight;
                extratop=this.viewerheight*2;
                extrawidth=this.viewerwidth;
                this.viewerwidth=this.viewerwidth-10;
                sidewidth=this.viewerwidth;
            } else {
                this.viewerheight=600;
                this.viewerwidth=this.viewerwidth-10;
                sidetop=this.viewerheight;
                sidewidth=this.viewerwidth;
            }

        } else {
            extraleft=this.viewerwidth;
            sideleft=this.viewerwidth+this.extrabarwidth;
        }
        
        // Viewer
        let canvascss={
            'left' : '0px',
            'top'  : '0px',
            'width': `${this.viewerwidth}px`,
            'height':`${this.viewerheight}px`,
        };

        // Sidebar
        let sidebarcss = {
            'width' : `${sidewidth}px`,
            'top'   : `${sidetop-5}px`,
            'height': `${this.sidebarheight+13}px`,
            'left'  : `${sideleft}px`
        };

        let extrabarcss = { 
            'left' : `${extraleft}px`,
            'top'  : `${extratop-5}px`,
            'width': `${extrawidth-5}px`,
            'height':`${this.viewerheight+13}px`,
            'visibility' :'visible',
        };
        
        
        if (this.minimizesidepanel) {
            this.elements.toolbase.css({ 'opacity' : '0.05' });
            this.elements.newpanel.css({ 'opacity' : '0.05' });
            this.elements.sidebar.css({ 'overflow-x' : 'hidden'});
        } else {
            this.elements.toolbase.css({ 'opacity' : '1.0' });
            this.elements.newpanel.css({ 'opacity' : '1.0' });
            this.elements.sidebar.css({ 'overflow-x' : 'auto'});
        }

        this.elements.rendererbase.css(canvascss);
        this.elements.canvasbase.css(canvascss);
        this.elements.sidebar.css(sidebarcss);
        
        if (extrawidth<1) {
            this.elements.extrabar.css({ 'visibility' :'hidden'});
        } else {
            this.elements.extrabar.css(extrabarcss);
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
        this.sidepanelwidth=parseInt(this.getAttribute('bis-sidewidth')) || 150;
        this.topheight=parseInt(this.getAttribute('bis-topheight')) || 0;
        this.dualmode=parseInt(this.getAttribute('bis-dualmode')) || 0;
        
        this.minimizesidepanel=parseInt(this.getAttribute('bis-minimizesidepanel') || 0 );
        if (this.minimizesidepanel!==0)
            this.minimizesidepanel=1;
        
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
                                                        'z-index': '2'
                                                      }
                                               }),
            canvasbase   :   webutil.creatediv({ parent : this.domElement,
                                                 css: { 'position' : 'absolute',
                                                        'top':'0px',
                                                        'background-color':
                                                        '#000000', 'z-index': '1'
                                                      }
                                               }),
            sidebar      :   webutil.creatediv({ parent : this.domElement,
                                                 css : {'position':'absolute',
                                                        'overflow-y': 'auto',
                                                        'background-color': webutil.getpassivecolor()
                                                       }
                                               }),
            extrabar     :   webutil.creatediv({ parent : this.domElement,
                                                 css : {'position':'absolute',
                                                        'top' : '0px',
                                                        'z-index' : '4',
                                                        'margin-top' : '0px',
                                                        'margin-bottom' : '0px',
                                                        'overflow-y': 'auto',
                                                        'width' : `${this.extrabarwidth}px`,
                                                        'background-color':  webutil.getpassivecolor()
                                                       }
                                               }),
        };
        
        let b1=this.defaulttext.substr(0,1) || "";
        if (this.defaulttext.length>10 && b1!=" ")
            this.elements.canvasbase.css({'background-color' : "#fefefe"});
        
        let zt=webutil.creatediv({ parent : this.elements.sidebar,
                                   css : { 'height' : '40px' }});
        
        let top=webutil.creatediv({ parent : zt,
                                    css : { 'height' : '40px', 'float' :'right', 'fontsize' : '12', 'z-index' : 4000, 'margin-right' : '10px' }
                                  });
        
        
        let minimizebutton=$('<button type="button" class="close>  <span class="glyphicon glyphicon-align-left" aria-hidden="true"></span> </button>');
        top.append(minimizebutton);
        
        
        let newpanel=webutil.createpanelgroup(this.elements.sidebar);
        this.elements.newpanel=newpanel;
        if (this.dualmode > 0) {
            this.elements.corecontrols=webutil.createCollapseElement(newpanel,'Viewer 1 Controls',coreopen);
            this.elements.secondviewercontrols=webutil.createCollapseElement(newpanel,'Viewer 2 Controls',false);
        } else {
            this.elements.corecontrols=webutil.createCollapseElement(newpanel,'Viewer Controls',coreopen);
        }
        
        this.elements.toolbase=webutil.createpanelgroup(this.elements.sidebar);
        
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
            if (self.minimizesidepanel) {
                self.minimizesidepanel=0;
            } else {
                self.minimizesidepanel=1;
            }
            
            window.dispatchEvent(new Event('resize'));
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
    
    /** Return the side bar where new tools can be added
     * @returns {JQueryElement} div to draw additional tools (e.g. snapshot, paint, landmark etc.)
     */
    getsidebar() {
        return this.elements.toolbase;
    }

    getextrabar() {
        return this.elements.extrabar;
    }

    setextrabarwidth(n) {
        if (n<0)
            n=0;
        if (n>500)
            n=500;
        this.extrabarwidth=n;
        window.dispatchEvent(new Event('resize'));
    }
                                               
    getviewerwidth() { 
        return this.viewerwidth;
    }

    getviewerheight() { 
        return this.viewerheight;
    }

    
    /** create Tool Widget 
     * @returns {JQueryElement} div to draw additional tools (e.g. snapshot, paint, landmark etc.)
     */
    createToolWidget(name,open=false) {
        return webutil.createCollapseElement(this.elements.toolbase,name,open);
    }
}


webutil.defineElement('bisweb-viewerlayoutelement', ViewerLayoutElement);


