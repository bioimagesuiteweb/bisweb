const THREE=require('three');
const bisCrossHair=require('bis_3dcrosshairgeometry');
const util=require('bis_util');
const bootbox=require('bootbox');

const globalParams={

    internal : null,
    brainmesh : [ null,null],
};

const lobeoffset=10.0;
const axisoffset=[0,5.0,20.0];


// ---------------------------------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------------------------------

const brain_vertexshader_text = 
      'attribute vec3 lookupScalar;\n'+
      'varying vec3 vNormal;\n'+
      //        'varying vec3 vLookup;\n'+
      'void main() {\n'+
      //        '     vLookup.x=lookupScalar.x;\n'+
      //        '     vLookup.y=lookupScalar.y;\n'+
      //        '     vLookup.z=lookupScalar.z;\n'+
      '     vNormal = normalize( normalMatrix * normal );\n'+
      '     vec3 transformed = vec3( position );\n'+
      '     vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );\n'+
      '     gl_Position = projectionMatrix * mvPosition;\n'+
      //      '     gl_Position.z=0.99+0.01*gl_Position.z;\n'+
      '}\n';

const brain_fragmentshader_text=
      'uniform float opacity;\n'+
      'uniform vec3 diffuse;\n'+
      'varying vec3 vNormal;\n'+
      //        'varying vec3 vLookup;\n'+
      'void main() {\n'+
      '   float v=max(0.0,vNormal.z);\n'+
      '   gl_FragColor = vec4( v*diffuse.x,v*diffuse.y,v*diffuse.z, opacity );\n'+
      '}';

const sphere_vertexshader_text = 
      'varying vec3 vNormal;\n'+
      'void main() {\n'+
      '     vNormal = normalize( normalMatrix * normal );\n'+
      '     vec3 transformed = vec3( position );\n'+
      '     vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );\n'+
      '     gl_Position = projectionMatrix * mvPosition;\n'+
      '}\n';

const sphere_fragmentshader_text=
      'uniform float opacity;\n'+
      'uniform vec3 diffuse;\n'+
      'varying vec3 vNormal;\n'+
      'void main() {\n'+
      '   float v=max(0.0,vNormal.z);\n'+
      '   gl_FragColor = vec4( v*diffuse.x,v*diffuse.y,v*diffuse.z, opacity );\n'+
      '}';


// ---------------------------------------------------------------------------------------------------
// Link
// ---------------------------------------------------------------------------------------------------

var initialize=function(internal) {
    globalParams.internal=internal;
};

// ---------------------------------------------------------------------------------------------------
// 3D Rendering
// ---------------------------------------------------------------------------------------------------

// Parses Brain Surface
// @alias BisWebConnectivityVis3D1~parsebrainsurface from json file
// @param {array} textstring - brain surfaces  to parse (as json)
// @param {String} FileName - filename to read from

var parsebrainsurface = function(textstring,filename) {

    
    let meshindex=0;
    let isright=filename.lastIndexOf("right");
    if (isright>=0)
        meshindex=1;
    
    let obj= JSON.parse(textstring);
    let values=[0.6,0.9];
    
    let vertices = new Float32Array(obj.points.length);
    let indices = new Uint16Array(obj.triangles.length);
    
    console.log('+++++ Brain surface loaded from '+filename+' '+[ obj.points.length,obj.triangles.length]);
    for (let i=0;i<obj.points.length;i+=3) {
        vertices[i+0]=obj.points[i+0];
        if (meshindex===1) // right
            vertices[i]+=lobeoffset;
        else // left
            vertices[i]-=lobeoffset;
        vertices[i+1]=obj.points[i+1];
        vertices[i+2]=obj.points[i+2];
    }
    for (let i=0;i<obj.triangles.length;i++) 
        indices[i]=obj.triangles[i];
    
    if (globalParams.brainmesh[meshindex]!==null) {
        globalParams.brainmesh[meshindex].visible=false;
        globalParams.internal.subviewers[3].scene.remove(globalParams.brainmesh[meshindex]);
    }
    
    let buf=new THREE.BufferGeometry();
    buf.setIndex( new THREE.BufferAttribute( indices, 1));
    buf.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    buf.computeVertexNormals();
    
    let material = new THREE.ShaderMaterial({
        transparent : true,
        "uniforms": {
            "diffuse": {  "type":"c","value":
                          {"r":values[meshindex],
                           "g":values[meshindex],
                           "b":values[meshindex]}},
            "opacity": {"type":"f","value":0.7}
        },
        vertexShader : brain_vertexshader_text,
        fragmentShader : brain_fragmentshader_text,
    });
    
    globalParams.brainmesh[meshindex] = new THREE.Mesh(buf,material);
    globalParams.brainmesh[meshindex].visible=true;
    globalParams.internal.subviewers[3].scene.add(globalParams.brainmesh[meshindex]);
    
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
            globalParams.internal.subviewers[3].scene.add(globalParams.internal.axisline[axis]);
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
            globalParams.internal.subviewers[3].scene.add(linemesh);
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
            globalParams.internal.subviewers[3].scene.add(spheremesh);
            globalParams.internal.meshes.push(spheremesh);
        }
    }
    
    
    return total;
};
// ---------------------------------------------------------------------------------------------


module.exports = {

    initialize : initialize,
    parsebrainsurface : parsebrainsurface,
    draw3dcrosshairs : draw3dcrosshairs,
    drawlines3d : drawlines3d,
    lobeoffset : lobeoffset,
};
