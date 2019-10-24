const THREE=require('three');
const bisCrossHair=require('bis_3dcrosshairgeometry');
const util=require('bis_util');
const bootbox=require('bootbox');
const $=require('jquery');
const numeric=require('numeric');

const globalParams={

    internal : null,
    brainmesh : [ null,null],
    braingeom : [ null,null],
    brainmaterial : [ null,null],
    brainindices : [ null,null ],
    braintexture : null,
    vertexlist : [null,null ],
    numelements : [ 1,1],
    lastresol : [ -1,-1],
};

let lasttexturehue=-1.0;
const lobeoffset=20.0;
const axisoffset=[0,5.0,20.0];

    
const color_modes = [ 'Uniform', 'PosDegree', 'NegDegree', 'Sum', 'Difference' ];

const display_modes = [ 'None', 'Left', 'Right', 'Both' ];
const displayimg= $('<img>');
const transferfunction = {
    map : null,
    minth : null,
    maxth : null
};

// ---------------------------------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------------------------------

const brain_vertexshader_text = `
      varying vec3  vNormal;
      varying vec4  vColor;
      attribute float parcels;
      uniform float minValue;
      uniform float maxValue;      
      uniform sampler2D cmTexture;
      uniform float opacity;

      void main() {

           float c=(parcels)/maxValue;           
           vColor= texture2D(cmTexture, vec2(c, 0));
           vNormal = normalize( normalMatrix * normal );
           vec3 transformed = vec3( position );
           vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
           gl_Position = projectionMatrix * mvPosition;
           if (opacity>0.99)
               gl_Position.z=0.99+0.01*gl_Position.z;

      }
`;

const brain_fragmentshader_text=`
      uniform float opacity;
      uniform vec3 diffuse;
      varying vec3 vNormal;
      varying vec4 vColor;
      

      void main() {
         float v=max(0.0,vNormal.z);
         gl_FragColor = vec4( v*vColor.x,
                              v*vColor.y,
                              v*vColor.z, 
                              opacity );
      }
`;

const sphere_vertexshader_text = `
      varying vec3 vNormal;
      void main() {
           vNormal = normalize( normalMatrix * normal );
           vec3 transformed = vec3( position );
           vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
           gl_Position = projectionMatrix * mvPosition;
      }
`;

const sphere_fragmentshader_text=`
      uniform float opacity;
      uniform vec3 diffuse;
      varying vec3 vNormal;
      void main() {
         float v=max(0.0,vNormal.z);
         gl_FragColor = vec4( v*diffuse.x,v*diffuse.y,v*diffuse.z, opacity );
      }
`;


// ---------------------------------------------------------------------------------------------------
// Link
// ---------------------------------------------------------------------------------------------------

var initialize=function(internal) {
    globalParams.internal=internal;
};
// ---------------------------------------------------------------------------------------------------

// 3D Rendering
// ---------------------------------------------------------------------------------------------------
let createTexture=function(hue) {


    if (Math.abs(hue-lasttexturehue)<0.01 && globalParams.brainTexture!==null)
        return 0;
    
    // Colormap texture
    lasttexturehue=hue;
    let canvas = document.createElement( 'canvas' );


    canvas.width=256;
    canvas.height=1;
    let canvasdata=canvas.getContext("2d").createImageData(256,1);

    if (hue>0.0 && hue<=1.0) { 
        let cmap=util.mapconstanthuecolormap(0.0,255.0,1.0,hue,1.0);
        transferfunction.map=cmap;
        transferfunction.minth=0;
        transferfunction.maxth=1;
        let map=[0,0,0,0];
        let data=[0];
        
        for (let i=0;i<=255;i++)  {
            data[0]=i;
            cmap(data,0,map);
            for (let j=0;j<=3;j++)
                canvasdata.data[i*4+j]=map[j];
        }
    } else {
        transferfunction.map=null;
        for (let i=0;i<=255;i++)  {
            for (let j=0;j<=2;j++)
                canvasdata.data[i*4+j]=224;
            canvasdata.data[i*4+3]=255.0;
        }
    }
    // Eliminate no opacity color
    canvasdata.data[3]=canvasdata.data[7];

    canvas.getContext("2d").putImageData(canvasdata,0,0);
    let outimg=canvas.toDataURL("image/png");
    displayimg.attr('src', outimg);
    displayimg.width(256);
    displayimg.height(16);
    
    if  (globalParams.braintexture)
        globalParams.braintexture.dispose();
    
    let cmtexture = new THREE.Texture(canvas);
    cmtexture.needsUpdate = true;
    cmtexture.minFilter = cmtexture.magFilter = THREE.LinearFilter;
    globalParams.braintexture=cmtexture;
    return 1;
};

