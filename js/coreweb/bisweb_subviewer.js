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

"use strict";

const THREE = require('three');
const $=require('jquery');
const inobounce=require('inobounce.js');

/**
 * @file Browser module. Contains {@link bisweb_subviewer}
 * @author Xenios Papademetris (but derives from original work from  Eberhard Graether / http://egraether.com/, Mark Lundin     / http://mark-lundin.com and Patrick Fuller / http://patrick-fuller.com from Three.JS demo code)
 * @version 1.0
 */

/** A definition of the sub-piece of the render window we are using for this operation
 * @typedef Bis_Viewport
 * @property {x0}  - minimum x  (0.0=left,1.0=right) in normalized coordinates on renderer domElement
 * @property {x1}  - maximum x  (0.0=left,1.0=right) in normalized coordinates on renderer domElement
 * @property {y0}  - minimum y  (0.0=bottom,1.0=top) in normalized coordinates on renderer domElement
 * @property {y1}  - maximum y  (0.0=bottom,1.0=top) in normalized coordinates on renderer domElement
 */


/**
 * Deriver from code from
 * @author Eberhard Graether / http://egraether.com/
 */


/**
 * @author Eberhard Graether / http://egraether.com/
 * @author Mark Lundin  / http://mark-lundin.com
 * @author Patrick Fuller / http://patrick-fuller.com
 */

// Xenios -- added target original parameter,
// -sign on pan
//  "R" key for reset
// Viewport
// Jquery stuff

      

/**
 * A class that manages a subviewer
 * @param {number} plane  - 0,1,2,3 if 0,1,2 then this is a planar viewer (no rotation allowed)
 * @param {array} target - target coordinates to initialize [x,y,z]
 * @param {Element} domElement - DomElement of underlying ThreeJs renderer (typically renderer.domElement)
 */

const STATE = { NONE: -1,
                ROTATE: 0,
                ZOOM: 1,
                PAN: 2,
                TOUCH_ROTATE: 3,
                TOUCH_ZOOM_PAN: 4 ,
                CLICK3D : 5 };
const EPS = 0.000001;
const KEYS = [ 65 /*A*/, 83 /*S*/, 68 /*D*/, 72 /*R*/ ];
/*
  const CHANGE_EVENT = { type: 'change' };
  const START_EVENT = { type: 'start'};
  const END_EVENT = { type: 'end'};
*/

/**
 *
 * A class that renders in a part of a WebGLRenderer

 */

class BisWebSubviewer {

    /**
       * @param{WebGLRenderer} renderer -- the underlying THREE.JS WebGLRenderer
       * @param{Number} plane - 0,1,2,3 to indicate the type of viewer (3=3D),0=YZ,1=XZ,2=XY
       * @param{Object} viewport - the viewer { x0;, x1:, y0:,y1:} where in the renderer should I draw
       * @param{Object} positioner - an object (e.g. bis3d_OrthogonalSlice ) that has a function positioncamera(camera)
       * @param{Object} opts - the options
       * @param{Number} rotateSpeed - the rotation speed (default=4.0)
       * @param{Number} zoomSpeed - the zoom speed (default=3.0)
       * @param{Number} panSpeed - the pan speed (default=5.0)
       * @param{Boolean} noZoom - if true no zoom (default=false)
       * @param{Boolean} noRotate - if true no rotate (default=false)
       * @param{Boolean} noRoll - if true no roll (default=false)
       * @param{Boolean} noPan - if true no pan (default=false)
       * @param{Number} width - the default size of the biggest object (used to set initial zoom)
       * @param{Number} depth - the maximum depth of the viewer (used to set initial clip planes)
       */
    constructor(parentviewer,renderer,plane,viewport,positioner,opts={}) {

        // The renderer
        this.parentviewer=parentviewer;
        this.renderer=renderer;
        this.domElement = this.renderer.domElement;

        // The plane and viewport
        this.plane=plane;
        this.normViewport= viewport;

        // The image element
        this.positioner=positioner; // a class that has a function position camera

        // The options
        this.opts={};

        this.coordinateChangeCallback=null;
        this.coordinate3DChangeCallback=null;
        this.mouseMovedCallback=null;
        this.callbackIndex=-1;
        this.rotateSpeed= opts.rotateSpeed || 4.0;
        this.zoomSpeed= opts.zoomSpeed || 3.0;
        this.panSpeed=opts.panSpeed || 5.0;

        this.noZoom= opts.noZoom || false;
        this.noRoll= opts.noRoll || false;
        this.noRotate= opts.noRotate || false;
        this.noPan = opts.noPan || false;
        this.parent=parent;
        this.width=opts.width || 100;
        this.depth=opts.depth || 200;

        // The scene
        this.scene = new THREE.Scene();
        this.light = new THREE.AmbientLight(0xffffff);
        this.scene.add(this.light);
        this.scene.doubleSided=true;

        // The camera
        this.camera = new THREE.OrthographicCamera(-this.width,this.width,
                                                   -this.width,this.width,
                                                   0.01,2.0*this.depth);

        this.rayCaster = null; //new THREE.Raycaster();

        
        this.enabled = true;
        this.initialize();

        this.eventListeners={};
        this.createEventListeners();
        this.addEventListeners();
        this.handleResize();
        //this.render();
    }

