// This module tries to load tfs-node-gpu and it if fails tfs-node

const tf=require('@tensorflow/tfjs');

module.exports=function(trygpu) {

    if (trygpu) {
	try {
	    require('@tensorflow/tfjs-node-gpu');
	    console.log('**** Using tfjs-node-gpu');
	    return tf;
	} catch(e) {
	    console.log('**** Failed to get tfjs-node-gpu, trying CPU version');
	}
    }
    
    try {
	require('@tensorflow/tfjs-node');
	console.log('**** Using tfjs-node');

	return tf;
    } catch(e) {
	console.log('**** Failed to get tfjs-node. Exiting.');
	process.exit(1);
    }
    return null;
};