// Parses Brain Surface
// @alias BisWebConnectivityVis3D1~createAndDisplayBrainSurface from json file
// @param {Number} index - 0=left, 1=right
// @param {Array} color - the color
// @param {Number} opacity - the opacity

var createAndDisplayBrainSurface=function(index=0,color,opacity=0.8,attributeIndex=2,resol=0) {

    if (globalParams.brainmesh[index] !==null) { 
        globalParams.brainmesh[index].visible=false;
        globalParams.internal.subviewers[3].getScene().remove(globalParams.brainmesh[index]);
    }


    let parcels=globalParams.brainindices[index];
    if (parcels===null)
        return;

    const matrix=globalParams.internal.conndata.statMatrix || null;
    let dim=[0,0];
    if (matrix===null) 
        attributeIndex=-1;
    else
        dim=numeric.dim(matrix);

    let attributes=new Float32Array(parcels.length);
    let mina=0,maxa=1;
    if (attributeIndex<0 || dim[0]!==268) {
        for (let i=0;i<parcels.length;i++) {
            attributes[i]=1;
        }
        attributeIndex=-1;

    } else {
        for (let i=0;i<parcels.length;i++) {
            attributes[i]=matrix[parcels[i]-1][attributeIndex];
        }

        mina=matrix[0][attributeIndex];
        maxa=matrix[0][attributeIndex];

        for (let i=1;i<dim[0];i++) {
            let a=matrix[i][attributeIndex];
            if (a<mina) mina=a;
            if (a>maxa) maxa=a;
        }
    }
        
    if (attributeIndex===0) {
        createTexture(0.02);
        color[0]=1.0;
        color[1]=0.3;
        color[2]=0.3;
        opacity=1.0;
    } else if (attributeIndex===1) {
        createTexture(0.58);
        color[0]=0.3;
        color[1]=0.6;
        color[2]=1.0;
        opacity=1.0;
    } else if (attributeIndex===2) {
        createTexture(0.07);
        color[0]=1.0;
        color[1]=0.6;
        color[2]=0.3;
        opacity=1.0;
    } else if (attributeIndex===3) {
        createTexture(0.3);
        color[0]=0.3;
        color[1]=0.7;
        color[2]=0.7;
        opacity=1.0;
    } else {
        createTexture(-2.0);
    }
    

    transferfunction.minth=0;
    transferfunction.maxth=maxa;

    let material = new THREE.ShaderMaterial({
        transparent : true,
        "uniforms": {
            "minValue" : { "type": "f", "value" : mina },
            "maxValue" : { "type": "f", "value" : maxa },
            "cmTexture" : { "value" : globalParams.braintexture },
            "diffuse": {  "type":"c","value":
                          {"r":color[0],
                           "g":color[1],
                           "b":color[2]}
                       },
            "opacity": {"type":"f","value":opacity},
        },
        vertexShader : brain_vertexshader_text,
        fragmentShader : brain_fragmentshader_text,
    });


    if (resol!== globalParams.lastresol[index]) {
        globalParams.braingeom[index].removeAttribute( 'position');
        globalParams.braingeom[index].addAttribute( 'position', new THREE.BufferAttribute( globalParams.vertexlist[index][resol], 3 ) );
        globalParams.braingeom[index].computeVertexNormals();
        globalParams.lastresol[index]=resol;
    }
    
    globalParams.braingeom[index].removeAttribute( 'parcels');
    globalParams.braingeom[index].addAttribute( 'parcels', new THREE.BufferAttribute( attributes, 1 ) );
    
    globalParams.brainmaterial[index]=material;
    globalParams.brainmesh[index] = new THREE.Mesh(globalParams.braingeom[index],material);
    globalParams.brainmesh[index].visible=true;
    globalParams.internal.subviewers[3].getScene().add(globalParams.brainmesh[index]);
};