    initialize() {

        let target=this.positioner.positioncamera(this.camera);
        this.target = target.clone();

        // Derived Stuff

        this.flipmode=false;
        if (this.plane===3)
            this.flipmode=true;

        this.screen = { left: 0, top: 0, width: 0, height: 0 };

        if (this.plane>=0 && this.plane<=2) {
            this.noRotate=true;
            this.noRoll=true;
        }


        this.lastPosition = new THREE.Vector3();
        this.lastNormalizedCoordinates = [ 0,0 ];
        this.lastCoordinates = [ 0,0,0 ];

        this.internal= {
            _state : STATE.NONE,
            _prevState : STATE.NONE,
            _eye : new THREE.Vector3(),

            _rotateStart : new THREE.Vector3(),
            _rotateEnd : new THREE.Vector3(),

            _zoomStart : new THREE.Vector2(),
            _zoomEnd : new THREE.Vector2(),
            _zoomFactor : 1,

            _touchZoomDistanceStart : 0,
            _touchZoomDistanceEnd : 0,

            _panStart : new THREE.Vector2(),
            _panEnd : new THREE.Vector2()
        };

        // for reset
        this.target0 = this.target.clone();
        this.position0 = this.camera.position.clone();
        this.up0 = this.camera.up.clone();

        this.left0   = this.camera.left;
        this.right0  = this.camera.right;
        this.top0    = this.camera.top;
        this.bottom0 = this.camera.bottom;

        this.leftOrig  = this.camera.left;
        this.rightOrig = this.camera.right;
        this.topOrig  = this.camera.top;
        this.bottomOrig= this.camera.bottom;


        this.center0 = new THREE.Vector2((this.left0 + this.right0) / 2.0, (this.top0 + this.bottom0) / 2.0);

        /*    if (plane===2)
              console.log('Creating controls plane=',plane,_this.left0);*/

        this._temp = {
            mouseOnScreenVector : new THREE.Vector2(),
            projectVector : new THREE.Vector3(),
            cameraUp : new THREE.Vector3(),
            mouseChange: new THREE.Vector2(),
            pan : new THREE.Vector3(),
            mouseOnBall:  new THREE.Vector3(),
            axis : new THREE.Vector3(),
            quaternion : new THREE.Quaternion(),
        };
        // events
    }

    // ---------------------------------------------------------------------
    // ------------------------ State Manipulation Code --------------------
    // ---------------------------------------------------------------------

    /** @returns{Number} - the zoom factor */
    getZoomFactor() {   return this.internal._zoomFactor; }

    getScene() { return this.scene;}

    getCamera() { return this.camera;}

    /** @returns {String} -- Json string serialization of camera */
    serializeCamera() {

        let p = { };
        p.position = this.camera.position.clone();
        p.up=this.camera.up.clone();
        p.target=this.target.clone();
        p.zoomFactor=this.getZoomFactor();

        let keys = [ 'bottom','top','left','right' ];
        for (let i=0;i<keys.length;i++) {
            let k=keys[i];
            p[k]=this.camera[k];
        }
        return p;
    }

