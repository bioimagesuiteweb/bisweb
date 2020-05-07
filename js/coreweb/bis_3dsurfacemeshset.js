const THREE=require('three');
const util=require('bis_util');
const $=require('jquery');
// ---------------------------------------------------------------------------------------------------
// Utility functions

const createBufferGeometry=function() {

    const g=new THREE.BufferGeometry();
    
    if (THREE['REVISION']<101) {
        g.setAttribute=g.addAttribute;
        g.deleteAttribute=g.removeAttribute;
    }
    return g;
};


const createColorLookupTableTexture=function(hue) {

    // Colormap texture
    let canvas = document.createElement( 'canvas' );
    canvas.width=256;
    canvas.height=1;
    let canvasdata=canvas.getContext("2d").createImageData(256,1);

    if (hue<0.0)
        hue=0.0;
    else if (hue>1.0)
        hue=1.0;
    
    let cmap=util.mapconstanthuecolormap(0.0,255.0,1.0,hue,1.0);
    let map=[0,0,0,0];
    let data=[0];
    
    for (let i=0;i<=255;i++)  {
        data[0]=i;
        cmap(data,0,map);
        for (let j=0;j<=3;j++)
            canvasdata.data[i*4+j]=map[j];
    }
    
    canvas.getContext("2d").putImageData(canvasdata,0,0);
    const displayimg= $('<img>');
    let outimg=canvas.toDataURL("image/png");
    displayimg.attr('src', outimg);
    displayimg.width(256);
    displayimg.height(16);
    
    let cmtexture = new THREE.Texture(canvas);
    cmtexture.needsUpdate = true;
    cmtexture.minFilter = cmtexture.magFilter = THREE.LinearFilter;
    return cmtexture;
};

// ---------------------------------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------------------------------

const vertexshader_text = `
      varying vec3  vNormal;
      varying vec4  vColor;
      attribute float attributes;
      uniform float minValue;
      uniform float maxValue;      
      uniform sampler2D cmTexture;

      void main() {

           if (attributes<0.0) {
              vColor=vec4(0,0,0,0);
           } else {
              float c=(attributes)/maxValue;           
              vColor= texture2D(cmTexture, vec2(c, 0));
           }
           vNormal = normalize( normalMatrix * normal );
           vec3 transformed = vec3( position );
           vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
           gl_Position = projectionMatrix * mvPosition;
      }
`;

const fragmentshader_text=`
      uniform float opacity;
      uniform vec3 diffuse;
      varying vec3 vNormal;
      varying vec4 vColor;
      uniform float opacity;
      uniform int uniformColor;

      void main() {


         if (uniformColor) {
             float v=max(0.0,vNormal.z);
             gl_FragColor = vec4( v*diffuse.x,v*diffuse.y,v*diffuse.z, opacity );
             return;
         }

         // Individual color
         if (vColor[3]<=0.0)
            discard;

         float v=max(0.0,vNormal.z);
         gl_FragColor = vec4( v*vColor.x,
                              v*vColor.y,
                              v*vColor.z, 
                              opacity );
      }
`;


// ---------------------------------------------------------------------------------------------------
// Class Surface Mesh
// ---------------------------------------------------------------------------------------------------

class bisweb3DSurfaceMeshSet {

    constructor() {
        this.texture=null;
        this.meshes=[];
        this.geometries=[];
        this.materials=[];
        this.subviewers=[];
        this.minattr=0.0;
        this.maxattr=0.0;
        this.attributes=null;
        this.colorsurface=null;
    }


    showMeshes(doshow=true) {

        if (this.meshes) {
            for (let i=0;i<this.meshes.length;i++) {
                if (show)
                    this.meshes[i].visible=doshow;
            }
        }
    }
    
    remove(doGeometries=true) {

        if (this.subviewers && this.meshes) {
            for (let i=0;i<this.subviewers.length;i++) {

                if (this.meshes[i]) {
                    this.subviewer.getScene().remove(this.meshes[i]);
                    if (doGeometries)
                        this.geometries[i]=null;
                    this.meshes[i]=null;
                    this.materials[i]=null;
                }
            }
        }
        
        if (this.texture) {
            this.texture.dispose();
            this.texture=0;
        }
    }

