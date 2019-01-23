(function () {
    
    var bis_create_wasm_module=function(callback,wasmname,binary,mode) {

    mode = mode || 'node.js'
	binary = binary || false;
	var Module = { };

    Module['wasmMemory'] = new WebAssembly.Memory({ 'initial': 256});
        
    Module['onRuntimeInitialized'] = function() {
	    const usingWasm =  Module["usingWasm"] || false;
/*	    if (binary===false)
		    console.log('==== \tModule loaded, ',mode,' usingWasm='+usingWasm.toString()+' wasmname='+wasmname);
	    else
		    console.log('==== \tModule ready,',mode,' usingWasm='+usingWasm.toString()+' preloaded from '+wasmname);*/
	    callback(Module);
	};

	
	Module['wasmBinaryFile'] = wasmname || undefined;

	if (binary!==false) {
	    Module['wasmBinary']=binary;
	}
