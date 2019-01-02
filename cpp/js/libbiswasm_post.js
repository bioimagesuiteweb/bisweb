        Module["ccall"]=ccall;
        return Module;
    };

   var web_load=function(callback,wasmname,binary) {

       binary=binary || false;
       if (binary!==false)
 	       return bis_create_wasm_module(callback,wasmname,binary,'Browser');
       return bis_create_wasm_module(callback,'./libbiswasm.wasm',binary,'Browser');
    };

    var worker_load=function(callback,wasmname,binary) {
       binary=binary || false;
       if (binary!==false)
 	       return bis_create_wasm_module(callback,wasmname,binary,'WebWorker');
       return bis_create_wasm_module(callback,'./libbiswasm.wasm',binary,'WebWorker');
    };

   if (typeof ( WorkerGlobalScope ) !== "undefined") {
        module.exports=worker_load;
   } else if (typeof(window) !== "undefined" ) { 
	    module.exports = web_load;
   } else {
    	module.exports = bis_create_wasm_module;
   }
})();