    switchColorMode(hue=0.02,color=[1.0,1.0,1.0],opacity=0.8,uniformColor=false) {

        let hadtexture=false;
        if (this.texture)
            hadtexture=true;
        
        if (!this.meshes) {
            console.log('Null surface');
            return 0;
        }
        
        if (this.meshes.length<1) {
            console.log('Bad surface');
            return 0;
        }

        this.remove(false);
        
        if (hadtexture) {
            this.texture=createColorLookupTableTexture(hue);
        } else {
            this.texture=null;
        }

        if (uniformColor)
            this.colorsurface=0;
        else
            this.colorsurface=1;

        this.addMeshesToScene(color,opacity,null);
    }

    
    createMeshes(subviewers,surfaceobj,hue=0.02,color=[1.0,1.0,1.0 ],opacity=0.8,uniformColor=false,attributeIndex=0) {

        this.remove();

        let points=surfaceobj.getPoints();
        let pointData=surfaceobj.getPointData();
        this.attributes=new Float32Array(points.length);
        if (!uniformColor) {
            this.colorsurface=1;
            if (attributeIndex<0)
                this.colorsurface=0;
            else if (!pointData)
                this.colorsurface=0;
        } else {
            this.colorsurface=0;
        }

        
        if (!this.colorsurface) {
            for (let i=0;i<this.attributes.length;i++) {
                this.attributes[i]=1;
            }
            this.texture=null;
        } else {
            attributeIndex=parseInt(attributeIndex);
            let dim=pointData.getDimensions();
            if (attributeIndex>=dim[1])
                attributeIndex=dim[1]-1;
            
            for (let i=0;i<this.attributes.length;i++) {
                let v=pointData[i*dim[1]+attributeIndex];
                if (i==0) {
                    this.minattr=v;
                    this.maxattra=v;
                } else {
                    if (v<this.minattr)
                        this.minattr=v;
                    if (v>this.maxattra)
                        this.maxattra=v;
                }
                this.attributes[i]=v;
            }
            this.texture=createColorLookupTableTexture(hue);
        }
        this.subviewers=subviewers;
        this.addMeshesToScene(color,opacity,surfaceobj);
    }

    addMeshesToScene(cl=[1.0,1.0,1.0],opacity=0.8,surfaceobj=null) {

        for (let index=0;index<this.subviewers.length;index++) {
            
            if (surfaceobj) {
                this.geometries[index]=createBufferGeometry();
                this.geometries[index].setIndex( new THREE.BufferAttribute( surfaceobj.getTriangles(), 1));
                this.geometries[index].setAttribute( 'position', new THREE.BufferAttribute( surfaceobj.getPoints()));
                this.geometries[index].computeVertexNormals();
                this.geometries[index].setAttribute( 'attributes', new THREE.BufferAttribute( this.attributes, 1 ) );
            } else if (this.geometries[index]===null) {
                console.log('Bad Geometry');
                return 0;
            }

            if (index === this.subviewers.length-1) {
                this.materials[index] = new THREE.ShaderMaterial({
                    transparent : true,
                    "uniforms": {
                        "minValue" : { "type": "f", "value" : this.minattr },
                        "maxValue" : { "type": "f", "value" : this.maxattr },
                        "cmTexture" : { "value" : this.texture },
                        "diffuse": {  "type":"c","value":
                                      {"r":cl[0],
                                       "g":cl[1],
                                       "b":cl[2]}
                                   },
                        "opacity": {"type":"f","value":opacity},
                        "uniformColor" : 1-this.colorsurface,
                    },
                    vertexShader : vertexshader_text,
                    fragmentShader : fragmentshader_text,
                });
            } else {
                this.materials[index]=new THREE.MeshBasicMaterial( {color: util.rgbToHex(cl[0]*256,cl[1]*256,cl[2]*256), wireframe:true});
            }
        
            this.meshes[index] = new THREE.Mesh(this.geometries[index],this.materials[index]);
            this.meshes[index].visible=true;
            this.subviewers[index].getScene().add(this.meshes[index]);
        }
    }
}


module.exports=bisweb3DSurfaceMeshSet;
