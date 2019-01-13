/**
   Utility Code from Three.js
*/

const THREE = require('three');

// ---------------------------------------------------------------------------------------
// <script src="https://threejs.org/examples/js/WebGL.js"></script> 
// ---------------------------------------------------------------------------------------

/**
 * @author alteredq / http://alteredqualia.com/
 * @author mr.doob / http://mrdoob.com/
 */

const volume_vertex_shader=require('raw-loader!./volume_vertex_shader.txt');
const volume_fragment_shader=require('raw-loader!./volume_fragment_shader.txt');

const WEBGL = {

    isWebGLAvailable: function () {

        try {

            var canvas = document.createElement( 'canvas' );
            return !! ( window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) );

        } catch ( e ) {

            return false;

        }

    },

    isWebGL2Available: function () {

        try {

            var canvas = document.createElement( 'canvas' );
            return !! ( window.WebGL2RenderingContext && canvas.getContext( 'webgl2' ) );

        } catch ( e ) {

            return false;

        }

    },

    getWebGLErrorMessage: function () {

        return this.getErrorMessage( 1 );

    },

    getWebGL2ErrorMessage: function () {

        return this.getErrorMessage( 2 );

    },

    getErrorMessage: function ( version ) {

        var names = {
            1: 'WebGL',
            2: 'WebGL 2'
        };

        var contexts = {
            1: window.WebGLRenderingContext,
            2: window.WebGL2RenderingContext
        };

        
        var message = 'Your $0 does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">$1</a>';


        var element = document.createElement( 'div' );
        element.id = 'webglmessage';
        element.style.fontFamily = 'monospace';
        element.style.fontSize = '13px';
        element.style.fontWeight = 'normal';
        element.style.textAlign = 'center';
        element.style.background = '#fff';
        element.style.color = '#000';
        element.style.padding = '1.5em';
        element.style.width = '400px';
        element.style.margin = '5em auto 0';

        if ( contexts[ version ] ) {

            message = message.replace( '$0', 'graphics card' );

        } else {

            message = message.replace( '$0', 'browser' );

        }

        message = message.replace( '$1', names[ version ] );

        element.innerHTML = message;

        return element;

    }
};
// ---------------------------------------------------------------------------------------
// <script src="https://threejs.org/examples/js/shaders/VolumeShader.js"></script>
// ---------------------------------------------------------------------------------------
/**
 * @author Almar Klein / http://almarklein.org
 *
 * Shaders to render 3D volumes using raycasting.
 * The applied techniques are based on similar implementations in the Visvis and Vispy projects.
 * This is not the only approach, therefore it's marked 1.
 */

const cleanstring=function(input) {

    // somehow the require ads module.exports = " ..." around the text
    // removing this first
    input=input.replace(/module.exports = /g,'').replace(/"/g,'');
    
    let lines=input.split('\\n');
    let out='';
    for (let i=0;i<lines.length;i++) {
        let a=lines[i].trim();
        if (a.length>0 && a.indexOf('//')!==0)
            out+=a+'\n';
    }
    return out;
};


const VolumeRenderShader = {
    uniforms: {
        "u_size": { value: new THREE.Vector3( 1, 1, 1 ) },
        "u_spacing": { value: new THREE.Vector3( 2.0, 2.0, 2.0 ) },
        "u_renderstyle": { value: 0 },
        "u_renderthreshold": { value: 0.5 },
        "u_clim": { value: new THREE.Vector2( 1, 1 ) },
        "u_data": { value: null },
        "u_cmdata": { value: null }
    },
    vertexShader: cleanstring(volume_vertex_shader),
    fragmentShader: cleanstring(volume_fragment_shader)
};

// ---------------------------------------------------------------------------------------
// Export

module.exports ={
    WEBGL : WEBGL,
    VolumeRenderShader : VolumeRenderShader
};