    /**
     * @param {Obj} -- dictionary serialization of camera
     * @param {Boolean} -- debug if true print stuff
     */
    parseCamera(obj,debug=0) {

        if (debug)
            console.log('Plane=',this.plane,'Input=',JSON.stringify(obj));

        this.target.copy( obj.target );
        this.camera.position.copy( obj.position );
        this.camera.up.copy( obj.up );

        this.internal._eye.subVectors( this.camera.position, this.target );

        this.camera.left = obj.left;
        this.camera.right = obj.right;
        this.camera.top =  obj.top;
        this.camera.bottom = obj.bottom;


        //console.log('In Parse Camera',this.plane,obj.zoomFactor);
        this.handleResize();

        this.camera.lookAt( this.target );
        this.lastPosition.copy( this.camera.position );
        this.zoomCamera(obj.zoomFactor);

        if (debug) {
            let p=this.serializeCamera();
            console.log('Output=',JSON.stringify(p,null,2));
        }


    }

    /** set the normalized viewport */
    setNormViewport(vp,resize=true) {

        this.normViewport=vp;

        let box = this.domElement.getBoundingClientRect();
        this.screen.left = box.left;
        this.screen.top = box.top;
        this.screen.width = box.width;
        this.screen.height = box.height;
        if (!resize)
            return;

        if (this.plane!==3) {

            this.left0 = this.camera.left;
            this.right0 = this.camera.right;
            this.top0 = this.camera.top;
            this.bottom0 = this.camera.bottom;
            this.center0.set((this.left0 + this.right0) / 2.0, (this.top0 + this.bottom0) / 2.0);
        } else {
            let v=JSON.parse(JSON.stringify(this.normViewport));
            v.old= v.old || v;
            let w=(v.x1-v.x0)*this.screen.width;

            if (w<50) {
                return;
            }

            let h1=(v.old.x1-v.old.x0)*this.screen.width;
            let h2=(v.old.y1-v.old.y0)*this.screen.height;
            let h=h2;
            if (h1>h)
                h=h1;

            let rx=0.5*(this.rightOrig-this.leftOrig);
            let cx=0.5*(this.leftOrig+this.rightOrig);
            let ry=0.5*(this.bottomOrig-this.topOrig);
            let cy=0.5*(this.topOrig+this.bottomOrig);

            let scale=h/w;

            this.left0  =cx-scale*rx;
            this.right0 =cx+scale*rx;
            this.top0   =cy-scale*ry;
            this.bottom0=cy+scale*ry;
            this.center0.set(cx,cy);
            this.camera.left = this.left0;
            this.camera.right = this.right0;
            this.camera.top = this.top0;
            this.camera.bottom = this.bottom0;
        }


    }

    /** returns the viewport of the subviewer */
    getNormViewport() { return this.normViewport; }



    // ---------------------------------------------------------------------
    // ------------------------ High Level Rendering Code ------------------
    // ---------------------------------------------------------------------

    /** handles resizing of dom  */
    handleResize() {

        //console.log('Handling Resize',this.plane);
        let box = this.domElement.getBoundingClientRect();
        this.screen.left = box.left;
        this.screen.top = box.top;
        this.screen.width = box.width;
        this.screen.height = box.height;
        this.informParentToRender();
    }

    informParentToRender() {
        this.parentviewer.informToRender();
    }

    

