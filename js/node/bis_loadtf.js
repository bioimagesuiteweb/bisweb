// This module tries to load tfs-node-gpu and it if fails tfs-node

const tf=require('@tensorflow/tfjs');

module.exports=function(trygpu) {

    if (trygpu) {
	try {
	    let a=require('@tensorflow/tfjs-node-gpu');
	    console.log('**** Using tfjs-node-gpu',a);
	    return tf;
	} catch(e) {
	    console.log('**** Failed to get tfjs-node-gpu, trying CPU version');
	}
    }
    
    try {
	let a=require('@tensorflow/tfjs-node');
	console.log('**** Using tfjs-node',a);

	return tf;
    } catch(e) {
	console.log('**** Failed to get tfjs-node. Exiting.');
	process.exit(1);
    }
    return null;
};
