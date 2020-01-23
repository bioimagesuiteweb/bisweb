const THREE=require('three');
const bisCrossHair=require('bis_3dcrosshairgeometry');
const util=require('bis_util');
const bootbox=require('bootbox');
const $=require('jquery');
const numeric=require('numeric');


let lasttexturehue=-1.0;
const color_modes = [ 'Uniform', 'PosDegree', 'NegDegree', 'Sum', 'Difference' ];
const display_modes = [ 'None', 'Left', 'Right', 'Both' ];
const displayimg= $('<img>');
const transferfunction = {
    map : null,
    minth : null,
    maxth : null
};

const globalParams={
    internal : null
};

// ---------------------------------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------------------------------

var reset_global_params=function() {

    globalParams['brainmesh']= [ null,null];
    globalParams['braingeom']= [ null,null];
    globalParams['brainmaterial']= [ null,null];
    globalParams['brainindices']= [ null,null ];
    globalParams['braintexture']= null;
    globalParams['vertexlist']= [null,null ];
    globalParams['numelements']= [ 1,1];
    globalParams['lastresol']= [ -1,-1];
    globalParams['maxpoint']= [ 200000,200000 ];
    globalParams['LOBEOFFSET']= 20.0;
    globalParams['AXISOFFSET']= [0,5.0,20.0];
    globalParams['AXISSIZE']= [ 180.0,216.0, 170.0 ];
    globalParams['AXISSCALE']= [ 1.0,1.0,1.0 ];
    globalParams['ATLAS']=null;
};


reset_global_params();