    /** Render -- invokes render on the subviewer  */
    render() {

        let vp=JSON.parse(JSON.stringify(this.normViewport));

        // Are we on
        if ((vp.x1-vp.x0)<=0.01 || (vp.y1-vp.y0<=0.01)) {
            // We are offline
            this.enabled=false;
            return false;
        }

        // Is screen visible
        vp.old= vp.old || vp;
        let i_vp = [1+vp.x0*this.screen.width,
                  1+vp.y0*this.screen.height,
                  (vp.x1-vp.x0)*this.screen.width,
                  (vp.y1-vp.y0)*this.screen.height];
        let i_vps = [1+vp.old.x0*this.screen.width,
                   1+vp.old.y0*this.screen.height,
                   (vp.old.x1-vp.old.x0)*this.screen.width,
                     (vp.old.y1-vp.old.y0)*this.screen.height];


        if (i_vp[0]<1 || i_vp[1]<1 || i_vp[2] <1 || i_vp[3] < 1) {
            this.enabled=false;
            return false;
        }

        this.enabled=true;

        // Place the camera correctly
        this.internal._eye.subVectors( this.camera.position, this.target );
        if ( !this.noRotate ) {
            this.rotateCamera();
        }
        if ( !this.noZoom ) {
            this.zoomCamera();
            this.camera.updateProjectionMatrix();
        }

        if ( !this.noPan ) {
            this.panCamera();
        }

        this.camera.position.addVectors( this.target, this.internal._eye );
        this.camera.lookAt( this.target );

        if ( this.lastPosition.distanceToSquared( this.camera.position ) > EPS ) {
            this.lastPosition.copy( this.camera.position );
        }


        // if (THREEJSREVISION>86) { Always the case
        // Swapped y in setViewport() and setScissor(). 43ae8e4 277c706 (@mrdoob)
        // In Three.js code
        // -- _viewport.set( x, y, width, height )
        // ++ _viewport.set( x, _height - y - height, width, height )
        // Our fix to map this


        if (THREE['REVISION']<101) {        
            i_vp[1]=this.screen.height-i_vp[1]-i_vp[3];
            i_vps[1]=this.screen.height-i_vps[1]-i_vps[3];
        }

        if (this.plane===3) {

            let maxi_vp=i_vps[2];
            if (i_vps[3]>i_vps[2])
                maxi_vp=i_vps[3];
            i_vp[0]=Math.round(i_vp[0]-0.5*(maxi_vp-i_vp[2]));
            i_vp[1]=Math.round(i_vp[1]-0.5*(maxi_vp-i_vp[3]));
            i_vp[2]=maxi_vp;
            i_vp[3]=maxi_vp;

            this.renderer.setViewport(i_vp[0],i_vp[1],i_vp[2],i_vp[2]);
            this.renderer.setScissor(i_vps[0],i_vps[1],i_vps[2],i_vps[3]);
            this.renderer.setScissorTest(true);
        }  else {


            this.renderer.setViewport(i_vp[0],i_vp[1],i_vp[2],i_vp[3]);
            this.renderer.setScissorTest(false);
        }

        if (this.flipmode)
            this.camera.projectionMatrix.elements[0]=-this.camera.projectionMatrix.elements[0];
        this.renderer.render(this.scene,this.camera);
        this.renderer.setScissorTest(false);

        if (this.flipmode)
            this.camera.projectionMatrix.elements[0]=-this.camera.projectionMatrix.elements[0];

        this.informParentToRender();
        return true;
    }

    /** reset -- reset all parameters */
    reset() {

        this.internal._state = STATE.NONE;
        this.internal._prevState = STATE.NONE;

        this.target.copy( this.target0 );
        this.camera.position.copy( this.position0 );
        this.camera.up.copy( this.up0 );

        this.internal._eye.subVectors( this.camera.position, this.target );

        this.camera.left = this.left0;
        this.camera.right = this.right0;
        this.camera.top = this.top0;
        this.camera.bottom = this.bottom0;

        this.camera.lookAt( this.target );

        this.lastPosition.copy( this.camera.position );
        this.zoomCamera(1.0/(this.internal._zoomFactor||1.0));
        this.informParentToRender();
    }

    // ---------------------------------------------------------------------
    // ----------------------------- Camera Manipulation -------------------
    // ---------------------------------------------------------------------

    /** check if mouse is on screen
     */
    getMouseOnScreen(pageX,pageY) {

        this._temp.mouseOnScreenVector.set(
            ( pageX - this.screen.left ) / this.screen.width,
            ( pageY - this.screen.top )  / this.screen.height
        );

        return this._temp.mouseOnScreenVector;
    }

    /** getMouse Projection -- xenios fixed
     */
    getMouseProjectionOnBall(nx,ny) {

        this._temp.mouseOnBall.set(nx,-ny,0.0);
        let length = this._temp.mouseOnBall.length();

        if ( this.noRoll ) {
            if ( length < Math.SQRT1_2 ) {
                this._temp.mouseOnBall.z = Math.sqrt( 1.0 - length*length );
            } else {
                this._temp.mouseOnBall.z = 0.5 / length;
            }
        } else if ( length > 1.0 ) {
            this._temp.mouseOnBall.normalize();
        } else {
            this._temp.mouseOnBall.z = Math.sqrt( 1.0 - length * length );
        }

        this.internal._eye.copy( this.camera.position ).sub( this.target );
        this._temp.projectVector.copy( this.camera.up ).setLength( this._temp.mouseOnBall.y );
        this._temp.projectVector.add(this._temp.cameraUp.copy( this.camera.up ).cross( this.internal._eye ).setLength( this._temp.mouseOnBall.x ) );
        this._temp.projectVector.add( this.internal._eye.setLength( this._temp.mouseOnBall.z ) );
        return this._temp.projectVector;
    }

