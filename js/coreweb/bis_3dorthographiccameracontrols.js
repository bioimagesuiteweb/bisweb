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

/* global window, document */

"use strict";

const THREE = require('three');
const $=require('jquery');
const inobounce=require('inobounce.js');

/** 
 * @file Browser module. Contains {@link Bis_3dOrthographicCameraControls}
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
 * A class that inherits from ThreeJS-EventDispatcher to manage a camera.
 * <B> Must call this.remove() when deleting to eliminate events otherwise this guy will hang around!</B>
 * @constructs Bis_3dOrthograpicCameraControls
 * @param {ThreeJS-OrthographicCamera} camera - the camera to manage
 * @param {number} plane  - 0,1,2,3 if 0,1,2 then this is a planar viewer (no rotation allowed)
 * @param {array} target - target coordinates to initialize [x,y,z]
 * @param {Element} domElement - DomElement of underlying ThreeJs renderer (typically renderer.domElement)
 */

var bisOrthographicCameraControls = function ( camera, plane, target, domElement ) {

    const THREEJSREVISION=parseInt(THREE.REVISION);
    
    var _this = this;
    var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4 };
    
    this.camera = camera;
    this.plane  = plane;
    this.domElement = ( domElement !== undefined ) ? domElement : document;

    // API
    
    this.enabled = true;

    /** viewport of controller of type {@link Bis_Viewport}. This is set when layout is changed etc.*/
    this.normViewport = { x0:0.0,y0:0.0,x1:1.0,y1:1.0 };

    
    this.screen = { left: 0, top: 0, width: 0, height: 0 };
    
    this.rotateSpeed = 1.0;
    this.zoomSpeed = 1.2;
    this.panSpeed = 0.3;

    this.noRotate = false;
    this.noZoom = false;
    this.noPan = false;
    this.noRoll = false;
    
    if (this.plane>=0 && this.plane<=2) {
        _this.noRotate=true;
        _this.noRoll=true;
    }


    this.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/, 72 /*R*/ ];
    this.coordinateChangeCallback=null;

    
    // internals

    this.target = target.clone();

    var EPS = 0.000001;

    var lastPosition = new THREE.Vector3();
    this.lastNormalizedCoordinates = [ 0,0 ];
    this.lastCoordinates = [ 0,0,0 ];
    
    var _state = STATE.NONE,
        _prevState = STATE.NONE,
        _eye = new THREE.Vector3(),

        _rotateStart = new THREE.Vector3(),
        _rotateEnd = new THREE.Vector3(),
        
        _zoomStart = new THREE.Vector2(),
        _zoomEnd = new THREE.Vector2(),
        _zoomFactor = 1,
        
        _touchZoomDistanceStart = 0,
        _touchZoomDistanceEnd = 0,
        
        _panStart = new THREE.Vector2(),
        _panEnd = new THREE.Vector2();
    
    // for reset
    this.target0 = this.target.clone();
    this.position0 = this.camera.position.clone();
    this.up0 = this.camera.up.clone();
    this.left0 = this.camera.left;
    this.right0 = this.camera.right;
    this.top0 = this.camera.top;
    this.bottom0 = this.camera.bottom;
    this.center0 = new THREE.Vector2((this.left0 + this.right0) / 2.0, (this.top0 + this.bottom0) / 2.0);

    /*    if (plane===2)
          console.log('Creating controls plane=',plane,_this.left0);*/
    

    // events
    
    var changeEvent = { type: 'change' };
    var startEvent = { type: 'start'};
    var endEvent = { type: 'end'};

    this.getZoomFactor = function() {
        return _zoomFactor;
    };

    this.serializeCamera = function() {
        
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
    };

    this.parseCamera = function(obj,debug=0) {

        if (debug)
            console.log('Input=',JSON.stringify(obj,null,2));
        
        _this.target.copy( obj.target );
        _this.camera.position.copy( obj.position );
        _this.camera.up.copy( obj.up );
        
        _eye.subVectors( _this.camera.position, _this.target );
        
        _this.camera.left = obj.left;
        _this.camera.right = obj.right;
        _this.camera.top =  obj.top;
        _this.camera.bottom = obj.bottom;
        _this.camera.lookAt( _this.target );
        _this.dispatchEvent( changeEvent );
        lastPosition.copy( _this.camera.position );
        _this.zoomCamera(obj.zoomFactor);

        let p=this.serializeCamera();
        if (debug)
            console.log('Output=',JSON.stringify(p,null,2));
        
    };
    
    
    // methods
    /** handles resizing of dom
     */
    this.handleResize = function () {
        
        var box = this.domElement.getBoundingClientRect();
        this.screen.left = box.left;
        this.screen.top = box.top;
        this.screen.width = box.width;
        this.screen.height = box.height;
        
        this.left0 = this.camera.left;
        this.right0 = this.camera.right;
        this.top0 = this.camera.top;
        this.bottom0 = this.camera.bottom;
        this.center0.set((this.left0 + this.right0) / 2.0, (this.top0 + this.bottom0) / 2.0);
        /*      if (this.plane===2) {
                console.log('Handle resize plane=',this.plane,' left0=',this.left0);
                }*/
    };
    
    // methods
    /** handles event (mouse, touch keyboard)
     */
    this.handleEvent = function ( event ) {
        
        if ( typeof this[ event.type ] == 'function' ) {
            this[ event.type ]( event );
        }
    };
    

    /** check if mouse is on screen
     */
    var getMouseOnScreen = ( function () {
        
        var vector = new THREE.Vector2();
        return function ( pageX, pageY ) {
            vector.set(
                ( pageX - _this.screen.left ) / _this.screen.width,
                ( pageY - _this.screen.top ) / _this.screen.height
            );
            
            return vector;
            
        };
        
    }() );
    
    /** getMouse Projection -- xenios fixed 
     */
    var getMouseProjectionOnBall = ( function () {

        var vector = new THREE.Vector3();
        var cameraUp = new THREE.Vector3();
        var mouseOnBall = new THREE.Vector3();
        
        return function ( nx, ny ) {
            
            mouseOnBall.set(nx,-ny,0.0);
            //              ( pageX - _this.screen.width * 0.5 - _this.screen.left ) / (_this.screen.width*0.5),
            //              ( _this.screen.height * 0.5 + _this.screen.top - pageY ) / (_this.screen.height*0.5),
            //              0.0
            //          );
            
            var length = mouseOnBall.length();
            
            if ( _this.noRoll ) {
                if ( length < Math.SQRT1_2 ) {
                    mouseOnBall.z = Math.sqrt( 1.0 - length*length );
                } else {
                    mouseOnBall.z = 0.5 / length;
                }
            } else if ( length > 1.0 ) {
                mouseOnBall.normalize();
            } else {
                mouseOnBall.z = Math.sqrt( 1.0 - length * length );
            }
            
            _eye.copy( _this.camera.position ).sub( _this.target );
            
            vector.copy( _this.camera.up ).setLength( mouseOnBall.y );
            vector.add( cameraUp.copy( _this.camera.up ).cross( _eye ).setLength( mouseOnBall.x ) );
            vector.add( _eye.setLength( mouseOnBall.z ) );
            
            return vector;
            
        };
    }() );
    
    /** rotateCamera
     */
    this.rotateCamera = (function(){

        var axis = new THREE.Vector3(),
            quaternion = new THREE.Quaternion();
        
        return function () {
            
            var angle = Math.acos( _rotateStart.dot( _rotateEnd ) / _rotateStart.length() / _rotateEnd.length() );
            
            if ( angle ) {
                
                axis.crossVectors( _rotateStart, _rotateEnd ).normalize();
                
                angle *= _this.rotateSpeed;
                
                quaternion.setFromAxisAngle( axis, -angle );
                
                _eye.applyQuaternion( quaternion );
                _this.camera.up.applyQuaternion( quaternion );
                
                _rotateEnd.applyQuaternion( quaternion );
                _rotateStart.copy( _rotateEnd );
            }
        };
    }());

    /** zoomCamera
     */
    this.zoomCamera = function ( manualfactor) {

        let manual=manualfactor || null;
        var factor=1.0;

        if (manual === null) {
            if ( _state === STATE.TOUCH_ZOOM_PAN ) {
                factor = 1.0+  (_touchZoomDistanceStart - _touchZoomDistanceEnd)* 0.05*_this.zoomSpeed;
            } else {
                factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;
            }
        } else {
            factor=manual;
        }

        if ( factor !== 1.0 && factor > 0.0 ) {
            _zoomFactor *= factor;

            _this.camera.left = _zoomFactor * _this.left0 + ( 1 - _zoomFactor ) *  _this.center0.x;
            _this.camera.right = _zoomFactor * _this.right0 + ( 1 - _zoomFactor ) *  _this.center0.x;
            _this.camera.top = _zoomFactor * _this.top0 + ( 1 - _zoomFactor ) *  _this.center0.y;
            _this.camera.bottom = _zoomFactor * _this.bottom0 + ( 1 - _zoomFactor ) *  _this.center0.y;
            /*      if (_this.plane===2) {
                    console.log('Updating zooms = ',_zoomFactor, ' from factor');
                    console.log('Zooming resize plane=',this.plane,' left0=',_this.left0,' left=',_this.camera.left);
                    }*/
            _zoomStart.copy( _zoomEnd );
            _touchZoomDistanceStart = _touchZoomDistanceEnd;
        }
        
    };
    
    /** panCamera
     */
    this.panCamera = (function(){
        
        var mouseChange = new THREE.Vector2(),
            cameraUp = new THREE.Vector3(),
            pan = new THREE.Vector3();
        
        return function () {
            
            mouseChange.copy( _panEnd ).sub( _panStart );
            
            if ( mouseChange.lengthSq() ) {
                
                mouseChange.multiplyScalar( _eye.length() * _this.panSpeed );
                
                pan.copy( _eye ).cross( _this.camera.up ).setLength( mouseChange.x );
                // -mouseChange.y is a Xenios EDIT
                pan.add( cameraUp.copy( _this.camera.up ).setLength( -mouseChange.y ) );
                
                _this.camera.position.add( pan );
                _this.target.add( pan );
                _panStart.copy( _panEnd );
            }
        };
    }());

    
    /** update -- updates the renderer's viewport among other things
     */
    this.update = function ( renderer) {

        renderer = renderer || null;
        
        _eye.subVectors( _this.camera.position, _this.target );
        if ( !_this.noRotate ) {
            _this.rotateCamera();
        }
        if ( !_this.noZoom ) {
            _this.zoomCamera();
            _this.camera.updateProjectionMatrix();
        }
        
        if ( !_this.noPan ) {
            _this.panCamera();
        }

        _this.camera.position.addVectors( _this.target, _eye );
        _this.camera.lookAt( _this.target );

        if ( lastPosition.distanceToSquared( _this.camera.position ) > EPS ) {
            _this.dispatchEvent( changeEvent );
            lastPosition.copy( _this.camera.position );
        }

        if (renderer !== null) {
            var v=this.normViewport;
            var vp = [1+v.x0*this.screen.width,
                      1+v.y0*this.screen.height,
                      (v.x1-v.x0)*this.screen.width,
                      (v.y1-v.y0)*this.screen.height];
            if (vp[0]>0 && vp[1]>0 && vp[2] >0 && vp[3] > 0) {
                let top=vp[1];
                if (THREEJSREVISION>86) {
                    // Swapped y in setViewport() and setScissor(). 43ae8e4 277c706 (@mrdoob)
                    // In Three.js code
                    // -- _viewport.set( x, y, width, height )
                    // ++ _viewport.set( x, _height - y - height, width, height )
                    // Our fix to map this 
                    top=this.screen.height-vp[1]-vp[3];
                }
                renderer.setViewport(vp[0],top,vp[2],vp[3]);
                return true;
            }
            return false;
        }
        return true;
    };
    
    /** reset -- reset all parameters */
    this.reset = function () {
        
        _state = STATE.NONE;
        _prevState = STATE.NONE;
        
        _this.target.copy( _this.target0 );
        _this.camera.position.copy( _this.position0 );
        _this.camera.up.copy( _this.up0 );
        
        _eye.subVectors( _this.camera.position, _this.target );
        
        _this.camera.left = _this.left0;
        _this.camera.right = _this.right0;
        _this.camera.top = _this.top0;
        _this.camera.bottom = _this.bottom0;
        
        _this.camera.lookAt( _this.target );
        
        _this.dispatchEvent( changeEvent );
        
        lastPosition.copy( _this.camera.position );

        //          _state._zoomStart = new THREE.Vector2();
        //          _state._zoomEnd = new THREE.Vector2();
        _this.zoomCamera(1.0/(_zoomFactor||1.0));
    };
    
    // listeners
    /** keydown listener */
    function keydown( event ) {

        if ( _this.enabled === false ) return;
        
        window.removeEventListener( 'keydown', keydown );
        
        _prevState = _state;
        
        if ( _state !== STATE.NONE ) {
            return;
        }
        
        if ( event.keyCode === _this.keys[ STATE.ROTATE ] && !_this.noRotate ) {
            _state = STATE.ROTATE;
        } else if ( event.keyCode === _this.keys[ STATE.ZOOM ] && !_this.noZoom ) {
            _state = STATE.ZOOM;
        } else if ( event.keyCode === _this.keys[ STATE.PAN ] && !_this.noPan ) {
            _state = STATE.PAN;
        } else if ( event.keyCode === 82) {
            _this.reset();
        }
    }

    /** keyup listener */
    function keyup( ) {

        if ( _this.enabled === false ) return;
        _state = _prevState;
        window.addEventListener( 'keydown', keydown, false );
    }

    /** mouseinviewport -- for BioImage Suite check if mouse event is inside controller's viewport
        as renderer is split into multiple scenes each with it's own controller
    */
    function mouseinviewport(event) {

        if ( _this.enabled === false ) return false;

        var offset = $(_this.domElement).offset();
        var ex=event.clientX-offset.left+$(window).scrollLeft();
        var ey=event.clientY-offset.top+$(window).scrollTop();
        
        ey=_this.screen.height-(ey+1);
        var vp = [ _this.normViewport.x0*_this.screen.width ,
                   _this.normViewport.x1*_this.screen.width ,
                   _this.normViewport.y0*_this.screen.height,
                   _this.normViewport.y1*_this.screen.height ];
        

        if (ex <= vp[0] || ex >= vp[1] || ey <= vp[2] || ey>=vp[3])
            return false;
        
        var n = new THREE.Vector3(
            2.0*(ex-vp[0])/(vp[1]-vp[0])-1.0,
            2.0*(ey-vp[2])/(vp[3]-vp[2])-1.0,
            1.0);
        _this.lastNormalizedCoordinates[0]=n.x;
        _this.lastNormalizedCoordinates[1]=n.y;

        var w=n.unproject(_this.camera);
        _this.lastCoordinates[0]=w.x;
        _this.lastCoordinates[1]=w.y;
        _this.lastCoordinates[2]=w.z;
        return true;
    }

    /** coordinate cllback -- calls the callback stored in this.coordinateChangeCallback on `click' update
        parameters are lastcoordinates [ x,y,z], the plane and the state
    */
    function coordinateCallback(state) {

        if (_this.plane>=0 && _this.plane<=2) {
            if ( typeof _this.coordinateChangeCallback == 'function' ) {
                _this.coordinateChangeCallback(_this.lastCoordinates,_this.plane,state);
            }
        }
    }
    
    /* Prevent mouse down context menu*/
    function contextmenulistener(event) {
        event.preventDefault();
    }
    
    /* mouse down handler*/
    function mousedown( event ) {

        if (!mouseinviewport(event))
            return;


        //event.preventDefault();
        //event.stopPropagation();
        
        if ( _state === STATE.NONE ) {
            _state = event.button;
        }
        
        if ( _state === STATE.ROTATE && !_this.noRotate ) {
            _rotateStart.copy( getMouseProjectionOnBall( _this.lastNormalizedCoordinates[0],_this.lastNormalizedCoordinates[1] ) );
            _rotateEnd.copy( _rotateStart );
            
        } else if ( _state === STATE.ZOOM && !_this.noZoom ) {
            _zoomStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
            _zoomEnd.copy(_zoomStart);
            
        } else if ( _state === STATE.PAN && !_this.noPan ) {
            _panStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
            _panEnd.copy(_panStart);
            
        } 
        
        document.addEventListener( 'mousemove', mousemove, false );
        document.addEventListener( 'mouseup', mouseup, false );
        
        _this.dispatchEvent( startEvent );

        if ( _state === STATE.ROTATE && _this.noRotate) {
            coordinateCallback(0);
        }
        
    }


    /* mouse move handler*/
    function mousemove( event ) {

        if (!mouseinviewport(event))
            return mouseup(event);
        
        event.preventDefault();
        event.stopPropagation();
        
        if ( _state === STATE.ROTATE && !_this.noRotate ) {
            _rotateEnd.copy( getMouseProjectionOnBall( _this.lastNormalizedCoordinates[0],_this.lastNormalizedCoordinates[1] ) );
        } else if ( _state === STATE.ZOOM && !_this.noZoom ) {
            _zoomEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );
        } else if ( _state === STATE.PAN && !_this.noPan ) {
            _panEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );
        }

        if ( _state === STATE.ROTATE && _this.noRotate) {
            coordinateCallback(1);
        }
    }

    /* mouse up handler*/
    function mouseup( event ) {
        
        if ( _this.enabled === false ) return;
        
        event.preventDefault();
        event.stopPropagation();

        if ( _state === STATE.ROTATE && _this.noRotate) {
            coordinateCallback(2);
        }
        
        _state = STATE.NONE;
        
        document.removeEventListener( 'mousemove', mousemove );
        document.removeEventListener( 'mouseup', mouseup );
        
        _this.dispatchEvent( endEvent );
        
    }

    /* mouse wheel handler*/
    function mousewheel( event ) {

        if ( _this.enabled === false ) return;
        
        //event.preventDefault();
        event.stopPropagation();
        
        var delta = 0;
        
        if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9
            delta = event.wheelDelta / 40;
        } else if ( event.detail ) { // Firefox
            delta = - event.detail / 3;
        }
        
        _zoomStart.y += delta * 0.01;
        _this.dispatchEvent( startEvent );
        _this.dispatchEvent( endEvent );
        
    }

    /* touch start handler*/
    function touchstart( event ) {


        if ( _this.enabled === false ) 
            return false;

        if (!mouseinviewport(event.touches[0]))
            return;

        if (event.touches.length>1 && !mouseinviewport(event.touches[1]))
            return;


        inobounce.enable();
        
        if (event.touches.length==1) {

            if ( _this.noRotate) {
                coordinateCallback(0);
                return;
            }
        }
        


        
        switch ( event.touches.length ) {
        case 1:
            if (!_this.noRotate) {
                _state = STATE.TOUCH_ROTATE;
                _rotateStart.copy( getMouseProjectionOnBall( _this.lastNormalizedCoordinates[0],_this.lastNormalizedCoordinates[1] ) );
                _rotateEnd.copy( _rotateStart );
            } 
            break;
            
        case 2:
            _state = STATE.TOUCH_ZOOM_PAN;
            var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
            var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
            _touchZoomDistanceEnd = _touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );
            
            /*            var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
                          var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
                          _panStart.copy( getMouseOnScreen( x, y ) );
                          _panEnd.copy( _panStart );*/
            break;
            
        default:
            _state = STATE.NONE;
            
        }
        _this.dispatchEvent( startEvent );
    }
    
    /* touch move handler*/
    function touchmove( event ) {

        if ( _this.enabled === false ) return;

        if (event.touches.length==1) {
            if (!mouseinviewport(event.touches[0]))
                return;

            if ( _this.noRotate) {
                coordinateCallback(1);
                return;
            }
        }

        if (event.touches.length>1 && !mouseinviewport(event.touches[1]))
            return;
        
        switch ( event.touches.length ) {
        case 1:
            _rotateEnd.copy( getMouseProjectionOnBall( _this.lastNormalizedCoordinates[0],_this.lastNormalizedCoordinates[1] ) );
            break;

        case 2:
            var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
            var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
            _touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );
            
            //            var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
            //            var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
            //            _panEnd.copy( getMouseOnScreen( x, y ) );
            break;
            
        default:
            _state = STATE.NONE;
            
        }

        //        event.preventDefault();
        //        event.stopPropagation();
    }

    /* touch end handler*/
    function touchend( event ) {
        

        if ( _this.enabled === false ) return;

        
        switch ( event.touches.length ) {
            
        case 1:
            _rotateEnd.copy( getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
            _rotateStart.copy( _rotateEnd );
            break;
            
        case 2:
            _touchZoomDistanceStart = _touchZoomDistanceEnd = 0;
            
            /*            var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
                          var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
                          _panEnd.copy( getMouseOnScreen( x, y ) );
                          _panStart.copy( _panEnd );*/
            break;
            
        }

        inobounce.disable();
        _state = STATE.NONE;
        _this.dispatchEvent( endEvent );
    }

    /** remove all event listeners */ 
    function removeeventlisteners() {
        
        _this.domElement.removeEventListener( 'contextmenu', contextmenulistener,false);
        _this.domElement.removeEventListener( 'mousedown', mousedown, false );
        document.removeEventListener( 'mousemove', mousemove );
        document.removeEventListener( 'mouseup', mouseup );

        _this.domElement.removeEventListener( 'mousewheel', mousewheel, false );
        _this.domElement.removeEventListener( 'DOMMouseScroll', mousewheel, false ); // firefox
        
        _this.domElement.removeEventListener( 'touchstart', touchstart, { 'passive' : true } );
        _this.domElement.removeEventListener( 'touchend', touchend, { 'passive' : true } );
        _this.domElement.removeEventListener( 'touchmove', touchmove, { 'passive' : true } );
        
        window.removeEventListener( 'keydown', keydown, false );
        window.removeEventListener( 'keyup', keyup, false );
    }

    /** add event listeners */ 
    function addeventlisteners() {

        _this.domElement.addEventListener( 'contextmenu', contextmenulistener, false);
        _this.domElement.addEventListener( 'mousedown', mousedown,
                                           { 'capture' : false, 'passive' : true }
                                         );

        _this.domElement.addEventListener( 'mousewheel', mousewheel, { 'capture' : false, 'passive' : true } );
        _this.domElement.addEventListener( 'DOMMouseScroll', mousewheel, { 'capture' : false, 'passive' : true } ); // firefox
        
        _this.domElement.addEventListener( 'touchstart', touchstart, { 'capture' : false, 'passive' : true } );
        _this.domElement.addEventListener( 'touchend', touchend, { 'capture' : false, 'passive' : true } );
        _this.domElement.addEventListener( 'touchmove', touchmove, { 'capture' : false, 'passive' : true } );
        
        window.addEventListener( 'keydown', keydown, { 'capture' : false, 'passive' : true } );
        window.addEventListener( 'keyup', keyup, { 'capture' : false, 'passive' : true } );
    }

    /** This is a key function called before removing the controllers as otherwise
        it will still be bound to the dom and send callbacks even if we don't want them
    */
    _this.remove = function () {

        removeeventlisteners();
        _this.enabled=false;
    };
    

    addeventlisteners();
    _this.handleResize();

    // force an update at start
    _this.update();

};



if (typeof THREE !== 'undefined') {
    bisOrthographicCameraControls.prototype = Object.create( THREE.EventDispatcher.prototype );
    bisOrthographicCameraControls.prototype.constructor = bisOrthographicCameraControls;
    module.exports = bisOrthographicCameraControls;
} else {
    console.log('----- No THREE.js loaded, hence no 3D rendering available');
}
