let tf=null;

module.exports = function() {

    if (tf) {
        console.log('++++ TF already loaded');
        return tf;
    }

    console.log('++++ Loading TF');
    try {
        tf=require("@tensorflow/tfjs");
        require('@tensorflow/tfjs-node');
    } catch(e) {
        console.log('Failed to load tensorflow',e);
    }
    return tf;
};