    /** rotateCamera  */
    rotateCamera() {

        let angle = Math.acos( this.internal._rotateStart.dot( this.internal._rotateEnd ) / this.internal._rotateStart.length() / this.internal._rotateEnd.length() );

        if ( angle ) {

            this._temp.axis.crossVectors( this.internal._rotateStart, this.internal._rotateEnd ).normalize();
            angle *= this.rotateSpeed;
            this._temp.quaternion.setFromAxisAngle( this._temp.axis, -angle );

            this.internal._eye.applyQuaternion( this._temp.quaternion );
            this.camera.up.applyQuaternion( this._temp.quaternion );

            this.internal._rotateEnd.applyQuaternion( this._temp.quaternion );
            this.internal._rotateStart.copy( this.internal._rotateEnd );
        }
    }

    /** zoomCamera  */
    zoomCamera( manualfactor=null) {

        let manual=manualfactor;
        let factor=1.0;

        if (manual === null) {
            if ( this.internal._state === STATE.TOUCH_ZOOM_PAN ) {
                factor = 1.0+  (this.internal._touchZoomDistanceStart - this.internal._touchZoomDistanceEnd)* 0.05*this.zoomSpeed;
            } else {
                factor = 1.0 + ( this.internal._zoomEnd.y - this.internal._zoomStart.y ) * this.zoomSpeed;
            }
        } else {
            factor=manual;
        }

        if ( factor !== 1.0 && factor > 0.0 ) {
            this.internal._zoomFactor *= factor;

            this.camera.left = this.internal._zoomFactor * this.left0 + ( 1 - this.internal._zoomFactor ) *  this.center0.x;
            this.camera.right = this.internal._zoomFactor * this.right0 + ( 1 - this.internal._zoomFactor ) *  this.center0.x;
            this.camera.top = this.internal._zoomFactor * this.top0 + ( 1 - this.internal._zoomFactor ) *  this.center0.y;
            this.camera.bottom = this.internal._zoomFactor * this.bottom0 + ( 1 - this.internal._zoomFactor ) *  this.center0.y;

            this.internal._zoomStart.copy( this.internal._zoomEnd );
            this.internal._touchZoomDistanceStart = this.internal._touchZoomDistanceEnd;
        }

    }

    /** panCamera
     */
    panCamera() {

        /*var mouseChange = new THREE.Vector2(),
          cameraUp = new THREE.Vector3(),
          pan = new THREE.Vector3();*/

        this._temp.mouseChange.copy( this.internal._panEnd ).sub( this.internal._panStart );

        if ( this._temp.mouseChange.lengthSq() ) {

            this._temp.mouseChange.multiplyScalar( this.internal._eye.length() * this.panSpeed );
            this._temp.pan.copy( this.internal._eye ).cross( this.camera.up ).setLength( -this._temp.mouseChange.x );
            this._temp.pan.add( this._temp.cameraUp.copy( this.camera.up ).setLength( -this._temp.mouseChange.y ) );
            this.camera.position.add( this._temp.pan );
            this.target.add( this._temp.pan );
            this.internal._panStart.copy( this.internal._panEnd );
        }
    }

    // ---------------------------------------------------------------------
    // -----------------------------   Event Handling        ---------------
    // ---------------------------------------------------------------------
    // listeners
    /** keydown listener */
    keydown(event ) {

        if ( this.enabled === false )
            return;

        window.removeEventListener( 'keydown', this.eventListeners.keydown );

        this.internal._prevState = this.internal._state;

        if ( this.internal._state !== STATE.NONE ) {
            return;
        }

        if ( event.keyCode === KEYS[ STATE.ROTATE ] && !this.noRotate ) {
            this.internal._state = STATE.ROTATE;
        } else if ( event.keyCode === KEYS[ STATE.ZOOM ] && !this.noZoom ) {
            this.internal._state = STATE.ZOOM;
        } else if ( event.keyCode === KEYS[ STATE.PAN ] && !this.noPan ) {
            this.internal._state = STATE.PAN;
        } else if ( event.keyCode === 82) {
            this.reset();
        }

    }

    /** keyup listener */
    keyup() {

        if ( this.enabled === false ) return;
        this.internal._state = this.internal._prevState;
        window.addEventListener( 'keydown', this.eventListeners.keydown, false );
    }