var parsebrainsurface = function(textstring,filename) {
    
    let meshindex=0;
    let isright=filename.lastIndexOf("right");
    if (isright>=0)
        meshindex=1;
    
    let obj= JSON.parse(textstring);

    let numelements=obj['numelements'] || 1;
    
    let indices = new Uint32Array(obj.triangles.length);
    let parcels=null;

    
    if (obj.indices)
        parcels = new Uint32Array(obj.indices.length);

    
    let vertices = new Array(numelements);
    console.log('+++++ Brain surface loaded from '+filename+' '+[ obj.points.length,obj.triangles.length]);

    for (let e=0;e<numelements;e++) {
        vertices[e]=new Float32Array(obj.points.length);
        let srcname='points';
        if (e>0)
            srcname='points'+e;
        
        for (let i=0;i<obj[srcname].length;i+=3) {
            vertices[e][i+0]=obj[srcname][i+0];
            if (meshindex===1) // right
                vertices[e][i]+=lobeoffset;
            else // left
                vertices[e][i]-=lobeoffset;
            vertices[e][i+1]=obj[srcname][i+1];
            vertices[e][i+2]=obj[srcname][i+2];
        }
    }

    for (let i=0;i<obj.triangles.length;i++) 
        indices[i]=obj.triangles[i];

    if (obj.indices) {
        for (let i=0;i<parcels.length;i++)
            parcels[i]=obj.indices[i];
        console.log('Parcels=',parcels.length,obj.indices.length,obj.points.length/3,' ex=',parcels[0],parcels[22],parcels[73]);
    }
    
    let buf=new THREE.BufferGeometry();
    buf.setIndex( new THREE.BufferAttribute( indices, 1));
    buf.addAttribute( 'position', new THREE.BufferAttribute( vertices[0], 3 ) );
    buf.computeVertexNormals();

    globalParams.braingeom[meshindex]=buf;
    globalParams.brainindices[meshindex]=parcels;
    globalParams.vertexlist[meshindex]=vertices;
    globalParams.numelements[meshindex]=numelements;
    globalParams.lastresol[meshindex]=0;
    
    createAndDisplayBrainSurface(meshindex, [1.0,1.0,1.0],0.7,-1,0);
    
    if (globalParams.internal.axisline[0]===null) {
        // create axis line meshes
        
        let p_indices = new Uint16Array(2);
        p_indices[ 0 ] = 0;   p_indices[ 1 ] = 1; 
        for (let axis=0;axis<=2;axis++) {
            let p_vertices = new Float32Array(6);
            p_vertices[0]=-axisoffset[0]; p_vertices[1]=-axisoffset[1]; p_vertices[2]=-axisoffset[2];
            p_vertices[3]=-axisoffset[0]; p_vertices[4]=-axisoffset[1]; p_vertices[5]=-axisoffset[2];
            if (axis===0) {
                p_vertices[3]=180+lobeoffset+axisoffset[0];
                p_vertices[0]-=lobeoffset;
            } else if (axis===1) {
                p_vertices[4]=216.0+axisoffset[1];
            } else {
                p_vertices[5]=170.0;
            }
            let pbuf=new THREE.BufferGeometry();
            pbuf.setIndex( new THREE.BufferAttribute( p_indices, 1));
            pbuf.addAttribute( 'position', new THREE.BufferAttribute( p_vertices, 3 ) );
            globalParams.internal.axisline[axis] = new THREE.Line(pbuf,
                                                     new THREE.LineBasicMaterial( {
                                                         color: 0xff8800, 
                                                         transparent: false,
                                                         opacity: 1.0,
                                                     }));
            globalParams.internal.axisline[axis].visible=false;
            globalParams.internal.subviewers[3].getScene().add(globalParams.internal.axisline[axis]);
        }
        if (globalParams.internal.showlegend)
            globalParams.internal.setnodeFn(Math.round(globalParams.internal.parameters.node-1));

        window.dispatchEvent(new Event('resize'));
    }
};

// ---------------------------------------------------------------------------------------------
var draw3dcrosshairs = function () {
    if (globalParams.internal.axisline[0]===null)
        return;
    
    let coords = globalParams.internal.mni2tal.getMMCoordinates(globalParams.internal.mni);
    //        console.log('MNI=',globalParams.internal.mni,' --> Coords=',coords);
    if (globalParams.internal.mni[0]<0.0)
        coords[0]-=lobeoffset;
    else
        coords[0]+=lobeoffset;
    coords[1]+=axisoffset[1];
    coords[2]+=axisoffset[2];
    
    globalParams.internal.axisline[0].position.set(0.0,coords[1],coords[2]);
    globalParams.internal.axisline[1].position.set(coords[0],0.0,coords[2]);
    globalParams.internal.axisline[2].position.set(coords[0],coords[1],0.0);
    globalParams.internal.axisline[0].visible=true;
    globalParams.internal.axisline[1].visible=true;
    globalParams.internal.axisline[2].visible=true;
};

// ---------------------------------------------------------------------------------------------

