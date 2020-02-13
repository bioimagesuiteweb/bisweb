
let gl=null;

var setContext=function(cnt) {
    gl=cnt;
};

var Shader = function(vertexSrc, fragmentSrc) {
    var self = this;
    this.program = compileShader(vertexSrc, fragmentSrc);

    var regexUniform = /uniform[^;]+[ ](\w+);/g
    var matchUniformName = /uniform[^;]+[ ](\w+);/

    this.uniforms = {};

    var vertexUnifs = vertexSrc.match(regexUniform);
    var fragUnifs = fragmentSrc.match(regexUniform);

    if (vertexUnifs) {
        vertexUnifs.forEach(function(unif) {
            var m = unif.match(matchUniformName);
            self.uniforms[m[1]] = -1;
        });
    }
    if (fragUnifs) {
        fragUnifs.forEach(function(unif) {
            var m = unif.match(matchUniformName);
            self.uniforms[m[1]] = -1;
        });
    }

    for (unif in this.uniforms) {
        this.uniforms[unif] = gl.getUniformLocation(this.program, unif);
    }
}

Shader.prototype.use = function() {
    gl.useProgram(this.program);
}

// Compile and link the shaders vert and frag. vert and frag should contain
// the shader source code for the vertex and fragment shaders respectively
// Returns the compiled and linked program, or null if compilation or linking failed
var compileShader = function(vert, frag){
    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vert);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)){
        alert("Vertex shader failed to compile, see console for log");
        console.log(gl.getShaderInfoLog(vs));
        return null;
    }

    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, frag);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)){
        alert("Fragment shader failed to compile, see console for log");
        console.log(gl.getShaderInfoLog(fs));
        return null;
    }

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)){
        alert("Shader failed to link, see console for log");
        console.log(gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

var getGLExtension = function(ext) {
    if (!gl.getExtension(ext)) {
        alert("Missing " + ext + " WebGL extension");
        return false;
    }
    return true;
}


module.exports= {
    Shader : Shader,
    setContext : setContext,
};