    /** mouseinviewport -- for BioImage Suite check if mouse event is inside controller's viewport
        as renderer is split into multiple scenes each with it's own controller
    */
    mouseinviewport(event) {

        if ( this.enabled === false ) return false;

        let offset = $(this.domElement).offset();
        let ex=event.clientX-offset.left+$(window).scrollLeft();
        let ey=event.clientY-offset.top+$(window).scrollTop();

        ey=this.screen.height-(ey+1);
        let vp;
        if (this.plane===3) {
            vp = [ this.normViewport.old.x0*this.screen.width ,
                this.normViewport.old.x1*this.screen.width ,
                this.normViewport.old.y0*this.screen.height,
                this.normViewport.old.y1*this.screen.height ];
        } else {
            vp = [ this.normViewport.x0*this.screen.width ,
                this.normViewport.x1*this.screen.width ,
                this.normViewport.y0*this.screen.height,
                this.normViewport.y1*this.screen.height ];
        }


        if (ex <= vp[0] || ex >= vp[1] || ey <= vp[2] || ey>=vp[3])
            return false;

        let n = new THREE.Vector3(
            2.0*(ex-vp[0])/(vp[1]-vp[0])-1.0,
            2.0*(ey-vp[2])/(vp[3]-vp[2])-1.0,
            1.0);
        this.lastNormalizedCoordinates[0]=n.x;
        if (this.plane===3) {
            // Scale y coordinate using the proper ratio
            this.lastNormalizedCoordinates[1]=n.y*this.normViewport.ratio;
        } else {
            this.lastNormalizedCoordinates[1]=n.y;
        }

        let w=n.unproject(this.camera);
        this.lastCoordinates[0]=w.x;
        this.lastCoordinates[1]=w.y;
        this.lastCoordinates[2]=w.z;
        return true;
    }

    /** coordinate callback -- calls the callback stored in this.coordinateChangeCallback on `click' update
        parameters are lastcoordinates [ x,y,z], the plane and the state
    */
    sendCoordinatesChangedEvent(state) {
        this.informParentToRender();
        if (this.plane>=0 && this.plane<=2) {
            if ( typeof this.coordinateChangeCallback == 'function' ) {
                this.coordinateChangeCallback(this.lastCoordinates,
                                              this.plane,
                                              state);
            }
        } else if (this.plane===3) {
            if ( typeof this.coordinateChangeCallback == 'function' ) {
                this.coordinateChangeCallback(this.lastCoordinates,
                                              this.plane,
                                              state);
            }
        }   
    }

    sendMouseMovedEvent(state) {
        this.informParentToRender();
        
        if ( typeof this.mouseMovedCallback == 'function' ) {
            this.mouseMovedCallback(state,this.callbackIndex);
        }
    }


    /* mouse down handler*/
    mousedown( event ) {
        if (!this.mouseinviewport(event))
            return;

        if ( this.internal._state === STATE.NONE ) {
            this.internal._state = event.button;
            // 3D Clicking
            //if (!this.noRotate && event.shiftKey)
            //this.internal._state=STATE.CLICK3D;
        }

        let click3d=false;

        if ( this.internal._state === STATE.ROTATE && !this.noRotate ) {
            let x=this.getMouseProjectionOnBall( -this.lastNormalizedCoordinates[0],this.lastNormalizedCoordinates[1] );
            this.internal._rotateStart.copy( x);
            this.internal._rotateEnd.copy( this.internal._rotateStart );

        } else if ( this.internal._state === STATE.ZOOM && !this.noZoom ) {
            this.internal._zoomStart.copy(this.getMouseOnScreen( event.pageX, event.pageY ) );
            this.internal._zoomEnd.copy(this.internal._zoomStart);

        } else if ( this.internal._state === STATE.PAN && !this.noPan ) {
            this.internal._panStart.copy( this.getMouseOnScreen( event.pageX, event.pageY ) );
            this.internal._panEnd.copy(this.internal._panStart);

        } else if (this.internal._state === STATE.CLICK3D) {
            if (this.rayCaster === null) {
                this.rayCaster=new THREE.Raycaster();
                console.log('PRecision=',this.rayCaster.linePrecision);
                this.rayCaster.linePrecision=this.width*0.05;
                console.log('PRecision2=',this.rayCaster.linePrecision);
            }
            
            this.getMouseOnScreen( event.pageX, event.pageY );
           
            //this._temp.mouseOnScreenVector

            this._temp.mouseOnScreenVector.x=-this._temp.mouseOnScreenVector.x;
            
            this.rayCaster.setFromCamera(this._temp.mouseOnScreenVector, this.camera);

            let intersects = this.rayCaster.intersectObjects(this.scene.children, true);

            if (intersects.length > 0) {
                let pt=intersects[0].point;
                console.log('Point=',pt);
                this.lastCoordinates=[ pt.x,pt.y,pt.z];
                this.plane=3;
                this.state=0;
                click3d=true;
            } 
        }


        document.addEventListener( 'mousemove', this.eventListeners.mousemove, false );
        document.addEventListener( 'mouseup', this.eventListeners.mouseup, false );

        if ( click3d === true || (this.internal._state === STATE.ROTATE && this.noRotate)) {
            this.sendCoordinatesChangedEvent(0);
        } else {
            this.sendMouseMovedEvent(1);
        }

    }

