const THREE=require('three');
const util=require('bis_util');
const $=require('jquery');
// ---------------------------------------------------------------------------------------------------
// Utility functions

let count=1;

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
      uniform int uniformColor;

      void main() {


         if (uniformColor>0) {
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

    constructor(defaultcolor) {

        this.count=count;
        count=count+1;
        
        this.texture=null;
        this.meshes=[];
        this.geometries=[];
        this.materials=[];
        this.subviewers=[];
        this.minattr=0.0;
        this.maxattr=0.0;
        this.attributes=null;
        this.uniformColor=true;
        this.color=defaultcolor || [ 1.0,1.0,1.0 ];
        this.hue=0.02;
        this.opacity=0.8;
    }


    showMeshes(doshow=true) {

        if (this.meshes) {
            for (let i=0;i<this.meshes.length;i++) {
                if (this.meshes[i]) {
                    this.meshes[i].visible=doshow;
                    console.log('Setting ',this.count,' i=',i,' visibility to',doshow);
                }
            }
        }
    }
    
    remove(doGeometries=true) {

        if (this.subviewers && this.meshes) {
            for (let i=0;i<this.subviewers.length;i++) {

                if (this.meshes[i]) {
                    this.subviewers[i].getScene().remove(this.meshes[i]);
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

    updateDisplayMode(in_hue=0.02,in_color=[1.0,1.0,1.0],in_opacity=0.8,in_uniformColor=false) {

        console.log('In Update Display Mode',this.count);
        
        if (in_color!==null)
            this.color=in_color;
        
        if (in_hue!==null) 
            this.hue=util.range(in_hue,0.0,1.0);
        
        if (in_opacity!==null)
            this.opacity=util.range(in_opacity,0.0,1.0);
        
        if (in_uniformColor!==null)
            this.uniformColor=in_uniformColor;
        
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
            this.texture=createColorLookupTableTexture(this.hue);
        } else {
            this.texture=null;
        }

        this.addMeshesToScene(this.color,this.opacity,null);
    }

    
    createMeshes(subviewers,surfaceobj,in_hue=0.02,in_color=[1.0,1.0,1.0 ],in_opacity=0.8,in_uniformColor=false,attributeIndex=0) {

        console.log('In Create Meshes',this.count);
        
        if (in_color!==null)
            this.color=in_color;
        
        if (in_hue!==null) 
            this.hue=util.range(in_hue,0.0,1.0);
        
        if (in_opacity!==null)
            this.opacity=util.range(in_opacity,0.0,1.0);
        
        if (in_uniformColor!==null)
            this.uniformColor=in_uniformColor;

        this.remove();
        let points=surfaceobj.getPoints();
        let pointData=surfaceobj.getPointData();
        this.attributes=new Float32Array(points.length);
        
        if (!this.uniformColor) {
            if (attributeIndex<0)
                this.uniformColor=true;
            else if (!pointData)
                this.uniformColor=true;
        } 

        
        if (this.uniformColor) {
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
            this.texture=createColorLookupTableTexture(this.hue);
        }
        this.subviewers=subviewers;
        this.addMeshesToScene(this.color,this.opacity,this.surfaceobj);
    }

    addMeshesToScene(cl=[1.0,1.0,1.0],opacity=0.8,surfaceobj=null) {

        console.log('In Add Meshes to Scene',this.count,' numviewers=',this.subviewers.length);
        
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
                let unf=0;
                if (this.uniformColor)
                    unf=1;
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
                        "uniformColor" : unf,
                    },
                    vertexShader : vertexshader_text,
                    fragmentShader : fragmentshader_text,
                });
            } else {
                this.materials[index]=new THREE.MeshBasicMaterial( {color: util.rgbToHex(Math.floor(cl[0]*255),
                                                                                         Math.floor(cl[1]*255),
                                                                                         Math.floor(cl[2]*255)),
                                                                    wireframe:true});
            }

            this.meshes[index] = new THREE.Mesh(this.geometries[index],this.materials[index]);
            this.meshes[index].visible=true;
            console.log('Adding mesh to',index, ' (COUNT=',this.count,')');
            this.subviewers[index].getScene().add(this.meshes[index]);
        }
    }
}


module.exports=bisweb3DSurfaceMeshSet;
