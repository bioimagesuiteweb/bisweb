/**
   Utility Code from Three.js
*/


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
    input=input.replace(/\\r/g,'');
    
    let lines=input.split('\\n');
    console.log('lines[4]=',lines[4],lines[27]);
    
    let out='';
    for (let i=0;i<lines.length;i++) {
        let a=lines[i].trim();
        if (a.length>0 && a.indexOf('//')!==0)
            out+=a+'\n';
    }
    return out;
};


const VolumeRenderShader = {
    vertexShader: cleanstring(volume_vertex_shader),
    fragmentShader: cleanstring(volume_fragment_shader)
};

// ---------------------------------------------------------------------------------------
// Export

module.exports ={
    WEBGL : WEBGL,
    VolumeRenderShader : VolumeRenderShader
};