    /* mouse move handler*/
    mousemove(event) {

        if (!this.mouseinviewport(event))
            return this.mouseup(event);

        event.preventDefault();
        event.stopPropagation();

        if ( this.internal._state === STATE.ROTATE && !this.noRotate ) {
            this.internal._rotateEnd.copy( this.getMouseProjectionOnBall( -this.lastNormalizedCoordinates[0],this.lastNormalizedCoordinates[1] ) );
        } else if ( this.internal._state === STATE.ZOOM && !this.noZoom ) {
            this.internal._zoomEnd.copy( this.getMouseOnScreen( event.pageX, event.pageY ) );
        } else if ( this.internal._state === STATE.PAN && !this.noPan ) {
            this.internal._panEnd.copy( this.getMouseOnScreen( event.pageX, event.pageY ) );
        }  

        if ( this.internal._state === STATE.ROTATE && this.noRotate) {
            this.sendCoordinatesChangedEvent(1);
        }  else if (this.internal._state !== STATE.ZOOM && this.internal._state !== STATE.CLICK3D)  {
            this.sendMouseMovedEvent(1);
        }
    }

    /* mouse up handler*/
    mouseup(event ) {

        if ( this.enabled === false )
            return;

        event.preventDefault();
        event.stopPropagation();

        if ( this.internal._state === STATE.ROTATE && this.noRotate) {
            this.sendCoordinatesChangedEvent(2);
        }  else if (this.internal._state !== STATE.ZOOM && this.internal._state !== STATE.CLICK3D)  {
            this.sendMouseMovedEvent(2);
        }

        this.internal._state = STATE.NONE;

        document.removeEventListener( 'mousemove', this.eventListeners.mousemove );
        document.removeEventListener( 'mouseup', this.eventListeners.mouseup );

    }

    /* mouse wheel handler*/
    mousewheel(event ) {

        if ( this.enabled === false ) return;

        //event.preventDefault();
        event.stopPropagation();

        let delta = 0;

        if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9
            delta = event.wheelDelta / 40;
        } else if ( event.detail ) { // Firefox
            delta = - event.detail / 3;
        }