const brain_vertexshader_text = `
      varying vec3  vNormal;
      varying vec4  vColor;
      attribute float parcels;
      uniform float minValue;
      uniform float maxValue;      
      uniform sampler2D cmTexture;
      uniform float opacity;

      void main() {

           if (parcels<0.0) {
              vColor=vec4(0,0,0,0);
           } else {
              float c=(parcels)/maxValue;           
              vColor= texture2D(cmTexture, vec2(c, 0));
           }
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

         if (vColor[3]<=0.0)
            discard;

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
// @param {Number} attributeindex -- the attribute used to color
// @param {Number} resol -- the resolution level to use
// @param {Number} hidecereb -- if true hide part of brain

var createAndDisplayBrainSurface=function(index=0,color,opacity=0.8,attributeIndex=2,resol=0,hidecereb=false) {

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

    let colorsurface=true;
    if (attributeIndex<0)
        colorsurface=false;
    else if (globalParams.internal.hassurfaceindices===false)
        colorsurface=false;

    console.log('Color surface=',colorsurface,' internal=',globalParams.internal.hassurfaceindices,'(',globalParams.internal.baseatlas, attributeIndex,')', parcels.length);
    
    if (!colorsurface) {
        for (let i=0;i<parcels.length;i++) {
            attributes[i]=1;
        }
        attributeIndex=-1;
    } else {

        console.log('Parcels=',parcels.length);
        let mdim=numeric.dim(matrix);
        console.log('Mdim=',mdim);
        
        for (let i=0;i<parcels.length;i++) {
            if (parcels[i]>0) {
                try { 
                    attributes[i]=matrix[parcels[i]-1][attributeIndex];
                } catch(e) {
                    console.log('Failed',i,parcels[i]);
                    attributes[i]=0;
                }
            } else {
                attributes[i]=0;
            }
        }

        
        
        mina=matrix[0][attributeIndex];
        maxa=matrix[0][attributeIndex];

        for (let i=1;i<dim[0];i++) {
            let a=matrix[i][attributeIndex];
            if (a<mina) mina=a;
            if (a>maxa) maxa=a;
        }
    }

    if (hidecereb) {
        for (let i=globalParams.maxpoint[index];i<parcels.length;i++) {
            attributes[i]=-1000;
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


var parse_multires_binary_surfaces=function(in_data,filename) {

    globalParams.maxpoint=[ 200000,200000 ];
    
    let buffer=in_data.buffer;

    console.log('Parsing binary file',filename,in_data.length);
    
    let cursor=0;
    let header=new Uint32Array(buffer,0,1);
    
    if (header[0]!==1702) {
        console.log('Bad Surface Data');
        return [ null,null ];
    }

    cursor+=4;
    let surfaces=[null,null];
    // Store things right, then left
    for (let mesh=1;mesh>=0;mesh=mesh-1) {
        let header=new Uint32Array(buffer,cursor,4);
        cursor=cursor+header.byteLength;

        //console.log('-------------------------------');
        //console.log('Initializing Mesh',mesh,'cursor=',cursor);
        surfaces[mesh]={};
        let numelements=header[0];
        let maxpoint=header[1];
        let numpoints=header[2];
        let numtriangles=header[3];

        //        console.log('Maxpoint=',maxpoint);
        
        surfaces[mesh]['numelements']=numelements;
        surfaces[mesh]['maxpoint']=maxpoint;
        surfaces[mesh]['vertices'] = new Array(numelements);

        
        
        //console.log('NumPoints=',numpoints,'numtriangles=',numtriangles,'maxpoint=',maxpoint,'numelements=',numelements);
        
        for (let j=0;j<numelements;j++) {
            let arr=new Float32Array(buffer,cursor,numpoints*3);
            //            if (j===0)
            //  console.log('Points=',arr[0],arr[1],arr[2],arr[arr.length-3],arr[arr.length-2],arr[arr.length-1]);

            cursor=cursor+arr.byteLength;

            /*            if (j===0)
                          console.log('Mesh=',mesh, 'Point 0 = ',arr[300],arr[301],arr[302]);*/
            
            let shiftx=globalParams.LOBEOFFSET;
            if (mesh===0) // left
                shiftx=-globalParams.LOBEOFFSET;
            for (let p=0;p<arr.length;p+=3)
                arr[p]+=shiftx;

            /*if (j===0)
              console.log('Point 0 --> ',arr[300],arr[301],arr[302]);*/
            
            surfaces[mesh]['vertices'][j]=arr;
            //console.log('Created points array',j,arr.length,arr.byteLength,' cursor=',cursor);

        }
        surfaces[mesh]['indices']=new Uint32Array(buffer,cursor,numtriangles*3);
        cursor=cursor+surfaces[mesh]['indices'].byteLength;

        //let tarr=surfaces[mesh]['indices'];
        //console.log('Triangles=',tarr[0],tarr[1],tarr[2],tarr[tarr.length-3],tarr[tarr.length-2],tarr[tarr.length-1]);

        
        //console.log('Indices=',numtriangles*3,'cursor=',cursor);
        surfaces[mesh]['parcels']=new Uint32Array(buffer,cursor,numpoints);
        //let iarr=surfaces[mesh]['parcels'];
        //console.log('Indices=',iarr[0],iarr[1],iarr[2],iarr[25000],iarr[iarr.length-3],iarr[iarr.length-2],iarr[iarr.length-1]);
        cursor=cursor+surfaces[mesh]['parcels'].byteLength;
        //console.log('Parcels=',numpoints,'cursor=',cursor);
    }
    return surfaces;

};

var removesurfacemeshes = function() {
    /*for (let i=0;i<=1;i++) {
        if (globalParams.brainmesh[i] !==null) { 
            globalParams.brainmesh[i].visible=false;
            globalParams.internal.subviewers[3].getScene().remove(globalParams.brainmesh[i]);
        }
        }*/

    globalParams['ATLAS']=globalParams.internal.ATLASLIST[globalParams.internal.baseatlas];
    //console.log('Base Atlas=',globalParams['ATLAS']);
    globalParams.LOBEOFFSET=globalParams['ATLAS']['midoffset'];
    globalParams.AXISOFFSET=globalParams['ATLAS']['axisoffset'];
    globalParams.AXISSIZE  =globalParams['ATLAS']['axissize'];
    globalParams.AXISSCALE =globalParams['ATLAS']['spacing'];
    globalParams.internal.subviewers[3].reset();
    //reset_global_params();
};

var create_axis_lines=function() {

    for (let axis=0;axis<=2;axis++) {
        if (globalParams.internal.axisline[axis]!==null) {
            globalParams.internal.axisline[axis].visible=false;
            globalParams.internal.subviewers[3].getScene().remove(globalParams.internal.axisline[axis]);
        }
    }


    //console.log('Mid Coords=',globalParams.LOBEOFFSET);
    
    let p_indices = new Uint16Array(2);
    p_indices[ 0 ] = 0;   p_indices[ 1 ] = 1; 
    for (let axis=0;axis<=2;axis++) {
        let p_vertices = new Float32Array(6);
        p_vertices[0]=-globalParams.AXISOFFSET[0];
        p_vertices[1]=-globalParams.AXISOFFSET[1];
        p_vertices[2]=-globalParams.AXISOFFSET[2];
        p_vertices[3]=-globalParams.AXISOFFSET[0];
        p_vertices[4]=-globalParams.AXISOFFSET[1];
        p_vertices[5]=-globalParams.AXISOFFSET[2];
        if (axis===0) {
            p_vertices[3]=globalParams.AXISSIZE[0]+globalParams.LOBEOFFSET+globalParams.AXISOFFSET[0];
            p_vertices[0]-=globalParams.LOBEOFFSET;
        } else if (axis===1) {
            p_vertices[4]=globalParams.AXISSIZE[1]+globalParams.AXISOFFSET[1];
        } else {
            p_vertices[5]=globalParams.AXISSIZE[2];
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
};

var parsebrainsurface = function(surfacedata,filename) {

    console.log('In parse brainsurface\n',filename,'\n');
    removesurfacemeshes();
    create_axis_lines();
    
    let surfaces=parse_multires_binary_surfaces(surfacedata,filename);
    
    if (surfaces[0]===null && surfaces[1]===null) {
        console.log('Nothing found');
        return;
    }

    // Remove all
    // Mass cleanup


    
    for (let meshindex=0;meshindex<=1;meshindex++) {

        if (surfaces[meshindex]!==null) {
            let buf=new THREE.BufferGeometry();
            buf.setIndex( new THREE.BufferAttribute( surfaces[meshindex].indices, 1));
            buf.addAttribute( 'position', new THREE.BufferAttribute( surfaces[meshindex]['vertices'][0], 3 ) );
            buf.computeVertexNormals();
            
            globalParams.braingeom[meshindex]=buf;
            globalParams.brainindices[meshindex]=surfaces[meshindex]['parcels'];
            globalParams.vertexlist[meshindex]=surfaces[meshindex]['vertices'];
            globalParams.numelements[meshindex]=surfaces[meshindex]['numelements'];
            globalParams.lastresol[meshindex]=0;
            globalParams.maxpoint[meshindex]=surfaces[meshindex]['maxpoint'] || 0;
    
            createAndDisplayBrainSurface(meshindex, [1.0,1.0,1.0],0.7,-1,0,false);
        }
    }
    
    if (globalParams.internal.showlegend)
        globalParams.internal.setnodeFn(Math.round(globalParams.internal.parameters.node-1));

    window.dispatchEvent(new Event('resize'));
    
};

// ---------------------------------------------------------------------------------------------
var draw3dcrosshairs = function (coords=null) {

    globalParams['ATLAS']=globalParams.internal.ATLASLIST[globalParams.internal.baseatlas];
    
    if (globalParams.internal.axisline[0]===null)
        return;

    let inmm=true;
    
    if (coords===null) {
        coords=[ globalParams.internal.mni[0],globalParams.internal.mni[1],globalParams.internal.mni[2] ];
        inmm=false;
    }

    if (!inmm) {
        if (globalParams['ATLAS']['ismni']) {
            coords = globalParams.internal.mni2tal.getMMCoordinates(globalParams.internal.mni);
        }
    }

    let shift=globalParams.LOBEOFFSET;
    if (!inmm) {
        if (globalParams['ATLAS']['ismni']) {
            if (globalParams.internal.mni[0]<0.0)
                shift-=globalParams.LOBEOFFSET;
        } else {
            if (coords[0]<globalParams['ATLAS']['dimensions'][0]/2) 
                shift=-shift;
            for (let i=0;i<=2;i++)
                coords[i]=coords[i]*globalParams.AXISSCALE[i];
        }
    } else {
        if (coords[0]<globalParams['ATLAS']['dimensions'][0]*globalParams['ATLAS']['spacing'][0]/2)
            shift=-shift;
        coords[0]+=shift;
    }

    coords[0]+=globalParams.AXISOFFSET[0];
    coords[1]+=globalParams.AXISOFFSET[1];
    coords[2]+=globalParams.AXISOFFSET[2];
    globalParams.internal.axisline[0].position.set(0.0,coords[1],coords[2]);
    globalParams.internal.axisline[1].position.set(coords[0],0.0,coords[2]);
    globalParams.internal.axisline[2].position.set(coords[0],coords[1],0.0);
    globalParams.internal.axisline[0].visible=true;
    globalParams.internal.axisline[1].visible=true;
    globalParams.internal.axisline[2].visible=true;
};

// ---------------------------------------------------------------------------------------------

var drawlines3d=function(state,doNotUpdateFlagMatrix) {     

    
    try {
        globalParams.internal.subviewers[3].getScene();
    } catch(e) {
        console.log('Viewer not initialized');
        return;
    }

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

    globalParams['ATLAS']=globalParams.internal.ATLASLIST[globalParams.internal.baseatlas];
    //console.log('Atlas=',globalParams['ATLAS']);

    
    let lparr = globalParams.internal.conndata.draw3DLines(globalParams.internal.parcellation,
                                                           pos,neg,2.0,1.0,
                                                           globalParams['ATLAS']);
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
var update3DMeshes=function(opacity=0.5,modename='uniform',displaymode='Both',resol=0,hidecereb=false) {

    let mode=color_modes.indexOf(modename)-1;
    let dmode=display_modes.indexOf(displaymode);

    createAndDisplayBrainSurface(0, [1.0,1.0,1.0],opacity,mode,resol,hidecereb);
    createAndDisplayBrainSurface(1, [1.0,1.0,1.0],opacity,mode,resol,hidecereb);

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
    lobeoffset : globalParams.LOBEOFFSET,
    createAndDisplayBrainSurface : createAndDisplayBrainSurface,
    color_modes  : color_modes,
    displayimg : displayimg,
    transferfunction : transferfunction,
    display_modes  : display_modes,
    update3DMeshes :     update3DMeshes,
};
