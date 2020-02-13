

/*

  Original License

  MIT License

  Copyright (c) 2019 Chris Rorden's Lab

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.


  # NIfTI WebGL Volume Rendering



  [Try the demo](https://rordenlab.github.io/).

  This project allows users to open and view NIfTI format images, which are popular for scientific neuroimaging. One can convert the complicated DICOM format popular in medical imaging to the simpler NIfTI format using free tools like [dcm2niix](https://github.com/rordenlab/dcm2niix).

  By using webGL 2, these renderings can be viewed with web browsers on any computer, including tablets and smart phones (though be aware that Apple's iOS does not yet support WebGL 2). The idea for this project is to provide a web-based tool with similar functions to tools like [MRIcroGL](https://www.nitrc.org/plugins/mwiki/index.php/mricrogl:MainPage) that is available for [Windows, Linux and MacOS](https://github.com/rordenlab/MRIcroGL12/releases).

  This software calculates the volume intensity [gradients](https://www.mccauslandcenter.sc.edu/mricrogl/gradients). This isolates regions where the brightness of the volume changes (for brain scans, these are the boundaries between different tissues). The software estimates both the gradient magnitude (is the brightness changing rapidly at this location) and the gradient direction (what direction is the surface oriented). This allows us to calculating lighting effects. This is shown in the image below: on the left is the basic volume rendering, in the middle are the gradients for this volume, and on the right we have added lighting effects to the volume rendering based on these gradients.



*/


const BIS3dImageSliceGeometry=require('bis_3dimageslicegeometry');
const ShaderStrings=require('shader-srcs');
const WebGLUtil=require('webgl-util');
const THREE=require('three');

