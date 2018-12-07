
              
"use strict";

const wasmutil=require('bis_wasmutils');
const wrapperutil=require('bis_wrapperutils');


let Module=0;
let ModulePromise=0;

var initialize=function(binary=null) {

    if (ModulePromise===0) {
        // this calls set_module ...
        ModulePromise=wrapperutil.initialize_wasm(binary);
        ModulePromise.then( (mod) => {
            Module=mod;
            let d="";
            if (mod.bisdate)
                d="(" + mod.bisdate +")";
            d=d+" (memory size="+Module['wasmMemory'].buffer.byteLength/(1024*1024)+" MB)";
            if (Module._uses_gpl())
                console.log('++++ Web Assembly code loaded '+d+', (has GPL plugin. See https://github.com/bioimagesuiteweb/gplcppcode)');
            else
                console.log('++++ Web Assembly code '+d);
        });
    }
    return ModulePromise;
};

var reinitialize=function() {

    if (Module!==0) {
        Module._delete_all_memory();
        Module=0;
        ModulePromise=0;
    }
    return initialize();
}

var get_module=function() {
    return Module;
};


var get_date=function() {
    return "10/29/2018";     
};
        

  //--------------------------------------------------------------
  // C++:
  /** return a matlab matrix from a serialized .mat V6 file packed into an unsigned char serialized array
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for this algorithm { 'name' :  ""} specifies the matrix name
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized matrix
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'parseMatlabV6WASM', 'Matrix', [ 'Vector', 'ParamObj', 'debug' ]}
  //      returns a Matrix
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var parseMatlabV6WASM = function(vector1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let vector1_ptr=wrapperutil.serializeObject(Module,vector1,'Vector');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:parseMatlabV6WASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('parseMatlabV6WASM','number',
       ['number', 'string', 'number'],
       [ vector1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'Matrix');

    // Cleanup
    if (vector1_ptr !== vector1)
      wasmutil.release_memory(Module,vector1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** return a matrix from a text file (octave .matr or 4x4 matrix .matr)
  * @param input text of whole file
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized matrix
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'parseMatrixTextFileWASM', 'Matrix', [ 'String', 'debug' ]}
  //      returns a Matrix
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var parseMatrixTextFileWASM = function(string1,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:parseMatrixTextFileWASM\n++++');
    const wasm_output=Module.ccall('parseMatrixTextFileWASM','number',
       ['string', 'number'],
       [ string1, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'Matrix');

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** return a string (for a text file -- octave .matr or 4x4 matrix .matr) for a matrix
  * @param input serialized input Matrix as unsigned char array
  * @param name the name of the matrix
  * @param legacy if true then output 4x4 matrix transformation else old .matr file
  * @param debug if > 0 print debug messages
  * @returns a pointer to the string
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'createMatrixTextFileWASM', 'String', [ 'Matrix', 'String', 'Int', 'debug' ]}
  //      returns a String
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var createMatrixTextFileWASM = function(matrix1,string2,intval3,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Serialize objects
    let matrix1_ptr=wrapperutil.serializeObject(Module,matrix1,'Matrix');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:createMatrixTextFileWASM\n++++');
    const wasm_output=Module.ccall('createMatrixTextFileWASM','number',
       ['number', 'string', 'number', 'number'],
       [ matrix1_ptr, string2, intval3, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'String');

    // Cleanup
    if (matrix1_ptr !== matrix1)
      wasmutil.release_memory(Module,matrix1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** return a combo transformation a .grd text file
  * @param input text of whole file
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized bisComboTransformation
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'parseComboTransformTextFileWASM', 'bisComboTransformation', [ 'String', 'debug' ]}
  //      returns a bisComboTransformation
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var parseComboTransformTextFileWASM = function(string1,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:parseComboTransformTextFileWASM\n++++');
    const wasm_output=Module.ccall('parseComboTransformTextFileWASM','number',
       ['string', 'number'],
       [ string1, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisComboTransformation');

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** return a string (for a grd file)
  * @param input serialized input combo transformation as unsigned char array
  * @param debug if > 0 print debug messages
  * @returns a pointer to the string
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'createComboTransformationTextFileWASM', 'String', [ 'bisComboTransformation', 'debug' ]}
  //      returns a String
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var createComboTransformationTextFileWASM = function(comboxform1,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Serialize objects
    let comboxform1_ptr=wrapperutil.serializeObject(Module,comboxform1,'bisComboTransformation');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:createComboTransformationTextFileWASM\n++++');
    const wasm_output=Module.ccall('createComboTransformationTextFileWASM','number',
       ['number', 'number'],
       [ comboxform1_ptr, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'String');

    // Cleanup
    if (comboxform1_ptr !== comboxform1)
      wasmutil.release_memory(Module,comboxform1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** return a matrix with a qform description from an sform desription (NIFTI-1 code)
  * @param input serialized input 4x4 Matrix as unsigned char array
  * @param debug if > 0 print debug messages
  * @returns a pointer to the output 10x1 matrix containing the quaternion representation
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'niftiMat44ToQuaternionWASM', 'Matrix', [ 'Matrix', 'debug' ]}
  //      returns a Matrix
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var niftiMat44ToQuaternionWASM = function(matrix1,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Serialize objects
    let matrix1_ptr=wrapperutil.serializeObject(Module,matrix1,'Matrix');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:niftiMat44ToQuaternionWASM\n++++');
    const wasm_output=Module.ccall('niftiMat44ToQuaternionWASM','number',
       ['number', 'number'],
       [ matrix1_ptr, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'Matrix');

    // Cleanup
    if (matrix1_ptr !== matrix1)
      wasmutil.release_memory(Module,matrix1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Extract image frame using \link bisImageAlgorithms::imageExtractFrame \endlink
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm { "frame" : 0 , " component" : 0 }
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'extractImageFrameWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var extractImageFrameWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:extractImageFrameWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('extractImageFrameWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Extract 2d image slice using \link bisImageAlgorithms::imageExtractSlice \endlink
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm { "plane" : 2, "slice":-1, "frame" : 0 , " component" : 0 } (slice=-1 = center slice)
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'extractImageSliceWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var extractImageSliceWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:extractImageSliceWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('extractImageSliceWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Normalize image using \link bisImageAlgorithms::imageNormalize \endlink
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm { "perlow" : 0.0 , "perhigh" : 1.0, "outmaxvalue" : 1024 }
  * @param debug if > 0 print debug messages
  * @returns a pointer to a normalized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'normalizeImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var normalizeImageWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:normalizeImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('normalizeImageWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Threshold image using \link bisImageAlgorithms::thresholdImage \endlink
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm { "low" : 50.0, "high": 100, "replacein" :  true, "replaceout" : false, "invalue: 100.0 , "outvalue" : 0.0, "datatype: -1 }, (datatype=-1 same as input)
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'thresholdImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var thresholdImageWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:thresholdImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('thresholdImageWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** ShiftScale image using \link bisImageAlgorithms::shiftScaleImage \endlink
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm { "shift" : 0.0, "scale": 1.0, "datatype: -1 }, (datatype=-1 same as input)
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'shiftScaleImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var shiftScaleImageWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:shiftScaleImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('shiftScaleImageWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Threshold image using \link bisImageAlgorithms::thresholdImage \endlink
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm { "threshold" : 50.0, "clustersize": 100, "oneconnected" :  true, "outputclusterno" : false, "frame" :0, "component":0, "datatype: -1 }, (datatype=-1 same as input)
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'clusterThresholdImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var clusterThresholdImageWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:clusterThresholdImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('clusterThresholdImageWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Smooth image using \link bisImageAlgorithms::gaussianSmoothImage \endlink
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm { "sigma" : 1.0, "inmm" :  true, "radiusfactor" : 1.5 },
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'gaussianSmoothImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var gaussianSmoothImageWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:gaussianSmoothImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('gaussianSmoothImageWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Compute image gradient using  using \link bisImageAlgorithms::gradientImage \endlink
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm { "sigma" : 1.0, "inmm" :  true, "radiusfactor" : 1.5 },
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'gradientImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var gradientImageWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:gradientImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('gradientImageWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Reslice image using \link bisImageAlgorithms::resliceImage \endlink
  * @param input serialized input as unsigned char array
  * @param transformation serialized transformation as unsigned char array
  * @param jsonstring the parameter string for the algorithm  { int interpolation=3, 1 or 0, float backgroundValue=0.0; int ouddim[3], int outspa[3], int bounds[6] = None -- use out image size }
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'resliceImageWASM', 'bisImage', [ 'bisImage', 'bisTransformation', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var resliceImageWASM = function(image1,transformation2,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');
    let transformation2_ptr=wrapperutil.serializeObject(Module,transformation2,'bisTransformation');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:resliceImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('resliceImageWASM','number',
       ['number', 'number', 'string', 'number'],
       [ image1_ptr, transformation2_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);
    if (transformation2_ptr !== transformation2)
      wasmutil.release_memory(Module,transformation2_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Crop an image using \link bisImageAlgorithms::cropImage \endlink
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm
  * { "i0" : 0: ,"i1" : 100, "di" : 2, "j0" : 0: ,"j1" : 100, "dj" : 2,"k0" : 0: ,"k1" : 100, "dk" : 2, "t0" : 0: ,"t1" : 100, "dt" : 2 }
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'cropImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var cropImageWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:cropImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('cropImageWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Flip an image using \link bisImageAlgorithms::flipImage \endlink
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm { "flipi" : 0, "flipj" : 0 , "flipk" : 0 }
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'flipImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var flipImageWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:flipImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('flipImageWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Blank an image using \link bisImageAlgorithms::blankImage \endlink
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm
  * { "i0" : 0: ,"i1" : 100, "j0" : 0: ,"j1" : 100,"k0" : 0: ,"k1" : 100, }
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'blankImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var blankImageWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:blankImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('blankImageWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Resample image using \link bisImageAlgorithms::resampleImage \endlink
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm  { int dim[3], float spacing[3], int interpolation; 3, 1 or 0, float backgroundValue=0.0 };
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'resampleImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var resampleImageWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:resampleImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('resampleImageWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Prepare Image for Registration using \link bisImageAlgorithms::prepareImageForRegistration \endlink
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'prepareImageForRegistrationWASM', 'bisImage', [ 'bisImage',  'ParamObj','debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var prepareImageForRegistrationWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:prepareImageForRegistrationWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('prepareImageForRegistrationWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Compute Displacement Field
  * @param transformation the transformation to use to compute a displacement field
  * @param jsonstring the parameter string for the algorithm
  *   { "dimensions":  [ 8,4,4 ], "spacing": [ 2.0,2.5,2.5 ] };
  * @param debug if > 0 print debug messages
  * @returns a pointer to the displacement field image (bisSimpleImage<float>)
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'computeDisplacementFieldWASM', 'bisImage', [ 'bisTransformation', 'ParamObj','debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var computeDisplacementFieldWASM = function(transformation1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let transformation1_ptr=wrapperutil.serializeObject(Module,transformation1,'bisTransformation');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:computeDisplacementFieldWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('computeDisplacementFieldWASM','number',
       ['number', 'string', 'number'],
       [ transformation1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage');

    // Cleanup
    if (transformation1_ptr !== transformation1)
      wasmutil.release_memory(Module,transformation1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Perform slice based bias field correction and return either image or bias field (if returnbiasfield=true)
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm { "axis" : 2, "threshold":0.02, "returnbiasfield" : false }. If axis >=3 (or <0) then triple slice is done, i.e. all three planes
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized corrected image  (or the bias field if returnbias=true)
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'sliceBiasFieldCorrectImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var sliceBiasFieldCorrectImageWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:sliceBiasFieldCorrectImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('sliceBiasFieldCorrectImageWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Perform morphology operation (one of "median", "erode", "dilate") on binary images
  * @param input serialized binary input image as unsigned char array
  * @param jsonstring the parameter string for the algorithm { "operation" : "median", "radius" : 1, "3d" : true }
  * @param debug if > 0 print debug messages
  * @returns a pointer to a (unsigned char) serialized binary image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'morphologyOperationWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var morphologyOperationWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:morphologyOperationWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('morphologyOperationWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Perform seed connectivity operation
  * @param input serialized binary input image as unsigned char array
  * @param jsonstring the parameter string for the algorithm { "seedi" : 10, "seedj": 20", "seedk" : 30, "oneconnected" : true }
  * @param debug if > 0 print debug messages
  * @returns a pointer to a (unsigned char) serialized binary image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'seedConnectivityWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var seedConnectivityWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:seedConnectivityWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('seedConnectivityWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Computes GLM Fit for fMRI
  * @param input input time series as serialized array
  * @param mask for input time series (ignore is jsonstring has usemasks : 0 ) as serialized array
  * @param matrix  the regressor matrix as serialized array
  * @param jsonstring the parameter string for the algorithm { "usemask" : 1, "numstasks":-1 }  (numtaks=-1, means all are tasks)
  * @param debug if > 0 print debug messages
  * @returns a pointer to the beta image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'computeGLMWASM', 'bisImage', [ 'bisImage', 'bisImage_opt', 'Matrix', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var computeGLMWASM = function(image1,image2,matrix3,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');
    let image2_ptr=0;
    if (image2!==0) 
      image2_ptr=wrapperutil.serializeObject(Module,image2,'bisImage');
    let matrix3_ptr=wrapperutil.serializeObject(Module,matrix3,'Matrix');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:computeGLMWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('computeGLMWASM','number',
       ['number', 'number', 'number', 'string', 'number'],
       [ image1_ptr, image2_ptr, matrix3_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);
    if (image2_ptr !==0  && image2_ptr !== image2)
      wasmutil.release_memory(Module,image2_ptr);
    if (matrix3_ptr !== matrix3)
      wasmutil.release_memory(Module,matrix3_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Computes ROI Mean for a timeseries
  * @param input input image time series as serialized array
  * @param roi   input roi image
  * @param debug if > 0 print debug messages
  * @returns a pointer to the roi matrix (rows=frames,cols=rois)
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'computeROIWASM', 'Matrix', [ 'bisImage', 'bisImage',  'debug' ]}
  //      returns a Matrix
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var computeROIWASM = function(image1,image2,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');
    let image2_ptr=wrapperutil.serializeObject(Module,image2,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:computeROIWASM\n++++');
    const wasm_output=Module.ccall('computeROIWASM','number',
       ['number', 'number', 'number'],
       [ image1_ptr, image2_ptr, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'Matrix');

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);
    if (image2_ptr !== image2)
      wasmutil.release_memory(Module,image2_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Compute butterworthFilter Output
  * @param input the input matrix to filter (time = rows)
  * @param jsonstring the parameters { "type": "low", "cutoff": 0.15, 'sampleRate': 1.5 };
  * @param debug if > 0 print debug messages
  * @returns a pointer to the filtered matrix (rows=frames,cols=rois)
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'butterworthFilterWASM', 'Matrix', [ 'Matrix', 'ParamObj',  'debug' ]}
  //      returns a Matrix
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var butterworthFilterWASM = function(matrix1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let matrix1_ptr=wrapperutil.serializeObject(Module,matrix1,'Matrix');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:butterworthFilterWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('butterworthFilterWASM','number',
       ['number', 'string', 'number'],
       [ matrix1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'Matrix');

    // Cleanup
    if (matrix1_ptr !== matrix1)
      wasmutil.release_memory(Module,matrix1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Compute butterworthFilter Output
  * @param input the input image to filter (time = rows)
  * @param jsonstring the parameters { "type": "low", "cutoff": 0.15, 'sampleRate': 1.5 };
  * @param debug if > 0 print debug messages
  * @returns a pointer to the filtered image (rows=frames,cols=rois)
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'butterworthFilterImageWASM', 'bisImage', [ 'bisImage', 'ParamObj',  'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var butterworthFilterImageWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:butterworthFilterImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('butterworthFilterImageWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Compute correlation matrix
  * @param input the input timeseries matrix (roi output, rows=frames);
  * @param weights the input weight vector ( rows=frames);
  * @param jsonstring the parameters { "zscore": "false" }
  * @param debug if > 0 print debug messages
  * @returns a pointer to the filtered matrix (rows=frames,cols=rois)
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'computeCorrelationMatrixWASM', 'Matrix', [ 'Matrix', 'Vector_opt', 'ParamObj',  'debug' ]}
  //      returns a Matrix
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var computeCorrelationMatrixWASM = function(matrix1,vector2,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let matrix1_ptr=wrapperutil.serializeObject(Module,matrix1,'Matrix');
    let vector2_ptr=0;
    if (vector2!==0) 
      vector2_ptr=wrapperutil.serializeObject(Module,vector2,'Vector');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:computeCorrelationMatrixWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('computeCorrelationMatrixWASM','number',
       ['number', 'number', 'string', 'number'],
       [ matrix1_ptr, vector2_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'Matrix');

    // Cleanup
    if (matrix1_ptr !== matrix1)
      wasmutil.release_memory(Module,matrix1_ptr);
    if (vector2_ptr !==0  && vector2_ptr !== vector2)
      wasmutil.release_memory(Module,vector2_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Regress out a time series from another (with optional weights)
  * @param input_ptr the input timeseries matrix (roi output, rows=frames);
  * @param regressor_ptr the regression timeseries matrix (roi output, rows=frames);
  * @param weights_ptr the input weight vector ( rows=frames) or 0 ;
  * @param debug if > 0 print debug messages
  * @returns a pointer to the filtered matrix (rows=frames,cols=rois)
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'weightedRegressOutWASM', 'Matrix', [ 'Matrix', 'Matrix', 'Vector_opt',  'debug' ]}
  //      returns a Matrix
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var weightedRegressOutWASM = function(matrix1,matrix2,vector3,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Serialize objects
    let matrix1_ptr=wrapperutil.serializeObject(Module,matrix1,'Matrix');
    let matrix2_ptr=wrapperutil.serializeObject(Module,matrix2,'Matrix');
    let vector3_ptr=0;
    if (vector3!==0) 
      vector3_ptr=wrapperutil.serializeObject(Module,vector3,'Vector');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:weightedRegressOutWASM\n++++');
    const wasm_output=Module.ccall('weightedRegressOutWASM','number',
       ['number', 'number', 'number', 'number'],
       [ matrix1_ptr, matrix2_ptr, vector3_ptr, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'Matrix');

    // Cleanup
    if (matrix1_ptr !== matrix1)
      wasmutil.release_memory(Module,matrix1_ptr);
    if (matrix2_ptr !== matrix2)
      wasmutil.release_memory(Module,matrix2_ptr);
    if (vector3_ptr !==0  && vector3_ptr !== vector3)
      wasmutil.release_memory(Module,vector3_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Regress out global signal from a  time series (with optional weights)
  * @param input_ptr the input timeseries matrix (roi output, rows=frames);
  * @param weights_ptr the input weight vector ( rows=frames) or 0 ;
  * @param debug if > 0 print debug messages
  * @returns a pointer to the filtered matrix (rows=frames,cols=rois)
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'weightedRegressGlobalSignalWASM', 'Matrix', [ 'Matrix', 'Vector_opt',  'debug' ]}
  //      returns a Matrix
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var weightedRegressGlobalSignalWASM = function(matrix1,vector2,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Serialize objects
    let matrix1_ptr=wrapperutil.serializeObject(Module,matrix1,'Matrix');
    let vector2_ptr=0;
    if (vector2!==0) 
      vector2_ptr=wrapperutil.serializeObject(Module,vector2,'Vector');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:weightedRegressGlobalSignalWASM\n++++');
    const wasm_output=Module.ccall('weightedRegressGlobalSignalWASM','number',
       ['number', 'number', 'number'],
       [ matrix1_ptr, vector2_ptr, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'Matrix');

    // Cleanup
    if (matrix1_ptr !== matrix1)
      wasmutil.release_memory(Module,matrix1_ptr);
    if (vector2_ptr !==0  && vector2_ptr !== vector2)
      wasmutil.release_memory(Module,vector2_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** AddGridTo an image using \link bisAdvancedImageAlgorithms::addGridToImage \endlink
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm
  * { "gap" : 8, "value" 2.0 }
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'addGridToImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var addGridToImageWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:addGridToImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('addGridToImageWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Project a 3D image to 2D either mip or average or shaded average
  * @param input serialized input as unsigned char array
  * @param functional_input serialized functional input (optional) as unsigned char array
  * @param jsonstring the parameter string for the algorithm
  * { "domip" : 1: ,"axis" : -1, "flip" : 0, "sigma" : 1.0: 'threshold' : 0.05, 'gradsigma' : 1.0, 'windowsize': 5 }
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'projectImageWASM', 'bisImage', [ 'bisImage', 'bisImage_opt', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var projectImageWASM = function(image1,image2,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');
    let image2_ptr=0;
    if (image2!==0) 
      image2_ptr=wrapperutil.serializeObject(Module,image2,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:projectImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('projectImageWASM','number',
       ['number', 'number', 'string', 'number'],
       [ image1_ptr, image2_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);
    if (image2_ptr !==0  && image2_ptr !== image2)
      wasmutil.release_memory(Module,image2_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Back Projects a 2D image to a 3D image
  * @param input serialized input as unsigned char array   (3D image)
  * @param input2d serialized input as unsigned char array  (2D image)
  * @param jsonstring the parameter string for the algorithm
  * { "axis" : -1, "flip" : 0,  'threshold' : 0.05,  'windowsize': 5 }
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'backProjectImageWASM', 'bisImage', [ 'bisImage', 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var backProjectImageWASM = function(image1,image2,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');
    let image2_ptr=wrapperutil.serializeObject(Module,image2,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:backProjectImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('backProjectImageWASM','number',
       ['number', 'number', 'string', 'number'],
       [ image1_ptr, image2_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);
    if (image2_ptr !== image2)
      wasmutil.release_memory(Module,image2_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Returns 1701 (Yale's first year) if in webassembly or 1700 if in C (for Python, Matlab etc.) */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'test_wasm', 'Int'}
  //      returns a Int
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var test_wasm = function(debug=false) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:test_wasm\n++++');
    const output=Module.ccall('test_wasm','number',
       [],
       [ ]);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Redirects stdout fo a file -- used for debugging and testing
  * @param fname filename to save in (defaults to bislog.txt in current directory)
  * returns 1 if file opened OK
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'redirect_stdout', 'Int', [ 'String' ]}
  //      returns a Int
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var redirect_stdout = function(string1,debug=false) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:redirect_stdout\n++++');
    const output=Module.ccall('redirect_stdout','number',
       ['string'],
       [ string1]);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Tests serialization of 4x4 matrix in and out
  * Expects  matrix[row][col] = (1+row)*10.0+col*col*5.0
  * @param ptr serialized 4x4 transformation as unsigned char array
  * @param debug if > 0 print debug messages
  * @returns difference between expected and received matrix as a single float
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'test_matrix4x4', 'Float', [ 'bisLinearTransformation', 'debug']}
  //      returns a Float
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var test_matrix4x4 = function(linearxform1,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Serialize objects
    let linearxform1_ptr=wrapperutil.serializeObject(Module,linearxform1,'bisLinearTransformation');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:test_matrix4x4\n++++');
    const output=Module.ccall('test_matrix4x4','number',
       ['number', 'number'],
       [ linearxform1_ptr, debug]);

    // Cleanup
    if (linearxform1_ptr !== linearxform1)
      wasmutil.release_memory(Module,linearxform1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Create 4x4 Matrix from param vector and two images
  * @param image1_ptr serialized  image1 as unsigned char array
  * @param image2_ptr serialized  image2 as unsigned char array
  * @param pvector_ptr the transformation parameters see \link bisLinearTransformation.setParameterVector \endlink
  * @param jsonstring algorithm parameters  { mode: 2 }
  * @param debug if > 0 print debug messages
  * @returns matrix 4x4 as a serialized array
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'test_create_4x4matrix', 'bisLinearTransformation', [ 'bisImage', 'bisImage', 'Vector' , 'ParamObj', 'debug']}
  //      returns a bisLinearTransformation
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var test_create_4x4matrix = function(image1,image2,vector3,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');
    let image2_ptr=wrapperutil.serializeObject(Module,image2,'bisImage');
    let vector3_ptr=wrapperutil.serializeObject(Module,vector3,'Vector');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:test_create_4x4matrix with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('test_create_4x4matrix','number',
       ['number', 'number', 'number', 'string', 'number'],
       [ image1_ptr, image2_ptr, vector3_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisLinearTransformation');

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);
    if (image2_ptr !== image2)
      wasmutil.release_memory(Module,image2_ptr);
    if (vector3_ptr !== vector3)
      wasmutil.release_memory(Module,vector3_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Tests Eigen operations
  * @param m_ptr serialized 4x4 transformation as unsigned char array
  *     where matrix[row][col] = (1+row)*10.0+col*col*5.0 as input for initital test
  * @param v_ptr serialized 6 vector as unsigned char array [ 1,2,3,5,7,11 ]
  * @param debug if > 0 print debug messages
  * @returns number of failed tests (0=pass, -1 -> deserializing failed)
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'test_eigenUtils', 'Int', [ 'bisLinearTransformation', 'Vector', 'debug']}
  //      returns a Int
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var test_eigenUtils = function(linearxform1,vector2,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Serialize objects
    let linearxform1_ptr=wrapperutil.serializeObject(Module,linearxform1,'bisLinearTransformation');
    let vector2_ptr=wrapperutil.serializeObject(Module,vector2,'Vector');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:test_eigenUtils\n++++');
    const output=Module.ccall('test_eigenUtils','number',
       ['number', 'number', 'number'],
       [ linearxform1_ptr, vector2_ptr, debug]);

    // Cleanup
    if (linearxform1_ptr !== linearxform1)
      wasmutil.release_memory(Module,linearxform1_ptr);
    if (vector2_ptr !== vector2)
      wasmutil.release_memory(Module,vector2_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Tests Matlab read
  * @param f_ptr serialized byte vector whose payload are the raw bytes from a .mat file
  * @param m_ptr serialized matrix (one of those in the .mat file)
  * @param name name of matrix to look for
  * @param debug if > 0 print debug messages
  * @returns max abs difference between matrices
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'test_matlabParse', 'Float', [ 'Vector', 'Matrix', 'String', 'debug']}
  //      returns a Float
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var test_matlabParse = function(vector1,matrix2,string3,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Serialize objects
    let vector1_ptr=wrapperutil.serializeObject(Module,vector1,'Vector');
    let matrix2_ptr=wrapperutil.serializeObject(Module,matrix2,'Matrix');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:test_matlabParse\n++++');
    const output=Module.ccall('test_matlabParse','number',
       ['number', 'number', 'string', 'number'],
       [ vector1_ptr, matrix2_ptr, string3, debug]);

    // Cleanup
    if (vector1_ptr !== vector1)
      wasmutil.release_memory(Module,vector1_ptr);
    if (matrix2_ptr !== matrix2)
      wasmutil.release_memory(Module,matrix2_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Tests Bending Energy
  * @param ptr serialized Combo Transformation with 1 grid
  * @param debug if > 0 print debug messages
  * @returns num failed tests
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'test_bendingEnergy', 'Int', [ 'bisComboTransformation','debug']}
  //      returns a Int
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var test_bendingEnergy = function(comboxform1,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Serialize objects
    let comboxform1_ptr=wrapperutil.serializeObject(Module,comboxform1,'bisComboTransformation');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:test_bendingEnergy\n++++');
    const output=Module.ccall('test_bendingEnergy','number',
       ['number', 'number'],
       [ comboxform1_ptr, debug]);

    // Cleanup
    if (comboxform1_ptr !== comboxform1)
      wasmutil.release_memory(Module,comboxform1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Tests PTZ Conversions i.e. p->t, t->p p->z, z->p
  * @param debug if > 0 print debug messages
  * @returns num failed tests
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'test_PTZConversions', 'Int', [ 'debug']}
  //      returns a Int
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var test_PTZConversions = function(debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:test_PTZConversions\n++++');
    const output=Module.ccall('test_PTZConversions','number',
       ['number'],
       [ debug]);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Tests In Place Matrix Multiplication in bisEigenUtil
  * @param debug if > 0 print debug messages
  * @returns num failed tests
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'test_eigenUtilOperations', 'Int', [ 'debug']}
  //      returns a Int
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var test_eigenUtilOperations = function(debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:test_eigenUtilOperations\n++++');
    const output=Module.ccall('test_eigenUtilOperations','number',
       ['number'],
       [ debug]);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Mirror text file  first parse then recreated
  * @param input the input text file (from a .grd file)
  * @param debug if >0 print debug messages
  * @returns the recreated text file
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'test_mirrorComboTransformTextFileWASM', 'String', [ 'String', 'debug']}
  //      returns a String
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var test_mirrorComboTransformTextFileWASM = function(string1,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:test_mirrorComboTransformTextFileWASM\n++++');
    const wasm_output=Module.ccall('test_mirrorComboTransformTextFileWASM','number',
       ['string', 'number'],
       [ string1, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'String');

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Compute Joint Histogram Metrics
  * @param image1_ptr serialized  image1 as unsigned char array
  * @param image2_ptr serialized  image2 as unsigned char array
  * @param weight1_ptr serialized  weight 1 as unsigned char array
  * @param weight2_ptr serialized  weight 2 as unsigned char array
  * @param num_weights number of weights to use (0=none, 1=only weight1_ptr, 2=both)
  * @param jsonstring algorithm parameters  { numbinsx: 64, numbinst: 64, intscale:1 }
  * @param return_histogram if 1 return the actual histogram else the metrics
  * @param debug if > 0 print debug messages
  * @returns if return_histogram =1 the histogram as a matrix, else a single row matrix consisting of
  *  [ SSD, CC, NMI, MI, EntropyX, Entropy, jointEntropy, numSamples ] both as serialized arrays
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'test_compute_histo_metric', 'Matrix', [ 'bisImage', 'bisImage','bisImage_opt', 'bisImage_opt', 'Int', 'ParamObj','Int','debug'}
  //      returns a Matrix
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var test_compute_histo_metric = function(image1,image2,image3,image4,intval5,paramobj,intval7,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');
    let image2_ptr=wrapperutil.serializeObject(Module,image2,'bisImage');
    let image3_ptr=0;
    if (image3!==0) 
      image3_ptr=wrapperutil.serializeObject(Module,image3,'bisImage');
    let image4_ptr=0;
    if (image4!==0) 
      image4_ptr=wrapperutil.serializeObject(Module,image4,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:test_compute_histo_metric with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('test_compute_histo_metric','number',
       ['number', 'number', 'number', 'number', 'number', 'string', 'number', 'number'],
       [ image1_ptr, image2_ptr, image3_ptr, image4_ptr, intval5, jsonstring, intval7, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'Matrix');

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);
    if (image2_ptr !== image2)
      wasmutil.release_memory(Module,image2_ptr);
    if (image3_ptr !==0  && image3_ptr !== image3)
      wasmutil.release_memory(Module,image3_ptr);
    if (image4_ptr !==0  && image4_ptr !== image4)
      wasmutil.release_memory(Module,image4_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Returns 1*/
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'uses_gpl', 'Int'}
  //      returns a Int
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var uses_gpl = function(debug=false) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:uses_gpl\n++++');
    const output=Module.ccall('uses_gpl','number',
       [],
       [ ]);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** run Linear Image Registration using \link bisLinearImageRegistration  \endlink
  * @param reference serialized reference image as unsigned char array
  * @param target    serialized target image as unsigned char array
  * @param initial_xform serialized initial transformation as unsigned char array
  * @param jsonstring the parameter string for the algorithm including return_vector which if true returns a length-28 vector
  * containing the 4x4 matrix and the 12 transformation parameters
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized vector or matrix depending on the value of return_vector
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'runLinearRegistrationWASM', 'bisLinearTransformation', [ 'bisImage', 'bisImage', 'bisLinearTransformation_opt', 'ParamObj', 'debug' ]}
  //      returns a bisLinearTransformation
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var runLinearRegistrationWASM = function(image1,image2,linearxform3,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');
    let image2_ptr=wrapperutil.serializeObject(Module,image2,'bisImage');
    let linearxform3_ptr=0;
    if (linearxform3!==0) 
      linearxform3_ptr=wrapperutil.serializeObject(Module,linearxform3,'bisLinearTransformation');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:runLinearRegistrationWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('runLinearRegistrationWASM','number',
       ['number', 'number', 'number', 'string', 'number'],
       [ image1_ptr, image2_ptr, linearxform3_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisLinearTransformation');

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);
    if (image2_ptr !== image2)
      wasmutil.release_memory(Module,image2_ptr);
    if (linearxform3_ptr !==0  && linearxform3_ptr !== linearxform3)
      wasmutil.release_memory(Module,linearxform3_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** run Non Linear Image Registration using \link bisNonLinearImageRegistration  \endlink
  * @param reference serialized reference image as unsigned char array
  * @param target    serialized target image as unsigned char array
  * @param initial_xform serialized initial transformation as unsigned char array
  * @param jsonstring the parameter string for the algorithm
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized combo transformation (bisComboTransformation)
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'runNonLinearRegistrationWASM', 'bisComboTransformation', [ 'bisImage', 'bisImage', 'bisLinearTransformation_opt', 'ParamObj', 'debug' ]}
  //      returns a bisComboTransformation
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var runNonLinearRegistrationWASM = function(image1,image2,linearxform3,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');
    let image2_ptr=wrapperutil.serializeObject(Module,image2,'bisImage');
    let linearxform3_ptr=0;
    if (linearxform3!==0) 
      linearxform3_ptr=wrapperutil.serializeObject(Module,linearxform3,'bisLinearTransformation');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:runNonLinearRegistrationWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('runNonLinearRegistrationWASM','number',
       ['number', 'number', 'number', 'string', 'number'],
       [ image1_ptr, image2_ptr, linearxform3_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisComboTransformation');

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);
    if (image2_ptr !== image2)
      wasmutil.release_memory(Module,image2_ptr);
    if (linearxform3_ptr !==0  && linearxform3_ptr !== linearxform3)
      wasmutil.release_memory(Module,linearxform3_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Approximate Displacement Field with Grid Transformation (pre initialized)
  * @param dispfield serialized target displacement field
  * @param initial_grid serialized grid transformation as unsigned char array
  * @param jsonstring the parameter string for the algorithm
  * @param debug if > 0 print debug messages
  * @returns a pointer to the updated grid (bisGridTransformation)
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'approximateDisplacementFieldWASM', 'bisGridTransformation', [ 'bisImage', 'bisGridTransformation', 'ParamObj', 'debug' ]}
  //      returns a bisGridTransformation
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var approximateDisplacementFieldWASM = function(image1,gridxform2,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');
    let gridxform2_ptr=wrapperutil.serializeObject(Module,gridxform2,'bisGridTransformation');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:approximateDisplacementFieldWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('approximateDisplacementFieldWASM','number',
       ['number', 'number', 'string', 'number'],
       [ image1_ptr, gridxform2_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisGridTransformation');

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);
    if (gridxform2_ptr !== gridxform2)
      wasmutil.release_memory(Module,gridxform2_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Approximate Displacement Field with Grid Transformation -- initialized using the sapcing parameter
  * @param dispfield serialized target displacement field
  * @param jsonstring the parameter string for the algorithm  -- key is spacing : --> this defines the spacing for the grid transformation
  * @param debug if > 0 print debug messages
  * @returns a pointer to the updated grid (bisGridTransformation)
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'approximateDisplacementFieldWASM2', 'bisGridTransformation', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisGridTransformation
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var approximateDisplacementFieldWASM2 = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:approximateDisplacementFieldWASM2 with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('approximateDisplacementFieldWASM2','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisGridTransformation');

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Perform image segmentation either histogram based or plus mrf segmentation if smoothness > 0.0
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm { "numclasses" : 3, "maxsigmaratio":0.2, "robust" : true, "numbins": 256, "smoothhisto": true, "smoothness" : 0.0, "mrfconvergence" : 0.2, "mrfiterations" : 8, "noisesigma2" : 0.0 }
  * @param debug if > 0 print debug messages
  * @returns a pointer to a serialized segmented image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'segmentImageWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var segmentImageWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:segmentImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('segmentImageWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Perform objectmap regularization
  * @param input serialized input as unsigned char array
  * @param jsonstring the parameter string for the algorithm { "smoothness" : 2.0, "convergence" : 0.2, "terations" : 8, "internaliterations" : 4 }
  * @param debug if > 0 print debug messages
  * @returns a pointer to a (short) serialized segmented image
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'regularizeObjectmapWASM', 'bisImage', [ 'bisImage', 'ParamObj', 'debug' ]}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var regularizeObjectmapWASM = function(image1,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:regularizeObjectmapWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('regularizeObjectmapWASM','number',
       ['number', 'string', 'number'],
       [ image1_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Tests Optimizer with numdof = 1 or 2 and all three modes
  * @param numdof number of degrees of freedom for simple quadratic function (1 or 2)
  * @returns number of failed tests
  */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'test_optimizer', 'Int', [ 'Int']}
  //      returns a Int
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var test_optimizer = function(intval1,debug=false) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:test_optimizer\n++++');
    const output=Module.ccall('test_optimizer','number',
       ['number'],
       [ intval1]);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Compute DTI Tensor
  * @param input_ptr the images as a serialized array
  * @param baseline_ptr the "Baseline" T2 Image as a serialized array
  * @param mask_ptr the Mask Image (optional, set this to 0) as a serialized array
  * @param directions_ptr the directions matrix
  * @param jsonstring { "bvalue": 1000, "numbaseline:" 1 }
  * @param debug if > 0 print debug messages
  * @returns a pointer to the tensor image */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'computeDTITensorFitWASM', 'bisImage', [ 'bisImage', 'bisImage',  'bisImage_opt' ,'Matrix', 'ParamObj', 'debug']}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var computeDTITensorFitWASM = function(image1,image2,image3,matrix4,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');
    let image2_ptr=wrapperutil.serializeObject(Module,image2,'bisImage');
    let image3_ptr=0;
    if (image3!==0) 
      image3_ptr=wrapperutil.serializeObject(Module,image3,'bisImage');
    let matrix4_ptr=wrapperutil.serializeObject(Module,matrix4,'Matrix');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:computeDTITensorFitWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('computeDTITensorFitWASM','number',
       ['number', 'number', 'number', 'number', 'string', 'number'],
       [ image1_ptr, image2_ptr, image3_ptr, matrix4_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);
    if (image2_ptr !== image2)
      wasmutil.release_memory(Module,image2_ptr);
    if (image3_ptr !==0  && image3_ptr !== image3)
      wasmutil.release_memory(Module,image3_ptr);
    if (matrix4_ptr !== matrix4)
      wasmutil.release_memory(Module,matrix4_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Compute DTI Tensor EigenSystem
  * @param input_ptr the image tensor as a serialized array
  * @param mask_ptr the Mask Image (optional, set this to 0) as a serialized array
  * @param debug if > 0 print debug messages
  * @returns a pointer to the eigensystem image */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'computeTensorEigenSystemWASM', 'bisImage', [ 'bisImage', 'bisImage_opt' , 'debug']}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var computeTensorEigenSystemWASM = function(image1,image2,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');
    let image2_ptr=0;
    if (image2!==0) 
      image2_ptr=wrapperutil.serializeObject(Module,image2,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:computeTensorEigenSystemWASM\n++++');
    const wasm_output=Module.ccall('computeTensorEigenSystemWASM','number',
       ['number', 'number', 'number'],
       [ image1_ptr, image2_ptr, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);
    if (image2_ptr !==0  && image2_ptr !== image2)
      wasmutil.release_memory(Module,image2_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Compute DTI Tensor Invariants
  * @param input_ptr the image tensor eigensystem as a serialized array
  * @param mask_ptr the Mask Image (optional, set this to 0) as a serialized array
  * @param jsonstring { "mode": 0 } // mode 0=FA, 1=RA etc. -- see bisDTIAlgorithms::computeTensorInvariants
  * @param debug if > 0 print debug messages
  * @returns a pointer to the invarient image */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'computeDTITensorInvariantsWASM', 'bisImage', [ 'bisImage', 'bisImage_opt' , 'ParamObj', 'debug']}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var computeDTITensorInvariantsWASM = function(image1,image2,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');
    let image2_ptr=0;
    if (image2!==0) 
      image2_ptr=wrapperutil.serializeObject(Module,image2,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:computeDTITensorInvariantsWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('computeDTITensorInvariantsWASM','number',
       ['number', 'number', 'string', 'number'],
       [ image1_ptr, image2_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);
    if (image2_ptr !==0  && image2_ptr !== image2)
      wasmutil.release_memory(Module,image2_ptr);

    // Return
    return output;
  };

  //--------------------------------------------------------------
  // C++:
  /** Compute DTI Orientation Map
  * @param input_ptr the image tensor eigensystem as a serialized array
  * @param mask_ptr the Mask Image (optional, set this to 0) as a serialized array
  * @param magnitude_ptr the Magnitude Image (e.g. FA map) (optional, set this to 0) as a serialized array
  * @param jsonstring { "scaling": 1.0 } Optional extra scaling
  * @param debug if > 0 print debug messages
  * @returns a pointer to the colormap image */
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // JS: {'computeDTIColorMapImageWASM', 'bisImage', [ 'bisImage', 'bisImage_opt' ,'bisImage_opt', 'ParamObj', 'debug']}
  //      returns a bisImage
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
  var computeDTIColorMapImageWASM = function(image1,image2,image3,paramobj,debug) { 

    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;
    const jsonstring=JSON.stringify(paramobj || { } );

    // Serialize objects
    let image1_ptr=wrapperutil.serializeObject(Module,image1,'bisImage');
    let image2_ptr=0;
    if (image2!==0) 
      image2_ptr=wrapperutil.serializeObject(Module,image2,'bisImage');
    let image3_ptr=0;
    if (image3!==0) 
      image3_ptr=wrapperutil.serializeObject(Module,image3,'bisImage');

    // Call WASM
    if (debug || debug==='true') console.log('++++\n++++ Calling WASM Function:computeDTIColorMapImageWASM with '+jsonstring+'\n++++');
    const wasm_output=Module.ccall('computeDTIColorMapImageWASM','number',
       ['number', 'number', 'number', 'string', 'number'],
       [ image1_ptr, image2_ptr, image3_ptr, jsonstring, debug]);

    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',image1);
    

    // Cleanup
    if (image1_ptr !== image1)
      wasmutil.release_memory(Module,image1_ptr);
    if (image2_ptr !==0  && image2_ptr !== image2)
      wasmutil.release_memory(Module,image2_ptr);
    if (image3_ptr !==0  && image3_ptr !== image3)
      wasmutil.release_memory(Module,image3_ptr);

    // Return
    return output;
  };

  //-------------------------------------------------------------

  const outputobj = { 
    initialize : initialize,
    reinitialize : reinitialize,
    get_module : get_module,
    get_date   : get_date,
    parseMatlabV6WASM : parseMatlabV6WASM,
    parseMatrixTextFileWASM : parseMatrixTextFileWASM,
    createMatrixTextFileWASM : createMatrixTextFileWASM,
    parseComboTransformTextFileWASM : parseComboTransformTextFileWASM,
    createComboTransformationTextFileWASM : createComboTransformationTextFileWASM,
    niftiMat44ToQuaternionWASM : niftiMat44ToQuaternionWASM,
    extractImageFrameWASM : extractImageFrameWASM,
    extractImageSliceWASM : extractImageSliceWASM,
    normalizeImageWASM : normalizeImageWASM,
    thresholdImageWASM : thresholdImageWASM,
    shiftScaleImageWASM : shiftScaleImageWASM,
    clusterThresholdImageWASM : clusterThresholdImageWASM,
    gaussianSmoothImageWASM : gaussianSmoothImageWASM,
    gradientImageWASM : gradientImageWASM,
    resliceImageWASM : resliceImageWASM,
    cropImageWASM : cropImageWASM,
    flipImageWASM : flipImageWASM,
    blankImageWASM : blankImageWASM,
    resampleImageWASM : resampleImageWASM,
    prepareImageForRegistrationWASM : prepareImageForRegistrationWASM,
    computeDisplacementFieldWASM : computeDisplacementFieldWASM,
    sliceBiasFieldCorrectImageWASM : sliceBiasFieldCorrectImageWASM,
    morphologyOperationWASM : morphologyOperationWASM,
    seedConnectivityWASM : seedConnectivityWASM,
    computeGLMWASM : computeGLMWASM,
    computeROIWASM : computeROIWASM,
    butterworthFilterWASM : butterworthFilterWASM,
    butterworthFilterImageWASM : butterworthFilterImageWASM,
    computeCorrelationMatrixWASM : computeCorrelationMatrixWASM,
    weightedRegressOutWASM : weightedRegressOutWASM,
    weightedRegressGlobalSignalWASM : weightedRegressGlobalSignalWASM,
    addGridToImageWASM : addGridToImageWASM,
    projectImageWASM : projectImageWASM,
    backProjectImageWASM : backProjectImageWASM,
    test_wasm : test_wasm,
    redirect_stdout : redirect_stdout,
    test_matrix4x4 : test_matrix4x4,
    test_create_4x4matrix : test_create_4x4matrix,
    test_eigenUtils : test_eigenUtils,
    test_matlabParse : test_matlabParse,
    test_bendingEnergy : test_bendingEnergy,
    test_PTZConversions : test_PTZConversions,
    test_eigenUtilOperations : test_eigenUtilOperations,
    test_mirrorComboTransformTextFileWASM : test_mirrorComboTransformTextFileWASM,
    test_compute_histo_metric : test_compute_histo_metric,
    uses_gpl : uses_gpl,
    runLinearRegistrationWASM : runLinearRegistrationWASM,
    runNonLinearRegistrationWASM : runNonLinearRegistrationWASM,
    approximateDisplacementFieldWASM : approximateDisplacementFieldWASM,
    approximateDisplacementFieldWASM2 : approximateDisplacementFieldWASM2,
    segmentImageWASM : segmentImageWASM,
    regularizeObjectmapWASM : regularizeObjectmapWASM,
    test_optimizer : test_optimizer,
    computeDTITensorFitWASM : computeDTITensorFitWASM,
    computeTensorEigenSystemWASM : computeTensorEigenSystemWASM,
    computeDTITensorInvariantsWASM : computeDTITensorInvariantsWASM,
    computeDTIColorMapImageWASM : computeDTIColorMapImageWASM
  };

module.exports=outputobj;
// One day ES6
//export default outputobject;