var drawlines3d=function(state,doNotUpdateFlagMatrix) {     
   

    doNotUpdateFlagMatrix=doNotUpdateFlagMatrix || false;

    //        console.log('Rendermode=',globalParams.internal.rendermode);
    if (globalParams.internal.rendermode===6)
        doNotUpdateFlagMatrix=false;
    
    if (globalParams.internal.parcellations=== null ||
        globalParams.internal.subviewers === null)
        return 0;
    

    if (!doNotUpdateFlagMatrix) {
        console.log('Updating Flag Matrix\n');
        let ok=globalParams.internal.conndata.createFlagMatrix(globalParams.internal.parcellation,
                                                  state.mode, // mode
                                                  state.singlevalue, // singlevalue
                                                  state.attribcomponent, // attribcomponent
                                                  state.degreethreshold, // metric threshold
                                                  state.filter); // sum
        
        if (ok===0) {
            bootbox.alert('Failed to create flag matrix for 3D connectivity data!');
            return 0;
        }
    }
    


    // Now add lines
    let pos=[],neg=[],total=0;
    if (state.linestodraw == globalParams.internal.gui_Lines[0] ||
        state.linestodraw == globalParams.internal.gui_Lines[2] ) {
        pos=globalParams.internal.conndata.createLinePairs(0,state.matrixthreshold);
        total+=pos.length;
    }
    if (state.linestodraw == globalParams.internal.gui_Lines[1] ||
        state.linestodraw == globalParams.internal.gui_Lines[2] ) {

        neg=globalParams.internal.conndata.createLinePairs(1,state.matrixthreshold);
        total+=neg.length;
    }
    if (total===0)
        return 0;

    
    let color = [ state.poscolor, 
                  state.negcolor,
                  state.poscolor,
                  state.negcolor  ];

    //        console.log('Drawing 3D',state.poscolor,state.negcolor);
    
    let lparr = globalParams.internal.conndata.draw3DLines(globalParams.internal.parcellation,pos,neg);
    for (let i=0;i<=1;i++) {
        let lp=lparr[i];
        if (lp.indices!==null) {
            let buf=new THREE.BufferGeometry();
            buf.setIndex(  new THREE.BufferAttribute( lp.indices, 1 ) );
            buf.addAttribute( 'position', new THREE.BufferAttribute( lp.vertices, 3 ) );
            let linemesh = new THREE.LineSegments(buf,
                                                  new THREE.LineBasicMaterial( {
                                                      color: color[i],
                                                      linewidth : 1,
                                                      linecap : "square",
                                                  }));
            linemesh.visbile=true;
            globalParams.internal.subviewers[3].getScene().add(linemesh);
            globalParams.internal.meshes.push(linemesh);
        }
    }

    let sphere = new THREE.SphereGeometry(state.radius,16,16);
    let presphere = bisCrossHair.createpregeometry([sphere]);

    for (let j=2;j<=5;j++) {
        let sph=lparr[j];
        let scale=255.0;
        if (sph.positions.length>0) {
            let cl=util.hexToRgb(color[j-2]);
            if (j>3)
                scale=500.0;
            //                  console.log('Spheres '+j+' length='+sph.positions.length+' color='+[ cl.r,cl.g,cl.b]+' scale='+scale);

            let spherematerial = new THREE.ShaderMaterial({
                transparent : false,
                "uniforms": {
                    "diffuse": {  "type":"c","value":
                                  {"r":cl.r/scale,
                                   "g":cl.g/scale,
                                   "b":cl.b/scale}},
                    "opacity": {"type":"f","value":1.0},
                },
                vertexShader : sphere_vertexshader_text,
                fragmentShader : sphere_fragmentshader_text,
            });
            let geom=bisCrossHair.createcopies(presphere,sph.positions,sph.scales);
            geom.computeVertexNormals();
            let spheremesh=new THREE.Mesh(geom,spherematerial);
            spheremesh.renderOrder=1000;
            spheremesh.visbile=true;
            globalParams.internal.subviewers[3].getScene().add(spheremesh);
            globalParams.internal.meshes.push(spheremesh);
        }
    }
    
    
    return total;
};
// ---------------------------------------------------------------------------------------------
var update3DMeshes=function(opacity=0.5,modename='uniform',displaymode='Both',resol=0) {

    let mode=color_modes.indexOf(modename)-1;
    let dmode=display_modes.indexOf(displaymode);

    createAndDisplayBrainSurface(0, [1.0,1.0,1.0],opacity,mode,resol);
    createAndDisplayBrainSurface(1, [1.0,1.0,1.0],opacity,mode,resol);

    let show=[true,true];
    if (dmode<=0) 
        show=[false,false];
    else if (dmode==1)
        show[1]=false;
    else if (dmode==2)
        show[0]=false;

    for (let i=0;i<=1;i++) {
        if (globalParams.brainmesh[i] !==null) { 
            globalParams.brainmesh[i].visible=show[i];
        }
    }
};

module.exports = {

    initialize : initialize,
    parsebrainsurface : parsebrainsurface,
    draw3dcrosshairs : draw3dcrosshairs,
    drawlines3d : drawlines3d,
    lobeoffset : lobeoffset,
    createAndDisplayBrainSurface : createAndDisplayBrainSurface,
    color_modes  : color_modes,
    displayimg : displayimg,
    transferfunction : transferfunction,
    display_modes  : display_modes,
    update3DMeshes :     update3DMeshes,
};