        this.internal._zoomStart.y += delta * 0.01;
    }

    /* touch start handler*/
    touchstart(event) {


        if ( this.enabled === false )
            return false;

        if (!this.mouseinviewport(event.touches[0]))
            return;

        if (event.touches.length>1 && !this.mouseinviewport(event.touches[1]))
            return;

        inobounce.enable();



        if (event.touches.length===1) {
            if ( this.noRotate) {
                this.sendCoordinatesChangedEvent(0);
                return;
            } else if (this.internal._state === STATE.TOUCH_ROTATE) {

                this.sendMouseMovedEvent(0);
            }
        }

        if ( event.touches.length === 1) {
            if (!this.noRotate) {
                this.internal._state = STATE.TOUCH_ROTATE;
				let x=this.getMouseProjectionOnBall( -this.lastNormalizedCoordinates[0],this.lastNormalizedCoordinates[1] );
				this.internal._rotateStart.copy( x);
				this.internal._rotateEnd.copy( this.internal._rotateStart );
            }
        } else if (event.touches.length===2) {
            this.internal._state = STATE.TOUCH_ZOOM_PAN;
            let dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
            let dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
            this._touchZoomDistanceEnd = this._touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );
        } else {
            this.internal._state = STATE.NONE;
        }
    }

    /* touch move handler*/
    touchmove(event ) {

        if ( this.enabled === false ) return;

        if (event.touches.length==1) {
            if (!this.mouseinviewport(event.touches[0]))
                return;
		}


        if (event.touches.length>1 && !this.mouseinviewport(event.touches[1]))
            return;

        if ( event.touches.length ===1) {
            this.internal._rotateEnd.copy( this.getMouseProjectionOnBall( -this.lastNormalizedCoordinates[0],this.lastNormalizedCoordinates[1] ) );
        } else if ( event.touches.length ===2) {
            let dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
            let dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
            this._touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );
        } else {
            this.internal._state = STATE.NONE;
        }

		if ( this.noRotate) {
            this.sendCoordinatesChangedEvent(1);
            return;
        } else {
            this.sendMouseMovedEvent(1);
            return;
        }
    }

    /* touch end handler*/
    touchend(event) {


        if ( this.enabled === false ) return;


        if ( event.touches.length === 1) {
            this.internal._rotateEnd.copy( this.getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
            this.internal._rotateStart.copy( this.internal._rotateEnd );
        } else         if ( event.touches.length === 2) {
            this._touchZoomDistanceStart = this._touchZoomDistanceEnd = 0;
        }

        inobounce.disable();
        this.internal._state = STATE.NONE;
    }

    /** remove all event listeners */
    removeEventListeners() {

        this.domElement.removeEventListener( 'contextmenu', this.eventListeners.contextmenulistener,false);
        this.domElement.removeEventListener( 'mousedown', this.eventListeners.mousedown, false );
        document.removeEventListener( 'mousemove', this.eventListeners.mousemove );
        document.removeEventListener( 'mouseup', this.eventListeners.mouseup );

        this.domElement.removeEventListener( 'mousewheel', this.eventListeners.mousewheel, false );
        this.domElement.removeEventListener( 'DOMMouseScroll', this.eventListeners.mousewheel, false ); // firefox

        this.domElement.removeEventListener( 'touchstart', this.eventListeners.touchstart, { 'passive' : true } );
        this.domElement.removeEventListener( 'touchend', this.eventListeners.touchend, { 'passive' : true } );
        this.domElement.removeEventListener( 'touchmove', this.eventListeners.touchmove, { 'passive' : true } );

        window.removeEventListener( 'keydown', this.eventListeners.keydown, false );
        window.removeEventListener( 'keyup', this.eventListeners.keyup, false );
    }

    createEventListeners() {

        const self=this;
        this.eventListeners={
            contextmenulistener : function(event) { event.preventDefault(); },
            mousedown : function(event) {  self.mousedown(event);},
            mouseup : function(event) {  self.mouseup(event);},
            mousemove : function(event) {  self.mousemove(event);},
            mousewheel : function(event) {  self.mousewheel(event);},
            keydown : function(event) {  self.keydown(event);},
            keyup : function(event) {  self.keyup(event);},
            touchstart : function(event) {  self.touchstart(event);},
            touchmove : function(event) {  self.touchmove(event);},
            touchend : function(event) {  self.touchend(event);},
        };
    }

    /** add event listeners */
    addEventListeners() {


        this.domElement.addEventListener( 'contextmenu', this.eventListeners.contextmenulistener, false);
        this.domElement.addEventListener( 'mousedown', this.eventListeners.mousedown,
                                           { 'capture' : false, 'passive' : true }
                                         );

        this.domElement.addEventListener( 'mousewheel', this.eventListeners.mousewheel, { 'capture' : false, 'passive' : true } );
        this.domElement.addEventListener( 'DOMMouseScroll', this.eventListeners.mousewheel, { 'capture' : false, 'passive' : true } ); // firefox

        this.domElement.addEventListener( 'touchstart', this.eventListeners.touchstart, { 'capture' : false, 'passive' : true } );
        this.domElement.addEventListener( 'touchend', this.eventListeners.touchend, { 'capture' : false, 'passive' : true } );
        this.domElement.addEventListener( 'touchmove', this.eventListeners.touchmove, { 'capture' : false, 'passive' : true } );

        window.addEventListener( 'keydown', this.eventListeners.keydown, { 'capture' : false, 'passive' : true } );
        window.addEventListener( 'keyup', this.eventListeners.keyup, { 'capture' : false, 'passive' : true } );
    }


    /*        it will still be bound to the dom and send callbacks even if we don't want them */
    remove () {
        this.removeEventListeners();
        this.enabled=false;
    }
}



if (typeof THREE !== 'undefined') {
    module.exports = BisWebSubviewer;
} else {
    console.log('----- No THREE.js loaded, hence no 3D rendering available');
}
