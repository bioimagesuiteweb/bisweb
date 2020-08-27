const THREE=require('three');
const util=require('bis_util');
const $=require('jquery');
// ---------------------------------------------------------------------------------------------------
// Utility functions

let count=1;

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

const vertexshader_text_uniform = `
      varying vec3  vNormal;

      void main() {
           vNormal = normalize( normalMatrix * normal );
           vec3 transformed = vec3( position );
           vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
           gl_Position = projectionMatrix * mvPosition;
      }
`;

const fragmentshader_text_uniform=`
      uniform float opacity;
      uniform vec3 diffuse;
      varying vec3 vNormal;

      void main() {
          float v=max(0.0,vNormal.z);
          gl_FragColor = vec4( v*diffuse.x,v*diffuse.y,v*diffuse.z, opacity );
     }
`;

const vertexshader_text_attribute = `
      varying vec3  vNormal;
      varying vec4  vColor;
      uniform float minValue;
      uniform float maxValue;      
      uniform sampler2D cmTexture;
      attribute float attributes;

      void main() {

           float c=(attributes)/maxValue;           
           vColor= texture2D(cmTexture, vec2(c, 0));
           vNormal = normalize( normalMatrix * normal );
           vec3 transformed = vec3( position );
           vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
           gl_Position = projectionMatrix * mvPosition;
      }
`;

const fragmentshader_text_attribute=`
      uniform float opacity;
      varying vec3 vNormal;
      varying vec4 vColor;

      void main() {

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
        this.geometries=null;
        this.materials=null;
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
                    //console.log('Setting visible',this.count,i,'=',doshow);
                    this.meshes[i].visible=doshow;
                }
            }
        }
    }
    
    remove(doGeometries=true) {

        if (this.subviewers && this.meshes) {
            for (let i=0;i<this.subviewers.length;i++) {

                if (this.meshes[i] && this.subviewers[i]) {
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

        console.log('In Update Display Mode',this.count,in_hue,in_color,in_opacity,in_uniformColor);
        if (!this.attributes)
            in_uniformColor=true;
        
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
        if (!points) {
            return;
        }
        points=points.getDataArray();
        let pointData=surfaceobj.getPointData();
        if (pointData)
            pointData=pointData.getDataArray();


        if (!this.uniformColor) {
            if (attributeIndex<0)
                this.uniformColor=true;
            else if (!pointData)
                this.uniformColor=true;
        } 

        
        if (this.uniformColor) {
            this.attributes=null;
            this.texture=null;
        } else {
            this.attributes=new Float32Array(parseInt(points.length/3));
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
        this.addMeshesToScene(this.color,this.opacity,surfaceobj);
    }

    addMeshesToScene(cl=[1.0,1.0,1.0],opacity=0.8,surfaceobj=null) {

        //console.log('Add meshes to scene');
        
        this.materials=new Array(this.subviewers.length);
        if (surfaceobj) {
            //console.log('Creating new geometrie');
            this.geometries=new Array(this.subviewers.length);
            for (let i=0;i<this.subviewers.length;i++)
                this.geometries[i]=null;
        } else if (this.geometries===null) {
            console.log('No geometries in memory');
            return;
        }
        for (let i=0;i<this.subviewers.length;i++)
            this.materials[i]=null;

        let minsub=0;
        let maxsub=this.subviewers.length;
        
        for (let index=minsub;index<maxsub;index++) {
            
            if (surfaceobj) {
                this.geometries[index]=new THREE.BufferGeometry();
                let pdata=surfaceobj.getPoints().getDataArray();
                let tdata=surfaceobj.getTriangles().getDataArray();
                //console.log('pdata=',pdata.constructor.name,pdata.length,tdata.constructor.name,tdata.length);

                this.geometries[index].setIndex( new THREE.BufferAttribute( tdata,1));
                this.geometries[index].setAttribute( 'position', new THREE.BufferAttribute( pdata,3));
                this.geometries[index].computeVertexNormals();
                if (!this.uniformColor) {
                    console.log('Adding color by point');
                    this.geometries[index].setAttribute( 'attributes', new THREE.BufferAttribute( this.attributes, 1 ) );
                }
            } else if (this.geometries[index]===null) {
                console.log('Bad Geometry');
                return 0;
            }
            
            if (index === this.subviewers.length-1) {

                if (this.uniformColor) {
                    this.materials[index] = new THREE.ShaderMaterial({
                        transparent : true,
                        "uniforms": {
                            "diffuse": {  "type":"c","value":
                                          {"r":cl[0],
                                           "g":cl[1],
                                           "b":cl[2]}
                                       },
                            "opacity": {"type":"f","value":opacity},
                        },
                        vertexShader : vertexshader_text_uniform,
                        fragmentShader : fragmentshader_text_uniform,
                    });
                } else {
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
                            
                        },
                        vertexShader : vertexshader_text_attribute,
                        fragmentShader : fragmentshader_text_attribute,
                    });
                }
            } else {
                this.materials[index]=new THREE.MeshBasicMaterial( {color: util.rgbToHex(Math.floor(cl[0]*255),
                                                                                         Math.floor(cl[1]*255),
                                                                                         Math.floor(cl[2]*255)),
                                                                    wireframe:true});
            }

            this.meshes[index] = new THREE.Mesh(this.geometries[index],this.materials[index]);
            this.meshes[index].visible=false;
            if (this.subviewers[index])
                this.subviewers[index].getScene().add(this.meshes[index]);
        }
    }
}


module.exports=bisweb3DSurfaceMeshSet;
