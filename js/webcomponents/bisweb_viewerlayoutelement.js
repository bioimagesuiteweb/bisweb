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
const webcss = require('bisweb_css');
const THREE = require('three');
const volrenutils = require('bis_3dvolrenutils');


var detectWebGL = function() {

    let iswebgl2= volrenutils.WEBGL.isWebGL2Available();
    if (iswebgl2)
        return 2;
    
    let iswebgl=  volrenutils.WEBGL.isWebGLAvailable();
    if (iswebgl)
        return 1;

    return 0;
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
 *    bis-fixed="1"
 *    bis-brightcanvas="0"
 *    bis-noresize="0"
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
 *     bis-webgl   : if 2 then use webgl2 (if possible)
 *     bis-bright   : if 1 then use bright colors
 */
class ViewerLayoutElement extends HTMLElement {

    constructor() {
        super();
        this.minimizedockpanel=false;
        this.sidebarwidth=1;
        this.sidebarElements={};
        this.renderer=null;
        this.verticalLines=[ null, null];
        this.verticalLines2=[ null, null];
        this.verticalLinesX=[null,null];
        this.fixed=0;
        this.noresize=0;
        this.webgl2=false;
        this.darkcanvas=true;
        this.forcebright=false;
    }

    getCSSLength(n='width') {

        let style = getComputedStyle(this);
        let v = style[n];
        if (v==="auto") {
            style = getComputedStyle(this.parentElement);
            v = style[n];
        }
        return parseFloat(v.replace(/px/g,''));
    }

    isCanvasDark() {
        return this.darkcanvas;
    }

    setDarkMode(m) {

        
        if (this.forcebright) {
            this.elements.canvasbase.css({'background-color': '#ffffff'});
            this.darkcanvas=false;
            return;
        }

        if (m) {
            this.elements.canvasbase.css({'background-color': '#000000'});
            this.darkcanvas=true;
        } else {
            this.elements.canvasbase.css({'background-color' : "rgb(219, 219, 224)"});
            this.darkcanvas=false;
        }
    }

    getInnerWidth() {
        if (!this.noresize)
            return window.innerWidth;
        return this.getCSSLength('width');
    }

    getInnerHeight() {
        if (!this.noresize)
            return window.innerHeight;
        return this.getCSSLength('height') || 700;
    }

    
    /** call when the window is resized to adjust the proportions */
    handleresize() {

        // Width of dock and sidebar
        let dockwidth=this.dockpanelwidth;
        let sidewidth=this.sidebarwidth || 1;
        if (sidewidth<10) {
            sidewidth=1;
        }

        let innerW=this.getInnerWidth();
        let innerH=this.getInnerHeight();

        if (this.minimizedockpanel)
            dockwidth=50;

        let maxw=Math.round(0.4*innerW);
        if (dockwidth>maxw)
            dockwidth=maxw;
        if (sidewidth>maxw)
            sidewidth=maxw;

        // Check if we have an extra tall menubar
        let offset=87;
        if (this.noresize) {
            offset=0;
            this.topheight=0;
        }
        
        this.viewertop=0;
        if (innerW>767) {
            //let tm=$("#bismenuparent");
            let w=innerW-90;
            $('#bismenuparent').css({'width' : `${w}px`,
                                     'max-width': `${2*w}px`});
        } else {
            $('#bismenuparent').css({'max-width' : `100%`});
        }
        // Set the height of the viewer
        this.viewerheight=innerH-this.topheight-offset;
        this.viewerwidth= innerW-dockwidth-sidewidth;
        let docktop=0,dockleft=0,dockbarheight=this.viewerheight,sidetop=0,wide=1;
        
        if ( innerW<768 || this.viewerwidth<380) {
            // Responsive fix, stack elements
            this.viewerwidth=innerW;
            this.viewerheight=this.viewerheight-100;
            dockbarheight=1.5*this.viewerheight;
            dockwidth=this.viewerwidth;
            docktop=this.viewerheight+10;
            sidetop=docktop+dockbarheight+10;
            if (sidewidth>10)
                sidewidth=this.viewerwidth;
            wide=0;
        } else {
            dockleft=this.viewerwidth+this.sidebarwidth;
            docktop=this.viewertop;
            sidetop=this.viewertop;
            this.viewerleft=sidewidth;
        }

        // Viewer
        let canvascss={
            'left' : `${this.viewerleft}px`,
            'top'  : `${this.viewertop}px`,
            'width': `${this.viewerwidth}px`,
            'height':`${this.viewerheight}px`,
        };

        // Dockbar
        let dockbarcss = {
            'width' : `${dockwidth}px`,
            'top'   : `${docktop}px`,
            'height': `${dockbarheight}px`,
            'left'  : `${dockleft}px`
        };

        if (sidewidth<2)
            sidewidth=2;
        let sidebarcss = { 
            'left' : `0px`,
            'top'  : `${sidetop}px`,
            'width': `${sidewidth-1}px`,
            'height':`${dockbarheight}px`,
            'opacity' :'1.0',
        };
        
        this.elements.rendererbase.css(canvascss);
        this.elements.canvasbase.css(canvascss);
        this.elements.dockbar.css(dockbarcss);
        
        if (this.minimizedockpanel) {
            this.elements.dockbarcontent.css({ 'opacity' : '0.05',
                                               'overflow': 'hidden',
                                               'height': `${dockbarheight-40}px`,
                                             });
        } else {
            this.elements.dockbarcontent.css({ 'opacity' : '1.0',
                                               'overflow': 'auto',
                                               'height': `${dockbarheight-40}px`,
                                             });

        }


        
        if (sidewidth<10) {
            this.elements.sidebar.css({ 'opacity' :'0.01',
                                       });
        } else {
            this.elements.sidebar.css(sidebarcss);
            this.sidebarElements.header.css( { 'height' : `70px`,'max-height' : '70px'});
            this.sidebarElements.widget.css( { 'height' : `${this.viewerheight-70}px`});
        }
        
        this.renderer.setSize(this.viewerwidth,this.viewerheight);
        this.canvas.width=this.viewerwidth;
        this.canvas.height=this.viewerheight;
        this.overlaycanvas.width=this.viewerwidth;
        this.overlaycanvas.height=this.viewerheight;
        this.context.clearRect(0,0,this.viewerwidth,this.viewerheight);
        this.overlaycontext.clearRect(0,0,this.viewerwidth,this.viewerheight);


        if (!this.fixed)
            this.createOrShowLines(wide*sidewidth,wide*dockwidth);
    }

    usesWEBGL2() {
        return this.webgl2;
    }

    connectedCallback() {
        this.viewertop=0;
        this.viewerwidth=800;
        this.viewerheight=800;
        this.elements= null;
        this.canvas=null;
        this.context=null;
        this.overlaycanvas=null;
        this.overlaycontext=null;
        this.domElement=$(this);


        let webgl2=parseInt(this.getAttribute('bis-webgl') || 1);
        if (webgl2===2) {
            this.webgl2=true;
        }

        // fix css
        //console.log("Calling setAutoColorMode");
        webcss.setAutoColorMode();

    
        $(this).css({
            '-webkit-user-select': 'none',
            '-moz-user-select': 'none',
            '-ms-user-select': 'none',
            'user-select': 'none',
            '-webkit-app-region': 'no-drag',
        });
        $(this).addClass('biswebpanel');
        
        // Initialize defaults
        // Query Properties
        this.dockpanelwidth=parseInt(this.getAttribute('bis-dockwidth')) || 300;
        this.topheight=parseInt(this.getAttribute('bis-topheight')) || 0;
        this.dualmode=parseInt(this.getAttribute('bis-dualmode')) || 0;

        this.fixed=parseInt(this.getAttribute('bis-fixed') || 0 );
        this.noresize=parseInt(this.getAttribute('bis-noresize') || 0 );
        let bright=parseInt(this.getAttribute('bis-brightcanvas') || 0 );
        if (bright) {
            this.darkcanvas=false;
            this.forcebright=true;
        }
        
        this.minimizedockpanel=parseInt(this.getAttribute('bis-minimizedockpanel') || 0 );
        if (this.minimizedockpanel!==0)
            this.minimizedockpanel=1;
        
        this.defaulttext = this.getAttribute('bis-defaulttext') || '';
        if (this.defaulttext.length<5)
            this.defaulttext="";
        
        let coreopen=this.getAttribute('bis-coreopen');
        if (coreopen!=="true" && coreopen!==true)
            coreopen=false;
        else
            coreopen=true;

        let webglversion=detectWebGL();

        if (webglversion<1) {
            webutil.createAlert('Your browser does not support WEBGL (even v1).<BR> We can not proceeed.<BR> Try using a modern web browser.', true);
        } else if (this.webgl2===true  && webglversion<2) {
            let link=`<a target="_blank" rel="noopener" href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL v2</a>`;
            webutil.createAlert(`Your browser does not support ${link}.<BR> Some features (e.g. volume rendering) will not be available.<BR>Please switch to a modern version of chrome (or firefox).`, true);
            this.webgl2=false;
        }
        
        this.elements = {
            rendererbase :   webutil.creatediv({ parent : this.domElement ,
                                                 css: { 'position' : 'absolute',
                                                        'z-index': '2',
                                                        'margin' : '0 0 0 0',
                                                        'padding' : '0 0 0 0',
                                                        'border-color' : '#888888',
                                                        'border-style' : 'solid',
                                                        'border-width' : '0px 0px 0px 0px'
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
                                                        'border-width' : '0px 0px 0px 0px',
                                                        'border-color' : '#888888',
                                                        'border-style' : 'solid',
                                                        'padding-left' : '2px',
                                                        'z-index' : '4',
                                                       },
                                                 classname : 'biswebdock'
                                               }),
            sidebar     :   webutil.creatediv({ parent : this.domElement,
                                                 css : {'position':'absolute',
                                                        'top' : '0px',
                                                        'left' : '0px',
                                                        'z-index' : '25',
                                                        'margin-top' : '0px',
                                                        'padding-right' : '2px',
                                                        'margin-bottom' : '0px',
                                                        'opacity' : '0.01',
                                                        'border-width' : '0px 0px 0px 0px',
                                                        'border-color' : '#888888',
                                                        'border-style' : 'solid',
                                                        'width' : `${this.sidebarwidth}px`,
                                                       },
                                                classname : 'biswebdock'
                                               }),
        };
        
        this.elements.dockbar.attr('aria-label', 'viewer_dockbar');
        
        if (!this.darkcanvas)
            this.elements.canvasbase.css({'background-color' : "#fefefe"});
        
        let zt=webutil.creatediv({ parent : this.elements.dockbar,
                                   css : {
                                       'height' : '40px',
                                       'width' : '100%'
                                   }
                                 });
        this.elements.dockbarcontent=webutil.creatediv({ parent : this.elements.dockbar,
                                                css : {
                                                    'width' : '100%',
                                                    'padding-top' : '5px',
                                                }
                                              });
        
        let minimizebutton=$(`<button type="button" class="bistoggle"><span class="glyphicon glyphicon-resize-small"></span></button>`);
        minimizebutton.css({'margin' : '2px'});
        zt.append(minimizebutton);
        
        
        let newpanel=webutil.createpanelgroup(this.elements.dockbarcontent);
        if (this.dualmode > 0) {
            this.elements.corecontrols=webutil.createCollapseElement(newpanel,'Viewer 1 Controls',coreopen);
            this.elements.secondviewercontrols=webutil.createCollapseElement(newpanel,'Viewer 2 Controls',false);
        } else {
            this.elements.corecontrols=webutil.createCollapseElement(newpanel,'Viewer Controls',coreopen);

        }
        
        this.elements.toolbase=webutil.createpanelgroup(this.elements.dockbarcontent);
        
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


        if (this.webgl2) {
            let canvas = document.createElement( 'canvas' );
            let context = canvas.getContext( 'webgl2' );
            this.renderer = new THREE.WebGLRenderer( { canvas: canvas, context: context, alpha : true } );
        } else {
            this.renderer = new THREE.WebGLRenderer({alpha:true});
        }
        this.renderer.shadowMap.Enabled = true;
        this.renderer.setClearColor(0x000000, 0.0);
        this.renderer.autoClear = false;
        this.elements.rendererbase.append(this.renderer.domElement);
        
        const self=this;
        this.context.font="28px Arial";
        this.context.fillStyle = "#888888";
        this.context.clearRect(0,0,this.viewerwidth,this.viewerheight);
        

        this.originaldockwidth=this.dockpanelwidth;
        
        minimizebutton.click(function(e) {
            e.preventDefault(); // cancel default behavior
            minimizebutton.empty();
            if (self.minimizedockpanel) {
                self.minimizedockpanel=0;
                self.dockpanelwidth=self.originaldockwidth;
                minimizebutton.append(`<span class="glyphicon glyphicon-resize-small"></span>`);
            } else {
                self.minimizedockpanel=1;
                minimizebutton.append(`<span class="glyphicon glyphicon-resize-full"></span>`);            }
            
            window.dispatchEvent(new Event('resize'));
        });


        // Create sidebar elements
        this.sidebarElements.header=webutil.creatediv({ parent : this.elements.sidebar,
                                                      css : { 'width' : '99%',
                                                              'padding-bottom' : '10px',
                                                              'height' : '5px',
                                                            },
                                                        classname : 'biswebpanel2'
                                                    });
        
        this.sidebarElements.widget=webutil.creatediv({ parent : this.elements.sidebar,
                                                        css : {
                                                            'width' : '99%',
                                                            'height' : '5px',
                                                            "overflow-y": "auto",
                                                        },
                                                        classname : 'biswebpanel'
                                                      });
        this.handleresize();
        webutil.runAfterAllLoaded( () => {

            //            let fnsize=webutil.getfontsize(this.context.canvas);
            this.context.font="20px Arial";
            this.context.textAlign="left";
            this.context.fillStyle = "#dd7700";
            
            if (this.defaulttext.length<4) {
                this.context.fillText('Load (or Drag) an Image (.nii.gz or .nii)',20,100);
                this.context.fillText(' or an application viewer file (.biswebstate)',20,140);
                this.context.fillText('and it will appear here!',30,180);
            } else {
                let ch=this.context.canvas.height;
                let cw=this.context.canvas.width;
                this.context.fillStyle = "#888888";
                this.context.fillText(this.defaulttext,cw/2,ch/2);
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
    
    getdockbar() {
        return this.elements.toolbase;
    }

    getsidebar() {
        return this.elements.sidebar;
    }

    getSidebarElements() {
        return this.sidebarElements;
    }

    setsidebarwidth(n) {
        if (n<10)
            n=0;
        let maxl=Math.round(0.5*this.getInnerWidth());
        if (n>maxl)
            n=maxl;
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

    getviewertop() { 
        return this.viewertop;
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


        // ---------- Draggable Separator -------------- -------------- --------------

    handleVerticalLines(e,index,mode,modifyCallbacks) {

        if (mode>=1 && this.verticalLinesX[index]<0)
            return false;

        
        e.preventDefault();
        
        let x=Math.round(e.pageX);
        let cnv=this.verticalLines[index];
        let cnv2=this.verticalLines2[index];
        
        
        if (mode===0) {
            
            cnv.css({'left' : `${x-3}px`,
                     'width' : '9px'});
            cnv2.css({'left' : `${x-4}px`});
            modifyCallbacks(1);
            this.verticalLinesX[index]=x;
            return true;
        }

        let minl=0,maxl=0;
        if (index===0) {
            minl=151;
            maxl=Math.round(0.4*this.getInnerWidth());
        } else {
            minl=Math.round(0.4*this.getInnerWidth()+this.sidebarwidth);
            maxl=this.getInnerWidth()-151;
        }
        
        if (x<minl)
            x=minl;
        else if (x>maxl)
            x=maxl;
        
        if (mode===1 && this.verticalLinesX[index]>0) {

            cnv.css({ 'left' : `${x-3}px`,});
            cnv2.css({'left' : `${x-5}px`});
            return true;
        }
        
        if (mode===2) {
            cnv.css({'width' : '1px'  });
            this.verticalLinesX[index]=-1;
            this.midlineCallbacks(2,index);
            setTimeout( () => {
                if (index===0) {
                    this.setsidebarwidth(x);
                } else {
                    this.dockpanelwidth=this.getInnerWidth()-x;
                    if (this.dockpanelwidth<150)
                        this.dockpanelwidth=150;
                    window.dispatchEvent(new Event('resize'));
                }
            },10);

            return true;
        }
        
    }

    midlineCallbacks(add=0,index=0) {

        let modifyCallbacks=null;
        let downC=function(e) {  self.handleVerticalLines(e,index,0,modifyCallbacks);  };
        let moveC=function(e) {  self.handleVerticalLines(e,index,1,modifyCallbacks);  };
        let upC=function(e) {  self.handleVerticalLines(e,index,2,modifyCallbacks);  };
        const self=this;

        modifyCallbacks=function(add=0) {

            let cnv2=self.verticalLines2[index];
            let par=self.domElement;
            
            if (add===0) {
                cnv2[0].addEventListener('mousedown',downC);
            } else if (add===1)  {
                par[0].addEventListener('mousemove',moveC);
                par[0].addEventListener('mouseup',  upC);
                par[0].addEventListener('mouseleave',upC);
            } else if (add===2) {
                par[0].removeEventListener('mousemove',moveC);
                par[0].removeEventListener('mouseup',  upC);
                par[0].removeEventListener('mouseleave',upC);
            }
        };

        return modifyCallbacks(add);
    }

    
    createOrShowLines(sidewidth=10,dockwidth=300) {

        let w=[sidewidth,dockwidth ];
        let left=[sidewidth,this.getInnerWidth()-dockwidth];
        let dh=this.viewerheight;

        for (let ia=0;ia<=1;ia++) {
            if (w[ia]<100) {
                if (this.verticalLines[ia]) {
                    this.midlineCallbacks(2,ia);
                    this.verticalLines[ia].remove();
                    this.verticalLines2[ia].remove();
                    this.verticalLines[ia]=null;
                    this.verticalLines2[ia]=null;
                }
            } else {

                if (!this.verticalLines[ia]) {
                    this.verticalLines[ia]=$(`<div></div>`);
                    this.domElement.append(this.verticalLines[ia]);
                    this.verticalLines2[ia]=$(`<div style="cursor:ew-resize"></div>`);
                    this.domElement.append(this.verticalLines2[ia]);
                }
                this.verticalLines2[ia].css({ 'position' : 'absolute',
                                              'top' : `${this.viewertop}px` ,
                                              'z-index' : 601,
                                              'height' : `${dh}px`,
                                              'width'  : '11px',
                                              'left'   : `${left[ia]-5}px`,
                                              'background-color' : 'rgba(10,10,10,0.1)',
                                            });
                this.verticalLines[ia].css({ 'position' : 'absolute',
                                             'top' : `${this.viewertop}px` ,
                                             'z-index' : 600,
                                             'height' : `${dh}px`,
                                             'width'  : '3px',
                                             'left'   : `${left[ia]-1}px`,
                                             'background-color' : 'rgba(128,128,128,1.0)',
                                             
                                           });
                
                this.midlineCallbacks(0,ia);
            }
        }
    }

}

module.exports=ViewerLayoutElement;
webutil.defineElement('bisweb-viewerlayoutelement', ViewerLayoutElement);


