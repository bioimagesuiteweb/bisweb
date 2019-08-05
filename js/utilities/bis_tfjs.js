let tf=null;

module.exports = function() {

    if (tf) {
        console.log('++++ TF already loaded');
        return tf;
    }

    console.log('++++ Loading TF');
    try {
        try {
            console.log('++++ Trying to Load tfjs-node-gpu');
            tf=require('@tensorflow/tfjs-node-gpu');
        } catch(e) {
            console.log('Failed to load gpu version '+e);
            tf=require('@tensorflow/tfjs-node');
        }
    } catch(e) {
        console.log('Failed to load tensorflow',e);
    }
    return tf;
};
