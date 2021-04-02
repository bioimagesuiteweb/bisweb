const THREE=require('three');
const bisCrossHair=require('bis_3dcrosshairgeometry');
const util=require('bis_util');
const bootbox=require('bootbox');
const $=require('jquery');
const numeric=require('numeric');
const atlasutils=require('bisweb_atlasutilities');

let lasttexturehue=-100000.0,lasttexturehue2=-100000.0,lasttexturemode='none';
const color_modes = [ 'Uniform', 'PosDegree', 'NegDegree', 'Sum', 'Difference' ,'Parcels','CombinedDegree'];
const display_modes = [ 'None', 'Left', 'Right', 'Both' ];
const displayimg= $('<img>');
const transferfunction = {
    map : null,
    map2 : null,
    minth : null,
    maxth : null,
    hue : null,
    hue2 : null,
    mode : 'single',
    showlabels : true,
};

const COLORSCALE=32;


const globalParams={
    internal : null
};

const createBufferGeometry=function() {

    const g=new THREE.BufferGeometry();
    
    if (THREE['REVISION']<101) {
        g.setAttribute=g.addAttribute;
        g.deleteAttribute=g.removeAttribute;
    }
    return g;
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
};


reset_global_params();

const brain_vertexshader_text = `
      varying vec3  vNormal;
      varying vec4  vColor;
      attribute float parcels;
      uniform float minValue;
      uniform float maxValue;      
      uniform float dual;      
      uniform sampler2D cmTexture;
      uniform float opacity;

      void main() {

           if (dual<0.5) {
              if (parcels<0.0) {
                vColor=vec4(0,0,0,0);
              } else {
                 float c=(parcels)/maxValue;           
                 if (c>=0.999)
                   c=0.999;
                 vColor= texture2D(cmTexture, vec2(c, 0));
              }
           } else {
              if (parcels>0.0)  {
                 float c=0.5+0.5*(parcels/maxValue);
                 if (c>=0.999)
                   c=0.999;
                 vColor= texture2D(cmTexture, vec2(c, 0));
              } else {
                  float c=0.5-0.5*(abs(parcels)/maxValue);
                  if (c<0.001)
                    c=0.001;
                 vColor= texture2D(cmTexture, vec2(c, 0));                     
              }
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


    if (Math.abs(hue-lasttexturehue)<0.01 && globalParams.brainTexture!==null &&  lasttexturemode==='single') {
        console.log('Not creating texture');
        return 0;
    }
    
    // Colormap texture
    lasttexturehue=hue;
    lasttexturemode='single';
    let canvas = document.createElement( 'canvas' );
    canvas.width=256;
    canvas.height=1;
    let canvasdata=canvas.getContext("2d").createImageData(256,1);

    transferfunction.hue=hue;
    transferfunction.mode='single';
    
    if (hue>0.0 && hue<=1.0) {

        let cmap=util.mapconstanthuecolormap(0.0,255.0,1.0,hue,1.0);
        transferfunction.map=cmap;
        transferfunction.minth=0;
        transferfunction.maxth=1;
        transferfunction.showlabels=true;
        let map=[0,0,0,0];
        let data=[0];
        
        for (let i=0;i<=255;i++)  {
            data[0]=i;
            cmap(data,0,map);
            for (let j=0;j<=3;j++)
                canvasdata.data[i*4+j]=map[j];
        }
        canvasdata.data[3]=canvasdata.data[7];
    } else if (hue>-2.0) {
        transferfunction.map=null;
        for (let i=0;i<=255;i++)  {
            for (let j=0;j<=2;j++)
                canvasdata.data[i*4+j]=224;
            canvasdata.data[i*4+3]=255.0;
        }
        canvasdata.data[3]=canvasdata.data[7];
    } else {
        let cmap=util.mapobjectmapfactory(255.0);
        transferfunction.showlabels=false;
        transferfunction.map=cmap;
        transferfunction.minth=0;
        transferfunction.maxth=COLORSCALE;
        let map=[0,0,0,0];
        let data=[0];

        let colorpiece=256/(COLORSCALE);
        
        for (let i=0;i<=255;i++)  {
            if (i<colorpiece) {
                map = [ 128,128,128,128 ];
            } else {
                data[0]=Math.floor((i)/colorpiece);
                cmap(data,0,map);
            }
            for (let j=0;j<=3;j++)
                canvasdata.data[i*4+j]=map[j];
        }
    }

    
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

// ---------------------------------------------------------------------------------------------------
let createDualTexture=function(hue,hue2) {

    if (Math.abs(hue-lasttexturehue)<0.01 
        && Math.abs(hue2-lasttexturehue2)<0.01
        && lasttexturemode==='dual'
        && globalParams.brainTexture!==null)
        return 0;

    hue=util.range(hue,0.0,1.0);
    hue2=util.range(hue2,0.0,1.0);
//    console.log('Dual Texture',hue,hue2);
    
    // Colormap texture
    lasttexturehue=hue;
    lasttexthrehue2=hue2;
    lasttexturemode='dual';
    let canvas = document.createElement( 'canvas' );
    canvas.width=256;
    canvas.height=1;
    let canvasdata=canvas.getContext("2d").createImageData(256,1);

    transferfunction.hue=hue;
    transferfunction.hue2=hue2;
    transferfunction.mode='dual';


    let  cmap=  util.mapconstanthuecolormap(0.0,127.0,1.0,hue,1.0,true);
    let  cmap2=util.mapconstanthuecolormap(0.0,127.0,1.0,hue2,1.0,true);
    transferfunction.map=cmap;
    transferfunction.map2=cmap2;
    transferfunction.minth=0;
    transferfunction.maxth=1;
    transferfunction.showlabels=true;
    let map=[0,0,0,0];
    let data=[0];
        
    for (let i=0;i<=127;i++)  {
        data[0]=i;
        cmap(data,0,map);
        for (let j=0;j<=3;j++)
            canvasdata.data[(i+128)*4+j]=map[j];
    }
    
    for (let i=0;i<=127;i++)  {
        data[0]=127-i;
        cmap2(data,0,map);
        for (let j=0;j<=3;j++)
            canvasdata.data[i*4+j]=map[j];
    }

    for (let i=127;i<=128;i++) {
        let j=i*4;
        canvasdata.data[j+3]=255;
        //console.log(i,'=',canvasdata.data[j],canvasdata.data[j+1],canvasdata.data[j+2],canvasdata.data[j+3]);
        
    }
        
    
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
// @param {Boolean} useAttributeMax -- if true saturate value
// @param {Number} attributeMax -- if useAttributeMax true use this to set the maximum value
// @param {Boolean} customHue -- if true use custom hue
// @param {Number} hueValue -- if CustomHue is true use hueValue


var createAndDisplayBrainSurface=function(index=0,color,opacity=0.8,attributeIndex=2,resol=0,hidecereb=false,
                                          useAttributeMax=false,attributeMax=100.0,
                                          customHue=false,hueValue=0.2) {

    if (globalParams.brainmesh[index] !==null) { 
        globalParams.brainmesh[index].visible=false;
        globalParams.internal.subviewers[3].getScene().remove(globalParams.brainmesh[index]);

    }

    let parcels=globalParams.brainindices[index];
    if (parcels===null)
        return;

    const matrix=globalParams.internal.conndata.statMatrix || null;
    if (matrix===null && attributeIndex<4) 
        attributeIndex=-1;

    if (!globalParams.internal.hassurfaceindices || globalParams.brainindices[0]===null)
        attributeIndex=-1;
    
    
    let attributes=new Float32Array(parcels.length);
    let mina=0,maxa=1;
    let colorsurface=true;
    if (attributeIndex<0)
        colorsurface=false;
    else if (globalParams.internal.hassurfaceindices===false)
        colorsurface=false;
    

    if (!colorsurface) {
        for (let i=0;i<parcels.length;i++) {
            attributes[i]=1;
        }
        attributeIndex=-1;
    } else if (attributeIndex===5) {
        //console.log('Parcels=',parcels.length);
        for (let i=0;i<parcels.length;i++) {
            if (parcels[i]>0) {
                try {
                    let pos=Math.abs(matrix[parcels[i]-1][0]);
                    let neg=Math.abs(matrix[parcels[i]-1][1]);
                    if (pos>neg)
                        attributes[i]=pos;
                    else
                        attributes[i]=-neg;
                    
                } catch(e) {
                    console.log('Failed',i,parcels[i]);
                    attributes[i]=0;
                }
            } else {
                attributes[i]=0;
            }
            
        }
        
        if (useAttributeMax) {
            maxa=attributeMax;
            mina=-attributeMax;
        } else {
            maxa=1;
            let dim=numeric.dim(matrix);
            for (let i=0;i<dim[0];i++) {
                let a=Math.max(Math.abs(matrix[i][0]),Math.abs(matrix[i][1]));
                if (a>maxa) maxa=a;
            }
            mina=-maxa;
        }

        
    } else if (attributeIndex!==4) {
        // Single Texture
        
        for (let i=0;i<parcels.length;i++) {
            if (parcels[i]>0) {
                try { 
                    attributes[i]=Math.abs(matrix[parcels[i]-1][attributeIndex]);
                } catch(e) {
                    console.log('Failed',i,parcels[i]);
                    attributes[i]=0;
                }
            }
        }
        
        if (useAttributeMax) {
            maxa=attributeMax;
            mina=-attributeMax;
        } else {
            mina=matrix[0][attributeIndex];
            maxa=matrix[0][attributeIndex];
            let dim=numeric.dim(matrix);
            
            for (let i=1;i<dim[0];i++) {
                let a=matrix[i][attributeIndex];
                if (a<mina) mina=a;
                if (a>maxa) maxa=a;
            }
        }
    } else {
        // value=parcel number
        mina=0;
        maxa=COLORSCALE;
        for (let i=0;i<parcels.length;i++) {
            if (parcels[i]<1) {
                attributes[i]=0;
            } else {
                attributes[i]= ((parcels[i]-1) % COLORSCALE)+1.5;
            }
        }
    }

    
    if (hidecereb) {
        for (let i=globalParams.maxpoint[index];i<parcels.length;i++) {
            attributes[i]=-1000;
        }
    }

    if (attributeIndex===0) {
        let hue=0.02;
        if (customHue)
            hue=hueValue;
        createTexture(hue);
        color[0]=1.0;
        color[1]=0.3;
        color[2]=0.3;
        opacity=1.0;
    } else if (attributeIndex===1) {
        let hue=0.58;
        if (customHue)
            hue=hueValue;
        createTexture(hue);
        color[0]=0.3;
        color[1]=0.6;
        color[2]=1.0;
        opacity=1.0;
    } else if (attributeIndex===2) {
        let hue=0.07;
        if (customHue)
            hue=hueValue;
        createTexture(hue);
        color[0]=1.0;
        color[1]=0.6;
        color[2]=0.3;
        opacity=1.0;
    } else if (attributeIndex===3) {
        let hue=0.3;
        if (customHue)
            hue=hueValue;
        createTexture(hue);
        color[0]=0.3;
        color[1]=0.7;
        color[2]=0.7;
        opacity=1.0;
    } else if (attributeIndex===4) {
        createTexture(-10.0);
        color[0]=0.1;
        color[1]=0.1;
        color[2]=0.1;
        opacity=1.0;
    } else if (attributeIndex===5) {
        createDualTexture(0.02,0.58);
    } else {
        createTexture(-1.0);
    }
    
    transferfunction.minth=0;
    transferfunction.maxth=maxa;
    let dual=0;
    if (transferfunction.mode === 'dual')
        dual=1;
    
    //    console.log('Mina=',mina,maxa,'dual=',dual);
    
    let material = new THREE.ShaderMaterial({
        transparent : true,
        "uniforms": {
            "minValue" : { "type": "f", "value" : mina },
            "maxValue" : { "type": "f", "value" : maxa },
            "dual" : { "type": "f", "value" : dual },
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
        globalParams.braingeom[index].deleteAttribute( 'position');
        globalParams.braingeom[index].setAttribute( 'position', new THREE.BufferAttribute( globalParams.vertexlist[index][resol], 3 ) );
        globalParams.braingeom[index].computeVertexNormals();
        globalParams.lastresol[index]=resol;
    }
    
    globalParams.braingeom[index].deleteAttribute( 'parcels');
    globalParams.braingeom[index].setAttribute( 'parcels', new THREE.BufferAttribute( attributes, 1 ) );
    
    globalParams.brainmaterial[index]=material;
    globalParams.brainmesh[index] = new THREE.Mesh(globalParams.braingeom[index],material);
    globalParams.brainmesh[index].visible=true;
    globalParams.internal.subviewers[3].getScene().add(globalParams.brainmesh[index]);
};


var parse_multires_binary_surfaces=function(in_data,filename) {

    const ATLASHEADER=atlasutils.getCurrentAtlasHeader();
    globalParams.maxpoint=[ 200000,200000 ];
    
    let buffer=in_data.buffer;

    console.log('.... Parsing binary file',filename,in_data.length);

    let hasparcels=true;
    
    let cursor=0;
    let header=new Uint32Array(buffer,0,1);
    
    if (header[0]!==1702 && header[0]!==1703) {
        console.log('Bad Surface Data');
        return [ null,null ];
    }

    if (header[0]===1703)
        hasparcels=false;

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
            //if (j===0)
            //console.log('Mesh=',mesh,'Point 100=',arr[300],arr[301],arr[302]);

            let shiftx=ATLASHEADER['midoffset'];
            if (mesh===0) // left
                shiftx=-ATLASHEADER['midoffset'];
            for (let p=0;p<arr.length;p+=3)
                arr[p]+=shiftx;
            
            //if (j===0)
            //  console.log('Shifted Mesh=',mesh,'Point 100=',arr[300],arr[301],arr[302]);

            cursor=cursor+arr.byteLength;
            surfaces[mesh]['vertices'][j]=arr;
        }
        surfaces[mesh]['indices']=new Uint32Array(buffer,cursor,numtriangles*3);
        cursor=cursor+surfaces[mesh]['indices'].byteLength;

        //let tarr=surfaces[mesh]['indices'];
        //console.log('Triangles=',tarr[0],tarr[1],tarr[2],tarr[tarr.length-3],tarr[tarr.length-2],tarr[tarr.length-1]);

        
        //console.log('Indices=',numtriangles*3,'cursor=',cursor);
        if (hasparcels) {
            surfaces[mesh]['parcels']=new Uint32Array(buffer,cursor,numpoints);
            //let iarr=surfaces[mesh]['parcels'];
            //console.log('Indices=',iarr[0],iarr[1],iarr[2],iarr[25000],iarr[iarr.length-3],iarr[iarr.length-2],iarr[iarr.length-1]);
            cursor=cursor+surfaces[mesh]['parcels'].byteLength;
        } else {
            surfaces[mesh]['parcels']=null;
            //console.log('Parcels=',numpoints,'cursor=',cursor);
        }
    }
    return surfaces;

};



var create_axis_lines=function() {

    const ATLASHEADER=atlasutils.getCurrentAtlasHeader();
    
    for (let axis=0;axis<=2;axis++) {
        if (globalParams.internal.axisline[axis]!==null) {
            globalParams.internal.axisline[axis].visible=false;
            globalParams.internal.subviewers[3].getScene().remove(globalParams.internal.axisline[axis]);
        }
    }


    //console.log('Mid Coords=',ATLASHEADER['midoffset']);
    
    let p_indices = new Uint16Array(2);
    p_indices[ 0 ] = 0;   p_indices[ 1 ] = 1; 
    for (let axis=0;axis<=2;axis++) {
        let p_vertices = new Float32Array(6);
        p_vertices[0]=-ATLASHEADER['axisoffset'][0];
        p_vertices[1]=-ATLASHEADER['axisoffset'][1];
        p_vertices[2]=-ATLASHEADER['axisoffset'][2];
        p_vertices[3]=-ATLASHEADER['axisoffset'][0];
        p_vertices[4]=-ATLASHEADER['axisoffset'][1];
        p_vertices[5]=-ATLASHEADER['axisoffset'][2];
        if (axis===0) {
            p_vertices[3]=ATLASHEADER['axissize'][0]+ATLASHEADER['midoffset']+ATLASHEADER['axisoffset'][0];
            p_vertices[0]-=ATLASHEADER['midoffset'];
        } else if (axis===1) {
            p_vertices[4]=ATLASHEADER['axissize'][1]+ATLASHEADER['axisoffset'][1];
        } else {
            p_vertices[5]=ATLASHEADER['axissize'][2];
        }
        
        let pbuf=createBufferGeometry();
        pbuf.setIndex( new THREE.BufferAttribute( p_indices, 1));
        pbuf.setAttribute( 'position', new THREE.BufferAttribute( p_vertices, 3 ) );


        
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

    console.log('.... In parse brainsurface\n',filename,'\n');
    //globalParams.internal.subviewers[3].reset();
    create_axis_lines();
    
    let surfaces=parse_multires_binary_surfaces(surfacedata,filename);
    
    if (surfaces[0]===null && surfaces[1]===null) {
        console.log('Nothing found');
        return;
    }

    // Remove all
    // Mass cleanup

    let createparcels=false;
    
    for (let meshindex=0;meshindex<=1;meshindex++) {

        if (surfaces[meshindex]!==null) {
            let buf=createBufferGeometry();

            //let p0=surfaces[meshindex]['vertices'][0];
            //console.log(p0.constructor.name,p0.length);
            //            let t0=surfaces[meshindex].indices;
            //            console.log(t0.constructor.name,t0.length);
            
            buf.setIndex( new THREE.BufferAttribute( surfaces[meshindex].indices, 1));
            buf.setAttribute( 'position', new THREE.BufferAttribute( surfaces[meshindex]['vertices'][0], 3 ) );
            buf.computeVertexNormals();
            globalParams.braingeom[meshindex]=buf;
            if (surfaces[meshindex]['parcels'])
                globalParams.brainindices[meshindex]=surfaces[meshindex]['parcels'];
            else
                createparcels=true;
            globalParams.vertexlist[meshindex]=surfaces[meshindex]['vertices'];
            globalParams.numelements[meshindex]=surfaces[meshindex]['numelements'];
            globalParams.lastresol[meshindex]=0;
            globalParams.maxpoint[meshindex]=surfaces[meshindex]['maxpoint'] || 0;
    
            createAndDisplayBrainSurface(meshindex, [1.0,1.0,1.0],1.0,-1,0,false);
        }
    }
    
    if (globalParams.internal.showlegend)
        globalParams.internal.setnodeFn(Math.round(globalParams.internal.parameters.node-1));

    window.dispatchEvent(new Event('resize'));
    return createparcels;
};

// ---------------------------------------------------------------------------------------------
var draw3dcrosshairs = function (coords=null) {

    const ATLASHEADER=atlasutils.getCurrentAtlasHeader();
    if (globalParams.internal.axisline[0]===null)
        return;

    let inmm=true;
    
    if (coords===null) {
        coords=[ globalParams.internal.mni[0],globalParams.internal.mni[1],globalParams.internal.mni[2] ];
        inmm=false;
    }

    if (!inmm) {
        if (ATLASHEADER['ismni']) {
            coords = globalParams.internal.mni2tal.getMMCoordinates(globalParams.internal.mni);
        }
    }

    let shift=ATLASHEADER['midoffset'];
    if (!inmm) {
        if (ATLASHEADER['ismni']) {
            if (globalParams.internal.mni[0]<0.0)
                shift-=ATLASHEADER['midoffset'];
        } else {
            if (coords[0]<ATLASHEADER['dimensions'][0]/2) 
                shift=-shift;
            for (let i=0;i<=2;i++)
                coords[i]=coords[i]*ATLASHEADER['spacing'][i];
        }
    } else {
        if (coords[0]<ATLASHEADER['dimensions'][0]*ATLASHEADER['spacing'][0]/2)
            shift=-shift;
        coords[0]+=shift;
    }

    coords[0]+=ATLASHEADER['axisoffset'][0];
    coords[1]+=ATLASHEADER['axisoffset'][1];
    coords[2]+=ATLASHEADER['axisoffset'][2];
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
        console.log('.... Updating Flag Matrix\n');
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

    const ATLASHEADER=atlasutils.getCurrentAtlasHeader();
    let lparr = globalParams.internal.conndata.draw3DLines(globalParams.internal.parcellation,
                                                           pos,neg,2.0,1.0,
                                                           ATLASHEADER);
    for (let i=0;i<=1;i++) {
        let lp=lparr[i];
        if (lp.indices!==null) {
            let buf=createBufferGeometry();
            buf.setIndex(  new THREE.BufferAttribute( lp.indices, 1 ) );
            buf.setAttribute( 'position', new THREE.BufferAttribute( lp.vertices, 3 ) );
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
// @param {Boolean} useAttributeMax -- if true saturate value
// @param {Number} attributeMax -- if useAttributeMax true use this to set the maximum value
// @param {Boolean} customHue -- if true use custom hue
// @param {Number} hueValue -- if CustomHue is true use hueValue

var update3DMeshes=function(opacity=0.5,modename='uniform',displaymode='Both',resol=0,hidecereb=false,
                            useAttributeMax=false,attributeMax=100.0,customHue=false,hueValue=0.02) {

    //    console.log('CustomHue=',useAttributeMax,attributeMax,' hue=',customHue,hueValue);
    
    let mode=color_modes.indexOf(modename)-1;
    let dmode=display_modes.indexOf(displaymode);

    createAndDisplayBrainSurface(0, [1.0,1.0,1.0],opacity,mode,resol,hidecereb,
                                 useAttributeMax,attributeMax,customHue,hueValue);
    createAndDisplayBrainSurface(1, [1.0,1.0,1.0],opacity,mode,resol,hidecereb,
                                 useAttributeMax,attributeMax,customHue,hueValue);

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

// ---------------------------------------------------------------------------------------------

const computemode=function(array) {
    if(array.length === 0)
        return null;
    if (array.length===1)
        return array[0];
    
    var modeMap = {};
    var maxEl = array[0], maxCount = 1;
    for(let i = 0; i < array.length; i++) {
        let el = array[i];
        if(modeMap[el] === undefined)
            modeMap[el] = 1;
        else
            modeMap[el]++;      
        if(modeMap[el] > maxCount) {
            maxEl = el;
            maxCount = modeMap[el];
        }
    }
    return maxEl;
};


// ---------------------------------------------------------------------------------------------

var createSurfaceLabels=function(image) {

    const ATLASHEADER=atlasutils.getCurrentAtlasHeader();
    console.log('.... Creating Surface Labels',image.getDescription());
    let dim=image.getDimensions();
    let zerodim = [ 0,0,0];
    let idim= [ dim[0]-1,dim[1]-1,dim[2]-1 ];
    let slicesize=dim[1]*dim[0];
    let imagedata=image.getImageData();
    let spa=image.getSpacing();

    //console.log('Beginning spa=',spa,'dim=',dim,'slicesize=',slicesize,' idim=',idim);

    for (let meshindex=0;meshindex<=1;meshindex++) {

        
        let points=globalParams.vertexlist[meshindex][0];
        let numpoints=Math.floor(points.length/3);

        //console.log('Working on Mesh ',meshindex,'numpoints=',numpoints);
        
        
        globalParams.brainindices[meshindex]=new Uint32Array(numpoints);
        
        let shiftx=ATLASHEADER['midoffset'];
        if (meshindex===0) // left
            shiftx=-ATLASHEADER['midoffset'];

        if (meshindex===0) {
            zerodim[0]=[0];
            idim[0]=Math.floor(dim[0]/2-1);
        } else {
            zerodim[0]=Math.floor(dim[0]/2-1)+1;
            idim[0]=dim[0]-1;
        }
        
        
        for (let i=0;i<numpoints;i++) {
            let index=i*3;
            
            let pt=[ points[index], points[index+1], points[index+2] ];
            //            if (i===100)
            //  console.log('Mesh=',meshindex,'pt=',pt);

            pt[0]=pt[0]-shiftx;

            //            if (i===100)
            //console.log('Shifted Mesh=',meshindex,'pt=',pt);
            
            for (let j=0;j<=2;j++)  {
                pt[j]=Math.round(pt[j]/spa[j]);
                if (pt[j]<zerodim[j])
                    pt[j]=zerodim[j];
                else if (pt[j]>idim[j])
                    pt[j]=idim[j];
            }

            
            //if (i===100)
            //  console.log('voxel pt=',pt);
            
            let voxel=pt[0]+pt[1]*dim[0]+slicesize*pt[2];
            let val=imagedata[voxel];

            //            if (i===100) {
                //console.log('Voxel=',voxel,'value=',val);
            //            }
            
            if (val>0) {
                globalParams.brainindices[meshindex][i]=val;
            } else {
                let bestval=[0];
                let mindist=1000;
                let shift=1;
                //let newpts=[];
                while (bestval[0]===0 && shift<=2) {
                    for (let ka=-shift;ka<=shift;ka++) {
                        let newk=util.range(ka+pt[2],zerodim[2],idim[2])*slicesize;
                        for (let ja=-shift;ja<=shift;ja++) {
                            let newj=util.range(ja+pt[1],zerodim[1],idim[1])*dim[0];
                            for (let ia=-shift;ia<=shift;ia++) {
                                let newi=util.range(ia+pt[0],zerodim[0],idim[0]);
                                let voxel=newi+newj+newk;
                                let d=ia*ia+ja*ja+ka*ka;

                                //if (i===100) 
                                //console.log('Voxel=',voxel,'value=',imagedata[voxel], 'indices=',[ ia,ja,ka ],' dist=',d,' best=',bestval,mindist);
                                
                                if (imagedata[voxel]>0)
                                    if (d<mindist) {
                                        mindist=d;
                                        bestval=[imagedata[voxel]];
                                        //newpts= [ ia+pt[0],ja+pt[1],ka+pt[2]];
                                    } else if (d===mindist) {
                                        bestval.push(imagedata[voxel]);
                                        //newpts.push([ ia+pt[0],ja+pt[1],ka+pt[2]]);
                                    }
                            }
                        }
                    }
                    shift=shift+1;
                }

                //if (i===100)
                //console.log("Bestval=",bestval,mindist,' newpts=',newpts,' point=',pt);
                
                if (bestval.length<2) {
                    globalParams.brainindices[meshindex][i]=bestval[0];
                } else {
                    globalParams.brainindices[meshindex][i]=computemode(bestval);
                }
                
            }
        }
    }
    globalParams.internal.hassurfaceindices=true;
};

module.exports = {

    initialize : initialize,
    parsebrainsurface : parsebrainsurface,
    draw3dcrosshairs : draw3dcrosshairs,
    drawlines3d : drawlines3d,
    createAndDisplayBrainSurface : createAndDisplayBrainSurface,
    color_modes  : color_modes,
    displayimg : displayimg,
    transferfunction : transferfunction,
    display_modes  : display_modes,
    update3DMeshes :     update3DMeshes,
    createSurfaceLabels:    createSurfaceLabels,
};

