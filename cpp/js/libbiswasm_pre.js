
(function () {
    
    var bis_create_wasm_module=function(callback,wasmname,binary,mode) {

        mode = mode || 'node.js'
	binary = binary || false;
	var Module = { };

        // Memory can be allocated here if we prefer
        let psize = 64*1024;
        let tm = 16*1024*1024;
        let fm = 2048*1024*1024;
        Module['wasmMemory'] = new WebAssembly.Memory({ 'initial': tm / psize, 'maximum': fm / psize });
        
	Module['onRuntimeInitialized'] = function() {
	    const usingWasm =  Module["usingWasm"] || false;
	    if (binary===false)
		console.log('==== \tModule loaded, ',mode,' usingWasm='+usingWasm.toString()+' wasmname='+wasmname);
	    else
		console.log('==== \tModule ready,',mode,' usingWasm='+usingWasm.toString()+' preloaded from '+wasmname);
//            console.log('Memory size=',Module['wasmMemory'].buffer.byteLength/(1024*1024),' MB');
	    callback(Module);
	};

	
	Module['wasmBinaryFile'] = wasmname || undefined;

	if (binary!==false) {
	    Module['wasmBinary']=binary;
	}

    