module.exports=function(image,in_slices,decorations,transparent,imageplane,isoverlay) {

    if (imageplane!==false)
        imageplane=true;
    
    let internal = {
        slices : in_slices,
        camera : null,
        box: [ null,null,null,null,null,null ],
        hasdecorations : decorations,
        hasimageplane : imageplane,
        istransparent : transparent || false,
        texture : null,
        uniforms : null,
        renderer : null,
        isoverlay : isoverlay,
        minintensity : 0.0,
        intensityscale : 1.0,
        dimensions : image.getDimensions(),
        isvisible : true,
    };
    
    // ------------------------------------- Riordan code begins here ----------------------------

    let cubeStrip = [0,1,0, 1,1,0, 0,1,1, 1,1,1, 1,0,1, 1,1,0, 1,0,0, 0,1,0, 0,0,0, 0,1,1, 0,0,1, 1,0,1, 0,0,0, 1,0,0];

    let VolumeRenderingContext = null;
    let shader = null;
    let blurShader = null;
    let sobelShader = null;
    let volumeTexture = null;
    let gradientTexture = null;
    let colormap = null;
    let vao = null;
    let vbo = null;
    let tex = null;
    let samplingRate = 1.0;
    let colorName = "";
    let colorOpacity = 2;



    /*document.addEventListener("keydown", function(evt) {
      if (evt.key == "z")  adjustOpacity(0.9);
      if (evt.key == "a") adjustOpacity(1.1);
      if (evt.key == "w") adjustQuality(1.1);
      if (evt.key == "q")  adjustQuality(0.9);
      });*/
    
    /*if (isDrawOnDemand)
      document.addEventListener('cameraRedraw', e => glDraw() );*/

    // Fix sampling rate
    let adjustQuality=function(scale) {
        samplingRate = samplingRate * scale;
        samplingRate = Math.min(samplingRate, 10.0);
        samplingRate = Math.max(samplingRate, 0.7);
        VolumeRenderingContext.uniform1f(shader.uniforms["dt_scale"], samplingRate);
    };
    
    let adjustOpacity=function(scale) {
        colorOpacity = colorOpacity * scale;
        colorOpacity = Math.min(colorOpacity, 10.0);
        colorOpacity = Math.max(colorOpacity, 0.1);
        selectColormap(colorName);
        console.log('opacity ', colorOpacity);
    };


    let bindBlankGL=function() {
        let texR = VolumeRenderingContext.createTexture();
        VolumeRenderingContext.bindTexture(VolumeRenderingContext.TEXTURE_3D, texR);
        VolumeRenderingContext.texParameteri(VolumeRenderingContext.TEXTURE_3D, VolumeRenderingContext.TEXTURE_MIN_FILTER, VolumeRenderingContext.LINEAR);
        VolumeRenderingContext.texParameteri(VolumeRenderingContext.TEXTURE_3D, VolumeRenderingContext.TEXTURE_MAG_FILTER, VolumeRenderingContext.LINEAR);
        VolumeRenderingContext.texParameteri(VolumeRenderingContext.TEXTURE_3D, VolumeRenderingContext.TEXTURE_WRAP_R, VolumeRenderingContext.CLAMP_TO_EDGE);
        VolumeRenderingContext.texParameteri(VolumeRenderingContext.TEXTURE_3D, VolumeRenderingContext.TEXTURE_WRAP_S, VolumeRenderingContext.CLAMP_TO_EDGE);
        VolumeRenderingContext.texParameteri(VolumeRenderingContext.TEXTURE_3D, VolumeRenderingContext.TEXTURE_WRAP_T, VolumeRenderingContext.CLAMP_TO_EDGE);
        VolumeRenderingContext.pixelStorei( VolumeRenderingContext.UNPACK_ALIGNMENT, 1 );

        VolumeRenderingContext.texStorage3D(VolumeRenderingContext.TEXTURE_3D, 1, VolumeRenderingContext.RGBA8, internal.dimensions[0], internal.dimensions[1], internal.dimensions[2]);
        return texR;
    };

    let gradientGL=function() {
        let faceStrip = [0,0,0, 0,1,0, 1,0,0, 1,1,0];
        let vao2 = VolumeRenderingContext.createVertexArray();
        VolumeRenderingContext.bindVertexArray(vao2);
        let vbo2 = VolumeRenderingContext.createBuffer();
        VolumeRenderingContext.bindBuffer(VolumeRenderingContext.ARRAY_BUFFER, vbo2);
        VolumeRenderingContext.bufferData(VolumeRenderingContext.ARRAY_BUFFER, new Float32Array(faceStrip), VolumeRenderingContext.STATIC_DRAW);
        VolumeRenderingContext.enableVertexAttribArray(0);
        VolumeRenderingContext.vertexAttribPointer(0, 3, VolumeRenderingContext.FLOAT, false, 0, 0);
        let fb = VolumeRenderingContext.createFramebuffer();
        VolumeRenderingContext.bindFramebuffer(VolumeRenderingContext.FRAMEBUFFER, fb);
        VolumeRenderingContext.disable(VolumeRenderingContext.CULL_FACE);

        VolumeRenderingContext.viewport(0, 0, internal.dimensions[0], internal.dimensions[1]);
        VolumeRenderingContext.disable(VolumeRenderingContext.BLEND);
        let tempTex3D = bindBlankGL();
        blurShader.use();
        VolumeRenderingContext.activeTexture(VolumeRenderingContext.TEXTURE1);
        VolumeRenderingContext.bindTexture(VolumeRenderingContext.TEXTURE_3D, tex);
        VolumeRenderingContext.uniform1i(blurShader.uniforms["intensityVol"], 1);
        VolumeRenderingContext.uniform1f(blurShader.uniforms["dX"], 0.7/ internal.dimensions[0]);
        VolumeRenderingContext.uniform1f(blurShader.uniforms["dY"], 0.7/ internal.dimensions[1]);
        VolumeRenderingContext.uniform1f(blurShader.uniforms["dZ"], 0.7/ internal.dimensions[2]);

        VolumeRenderingContext.bindVertexArray(vao2);
        for (let i = 0; i < (internal.dimensions[2]-1); i++) {
            let coordZ = 1/internal.dimensions[2] * (i + 0.5);
            VolumeRenderingContext.uniform1f(blurShader.uniforms["coordZ"], coordZ);
            VolumeRenderingContext.framebufferTextureLayer(VolumeRenderingContext.FRAMEBUFFER, VolumeRenderingContext.COLOR_ATTACHMENT0, tempTex3D, 0, i);
            VolumeRenderingContext.clear(VolumeRenderingContext.DEPTH_BUFFER_BIT);
            VolumeRenderingContext.drawArrays(VolumeRenderingContext.TRIANGLE_STRIP, 0, faceStrip.length / 3);
        }

        sobelShader.use();
        VolumeRenderingContext.activeTexture(VolumeRenderingContext.TEXTURE1);
        VolumeRenderingContext.bindTexture(VolumeRenderingContext.TEXTURE_3D, tempTex3D);//input texture
        VolumeRenderingContext.uniform1i(sobelShader.uniforms["intensityVol"], 1);
        VolumeRenderingContext.uniform1f(sobelShader.uniforms["dX"], 0.7/ internal.dimensions[0]);
        VolumeRenderingContext.uniform1f(sobelShader.uniforms["dY"], 0.7/ internal.dimensions[1]);
        VolumeRenderingContext.uniform1f(sobelShader.uniforms["dZ"], 0.7/ internal.dimensions[2]);
        VolumeRenderingContext.uniform1f(sobelShader.uniforms["coordZ"], 0.5);
        VolumeRenderingContext.bindVertexArray(vao2);
        VolumeRenderingContext.activeTexture(VolumeRenderingContext.TEXTURE0);
        if (gradientTexture !== null) VolumeRenderingContext.deleteTexture(gradientTexture);
        gradientTexture = bindBlankGL();
        for (let i = 0; i < (internal.dimensions[2]-1); i++) {
            let coordZ = 1/internal.dimensions[2] * (i + 0.5);
            VolumeRenderingContext.uniform1f(sobelShader.uniforms["coordZ"], coordZ);
            //console.log(coordZ);
            VolumeRenderingContext.framebufferTextureLayer(VolumeRenderingContext.FRAMEBUFFER, VolumeRenderingContext.COLOR_ATTACHMENT0, gradientTexture, 0, i);
            VolumeRenderingContext.clear(VolumeRenderingContext.DEPTH_BUFFER_BIT);
            VolumeRenderingContext.drawArrays(VolumeRenderingContext.TRIANGLE_STRIP, 0, faceStrip.length / 3);
        }
        VolumeRenderingContext.deleteFramebuffer(fb);
        VolumeRenderingContext.deleteTexture(tempTex3D);
        //return to volume rendering shader
        shader.use();
        VolumeRenderingContext.bindVertexArray(vao);
        VolumeRenderingContext.bindBuffer(VolumeRenderingContext.ARRAY_BUFFER, vbo);
        VolumeRenderingContext.activeTexture(VolumeRenderingContext.TEXTURE0);
        VolumeRenderingContext.bindTexture(VolumeRenderingContext.TEXTURE_3D, volumeTexture);
        VolumeRenderingContext.activeTexture(VolumeRenderingContext.TEXTURE2);
        VolumeRenderingContext.bindTexture(VolumeRenderingContext.TEXTURE_3D, gradientTexture);
        VolumeRenderingContext.viewport(0, 0, VolumeRenderingContext.canvas.width, VolumeRenderingContext.canvas.height);
    };


    let drawVolumeRender=function (camera) {
        camera= camera || internal.camera;
        setShader(1); //Lighting shader
        VolumeRenderingContext.uniform1f(shader.uniforms["dt_scale"], samplingRate);
        VolumeRenderingContext.clearColor(0.0, 0.0, 0.0, 0.0);
        VolumeRenderingContext.clear(VolumeRenderingContext.COLOR_BUFFER_BIT);


        let projView=camera.projectionMatrix.elements;
        
        VolumeRenderingContext.uniformMatrix4fv(shader.uniforms["proj_view"], false, projView);
        //let eye = [camera.invCamera[12], camera.invCamera[13], camera.invCamera[14]];
        let eye = [ 50,50,50 ];//camera.eyePos();
        VolumeRenderingContext.uniform3fv(shader.uniforms["eye_pos"], eye);
        //Lighting
        //"Head-light" with light at camera location:
        //VolumeRenderingContext.uniform3fv(shader.uniforms["light_pos"], eye);
        //we will place a light directly above the camera, mixing headlight with top light
        let mx = Math.max( Math.abs(...eye) );
        let up = [ 0,0,1 ]; //camera.upDir();
        let light = eye;
        light[0] = eye[0] + up[0] * mx;
        light[1] = eye[1] + up[1] * mx;
        light[2] = eye[2] + up[2] * mx;
        VolumeRenderingContext.uniform3fv(shader.uniforms["light_pos"], light);
        //draw cube
        VolumeRenderingContext.drawArrays(VolumeRenderingContext.TRIANGLE_STRIP, 0, cubeStrip.length / 3);
        // Wait for rendering to actually finish
        VolumeRenderingContext.finish();

        console.log('Done drawing');
    };

    let mricro_updateVolume=function(img8) { //load volume or change contrast

        tex = VolumeRenderingContext.createTexture();
        VolumeRenderingContext.activeTexture(VolumeRenderingContext.TEXTURE0);
        VolumeRenderingContext.bindTexture(VolumeRenderingContext.TEXTURE_3D, tex);
        VolumeRenderingContext.texParameteri(VolumeRenderingContext.TEXTURE_3D, VolumeRenderingContext.TEXTURE_MIN_FILTER, VolumeRenderingContext.LINEAR);
        VolumeRenderingContext.texParameteri(VolumeRenderingContext.TEXTURE_3D, VolumeRenderingContext.TEXTURE_MAG_FILTER, VolumeRenderingContext.LINEAR);
        VolumeRenderingContext.texParameteri(VolumeRenderingContext.TEXTURE_3D, VolumeRenderingContext.TEXTURE_WRAP_R, VolumeRenderingContext.CLAMP_TO_EDGE);
        VolumeRenderingContext.texParameteri(VolumeRenderingContext.TEXTURE_3D, VolumeRenderingContext.TEXTURE_WRAP_S, VolumeRenderingContext.CLAMP_TO_EDGE);
        VolumeRenderingContext.texParameteri(VolumeRenderingContext.TEXTURE_3D, VolumeRenderingContext.TEXTURE_WRAP_T, VolumeRenderingContext.CLAMP_TO_EDGE);
        VolumeRenderingContext.pixelStorei( VolumeRenderingContext.UNPACK_ALIGNMENT, 1 );
        VolumeRenderingContext.texStorage3D(VolumeRenderingContext.TEXTURE_3D, 1, VolumeRenderingContext.R8, internal.dimensions[0], internal.dimensions[1], internal.dimensions[2]);
        VolumeRenderingContext.texSubImage3D(VolumeRenderingContext.TEXTURE_3D, 0, 0, 0, 0,internal.dimensions[0], internal.dimensions[1], internal.dimensions[2],VolumeRenderingContext.RED, VolumeRenderingContext.UNSIGNED_BYTE, img8);
        let longestAxis = Math.max(internal.dimensions[0], Math.max(internal.dimensions[1], internal.dimensions[2]));
        let volScale = [internal.dimensions[0] / longestAxis, internal.dimensions[1] / longestAxis,internal.dimensions[2] / longestAxis];
        VolumeRenderingContext.uniform3iv(shader.uniforms["volume_dims"], [ internal.dimensions[0],internal.dimensions[1],internal.dimensions[2]]);
        VolumeRenderingContext.uniform3fv(shader.uniforms["volume_scale"], volScale);
        gradientGL();
        console.log('Updated Volume drawing');
        drawVolumeRender();
    }; //updateVolume()



    var makeLut=function(Rs, Gs, Bs, As, Is) {
        //create color lookup table provided arrays of reds, greens, blues, alphas and intensity indices
        //intensity indices should be in increasing order with the first value 0 and the last 255.
        // makeLut([0, 255], [0, 0], [0,0], [0,128],[0,255]); //red gradient
        const lut = new Uint8Array(256 * 4);
        for (let i = 0; i < (Is.length-1); i++) {
            //return a + f * (b - a);
            let idxLo = Is[i];
            let idxHi = Is[i+1];
            let idxRng = idxHi - idxLo;
            let k = idxLo * 4;
            for (let j = idxLo; j <= idxHi; j++) {
                let f = (j-idxLo)/idxRng;
                lut[k] = Rs[i] + f * (Rs[i+1]- Rs[i]); //Red
                k++;
                lut[k] = Gs[i] + f * (Gs[i+1]- Gs[i]); //Green
                k++;
                lut[k] = Bs[i] + f * (Bs[i+1]- Bs[i]); //Blue
                k++;
                lut[k] = (As[i] + f * (As[i+1]- As[i])) * colorOpacity; //Alpha
                k++;
            }
        }
        return lut;
    }; // makeLut()

    var selectColormap = function(lutName) {
        let lut = makeLut([0, 255], [0, 255], [0,255], [0,128],[0,255]); //gray
        if (lutName === "Plasma")
            lut = makeLut([13, 156, 237, 240],[8, 23, 121, 249],[135, 158, 83, 33],[0, 56, 80, 88], [0, 64, 192, 255]); //plasma
        if (lutName === "Viridis")
            lut = makeLut([68,49,53,253],[1,104,183,231],[84,142,121,37],[0,56,80,88],[0,65,192,255]);//viridis
        if (lutName === "Inferno")
            lut = makeLut([0,120,237,240],[0,28,105,249],[4,109,37,33],[0,56,80,88],[0,64,192,255]);//inferno
        colorName = lutName;
        if (colormap !== null)
            VolumeRenderingContext.deleteTexture(colormap); //release colormap');
        colormap = VolumeRenderingContext.createTexture();
        VolumeRenderingContext.activeTexture(VolumeRenderingContext.TEXTURE1);
        VolumeRenderingContext.bindTexture(VolumeRenderingContext.TEXTURE_2D, colormap);
        VolumeRenderingContext.texStorage2D(VolumeRenderingContext.TEXTURE_2D, 1, VolumeRenderingContext.RGBA8, 256, 1);
        VolumeRenderingContext.texParameteri(VolumeRenderingContext.TEXTURE_2D, VolumeRenderingContext.TEXTURE_MIN_FILTER, VolumeRenderingContext.LINEAR);
        VolumeRenderingContext.texParameteri(VolumeRenderingContext.TEXTURE_2D, VolumeRenderingContext.TEXTURE_WRAP_R, VolumeRenderingContext.CLAMP_TO_EDGE);
        VolumeRenderingContext.texParameteri(VolumeRenderingContext.TEXTURE_2D, VolumeRenderingContext.TEXTURE_WRAP_S, VolumeRenderingContext.CLAMP_TO_EDGE);
        VolumeRenderingContext.texSubImage2D(VolumeRenderingContext.TEXTURE_2D, 0, 0, 0, 256, 1,VolumeRenderingContext.RGBA, VolumeRenderingContext.UNSIGNED_BYTE, lut);
    }; // selectColormap()

    var mricro_initialize = function(){

        if (vao!==null)
            return;

        VolumeRenderingContext = internal.renderer.domElement.getContext( 'webgl2' );
        WebGLUtil.setContext(VolumeRenderingContext);

        
        vao = VolumeRenderingContext.createVertexArray();
        VolumeRenderingContext.bindVertexArray(vao);
        vbo = VolumeRenderingContext.createBuffer();
        VolumeRenderingContext.bindBuffer(VolumeRenderingContext.ARRAY_BUFFER, vbo);
        VolumeRenderingContext.bufferData(VolumeRenderingContext.ARRAY_BUFFER, new Float32Array(cubeStrip), VolumeRenderingContext.STATIC_DRAW);
        VolumeRenderingContext.enableVertexAttribArray(0);
        VolumeRenderingContext.vertexAttribPointer(0, 3, VolumeRenderingContext.FLOAT, false, 0, 0);
        sobelShader = new WebGLUtil.Shader(ShaderStrings.blurVertShader, ShaderStrings.sobelFragShader);
        sobelShader.use();
        blurShader = new WebGLUtil.Shader(ShaderStrings.blurVertShader, ShaderStrings.blurFragShader);
        blurShader.use();
        setShader(1); //Lighting shader
        // Setup required OpenGL state for drawing the back faces and
        // composting with the background color
        VolumeRenderingContext.enable(VolumeRenderingContext.CULL_FACE);
        VolumeRenderingContext.cullFace(VolumeRenderingContext.FRONT);
        VolumeRenderingContext.enable(VolumeRenderingContext.BLEND);
        VolumeRenderingContext.blendFunc(VolumeRenderingContext.ONE, VolumeRenderingContext.ONE_MINUS_SRC_ALPHA);
        console.log('Done initializing');
    };

    var setShader=function(shaderInt) { //0=default, 1=lighting, 2=Maximum Intensity
        if (shaderInt === 3)
            shader = new WebGLUtil.Shader(ShaderStrings.vertShader, ShaderStrings.fragShaderGradients);
        else if (shaderInt === 2)
            shader = new WebGLUtil.Shader(ShaderStrings.vertShader, ShaderStrings.fragShaderMIP);
        else if (shaderInt === 1)
            shader = new WebGLUtil.Shader(ShaderStrings.vertShader, ShaderStrings.fragShaderLighting);
        else
            shader = new WebGLUtil.Shader(ShaderStrings.vertShader, ShaderStrings.fragShader);
        shader.use();
        VolumeRenderingContext.uniform1i(shader.uniforms["volume"], 0);
        VolumeRenderingContext.uniform1i(shader.uniforms["colormap"], 1);
        VolumeRenderingContext.uniform1i(shader.uniforms["gradients"], 2);
        VolumeRenderingContext.uniform1f(shader.uniforms["dt_scale"], 1.0);
    };


    // ------------------------------------- Riordan code ends here ----------------------------
    
    let output = {
        
        initialize : function() {
            
            let wire=[null,null,null];
            let sz = internal.slices[0].getimagesize();
            
            let boxmat= [ new THREE.MeshBasicMaterial( {color: 0x444444, wireframe:true}),
                          new THREE.MeshBasicMaterial( {color: 0xff8800, wireframe:true})];
            
            if (internal.hasdecorations) {
                
                for (let pl=0;pl<=2;pl++) {
                    let points =  internal.slices[pl].getplanepoints().slice(0);
                    wire[pl]=new BIS3dImageSliceGeometry(points[0],points[1],points[2],true,false);
                    let offset=internal.slices[pl].getsliceoffset();
                    for (let fr=0;fr<=1;fr++) {
                        offset[pl]=sz[pl]*fr;
                        let index=pl*2+fr;
                        internal.box[index]=new THREE.Mesh(wire[pl],boxmat[fr]);
                        internal.box[index].position.set(offset[0],offset[1],offset[2]);
                    }
                }
            }

        },
        
        createVolume :  function() {
            //   Code from https://threejs.org/examples/#webgl2_materials_texture3d_volume
            // Texture to hold the volume. We have scalars, so we put our data in the red channel.
            // THREEJS will select R32F (33326) based on the RedFormat and FloatType.
            // Also see https://www.khronos.org/registry/webgl/specs/latest/2.0/#TEXTURE_TYPES_FORMATS_FROM_DOM_ELEMENTS_TABLE

            let dim=image.getDimensions();
            //let spa=image.getSpacing();
            let range=image.getIntensityRange();
            let tp=image.getImageType();
            let intoffset=0;
            let maxv=255;
            if (internal.overlay) {
                //maxv=253;
                //intoffset=2;
            }
            
            if (range[0]===0 && range[1]<=maxv && ( tp=='uchar' || tp ==='short' || tp ==='ushort' || tp==='char')) {
                internal.minintensity=0;
                internal.intensityscale=1.0;
                console.log('Not scaling',intoffset,maxv);
            } else if ( range[0] < 0 && range[1] > 0 && internal.overlay) {
                let maxint=range[1];
                if (Math.abs(range[0])>maxint)
                    maxint=Math.abs(range[0]);
                let scale=maxv/(2*maxint);
                internal.minintensity=-maxint;
                internal.intensityscale=scale;
            } else {
                let scale=maxv/(range[1]-range[0]);
                internal.minintensity=range[0];
                internal.intensityscale=scale;
                console.log('Normal scaling',internal.minintensity,internal.intensityscale,internal.isoverlay,' max=',maxv,intoffset);
            }
            
            let data=image.getImageData();
            let p_data=new Uint8Array(dim[0]*dim[1]*dim[2]);
            let slicesize=dim[0]*dim[1];
            let index=0;
            for(let k=0;k<dim[2];k++) {
                let offset=k*slicesize;
                for (let j=0;j<dim[1];j++) {
                    for (let i=0;i<dim[0];i++) {
                        let v=data[index];
                        index++;
                        let y=(v-internal.minintensity)*internal.intensityscale+intoffset;
                        // flip x -- seems to need this
                        p_data[offset+(dim[0]-1-i)]=y;
                    }
                    offset+=dim[0];
                }
            }

            // --> p_data
            mricro_initialize();
            mricro_updateVolume(p_data);
        },
        
        /** clean up all elements (i.e. set them to null)
         * @memberof Bis_3DOrthogonalSlice.Bis3DVolume
         */
        cleanup : function() {
            for (let i=0;i<internal.box.length;i++) 
                internal.box[i]=null;
            internal.texture=null;
            
        },

        /** adds all objects (imageplane, outline and axes depending on decoration mode)
         * to ThreeJS-Scene
         * @memberof Bis_3DOrthogonalSlice.Bis3DVolume.prototype
         * @param {ThreeJS-Scene} scene - ThreeJS-Scene object
         */
        addtoscene : function(scene,ren,camera,extralist) {

            internal.renderer=ren;
            internal.camera=camera;
            internal.scene=scene;
            if (internal.hasdecorations) {
                for (let i=0;i<internal.box.length;i++) {
                    scene.add(internal.box[i]);
                }
            }
            let index=extralist.indexOf(this);

            
            this.createVolume();
            
            if (index<0)
                extralist.push(this);
        },

        /** removes all objects (imageplane, outline and axes depending on decoration mode)
         * from ThreeJS-Scene
         * @memberof Bis_3DOrthogonalSlice.Bis3DVolume
         * @param {ThreeJS-Scene} scene - ThreeJS-Scene object
         */
        removefromscene : function(scene,extralist) {

            if (internal.hasdecorations) {
                for (let i=0;i<internal.box.length;i++) 
                    scene.remove(internal.box[i]);
            }
            
            let index=extralist.indexOf(this);
            if (index>=0) {
                extralist.splice(index,1);
            }
            vao=null;
        },

        /**
         * this is a dummy function for compatibility with 3dCardSlice
         * @memberof Bis_3DOrthogonalSlice.Bis3DVolume
         */
        updatecoordinates : function () { return; },


        /**
         * this is a dummy function for compatibility with 3dCardSlice
         */ 
        updatecoordinatesinmm : function () { return; },
        
        /** Position the camera (set position, upvector and lookAt)
         * to correctly look at one of the three card slices. 
         * @memberof Bis_3DOrthogonalSlice.Bis3DVolume.prototype
         * @param {ThreeJS-OrthographicCamera} camera - the camera 
         * @param {number} i - the plane to look at 
         */
        positioncamera : function(camera,i,fromback) {
            
            if (fromback!==false)
                fromback=true;
            if (i !==0 )
                i= i || 1;
            return internal.slices[i].positioncamera(camera,fromback);
        },


        /** Show decorations if true show axis/outline (if they exist) else hide
         * @memberof Bis_3DOrthogonalSlice.Bis2DImageSlice.prototype
         * @param {boolean} show - if true show, else hide
         */
        showdecorations : function(show) {

            show = show || false;
            if (internal.hasdecorations) {
                for (let i=0;i<internal.box.length;i++) {
                    internal.box[i].visible=show;
                }
            }
        },

        /** dummy function */
        setnexttimeforce : function() { },


        showimage(mode) {
            if (mode===undefined)
                mode=true;
            if (mode!==true)
                mode=false;
            internal.isvisible=mode;
        },
            
        
        /**
         * update the colormap with new transfer function
         */
        updateColormap : function (cmapcontrolPayload,transferfunction) {

            let volinfo=cmapcontrolPayload.volumerendering;

            setShader(0);
            selectColormap('Inferno');
            
            //adjustQuality(volinfo.quality);
            /*

            let minc = [ 0,0,0];
            let maxc = [ 0,0,0];
            for (let i=0;i<=2;i++) {
                minc[i]=volinfo.crop[2*i]/ (internal.dimensions[i]-1);
                maxc[i]=volinfo.crop[2*i+1]/ (internal.dimensions[i]-1);
                if (maxc[i]<minc[i]) {
                    let tmp=minc[i];
                    minc[i]=maxc[i];
                    maxc[i]=tmp;
                }
                if (i==0) {
                    let tmp=1.0-minc[i];
                    minc[i]=1.0-maxc[i];
                    maxc[i]=tmp;
                }
                                    
            }*/
        },
        
        render(camera) {
            if (internal.isvisible)
                drawVolumeRender(camera);

        }

    };
    output.initialize();

    return output;
};

